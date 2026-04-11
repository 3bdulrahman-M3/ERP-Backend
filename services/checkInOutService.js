const prisma = require('../config/prisma');
const notificationService = require('./notificationService');

// Parse QR code data and get student ID
const parseQRCode = async (qrData) => {
  try {
    const data = JSON.parse(qrData);
    if (data.id && data.type === 'student') {
      // Try to find if it is a direct student ID
      const student = await prisma.student.findUnique({
        where: { id: parseInt(data.id) }
      });
      if (student) {
        return student.id;
      }
      
      // Fallback: try to find by userId
      const studentByUserId = await prisma.student.findUnique({
        where: { userId: parseInt(data.id) }
      });
      if (studentByUserId) {
        return studentByUserId.id;
      }
    }
    return null;
  } catch (error) {
    console.error('Error parsing QR code:', error);
    return null;
  }
};

// Check in student
const checkInStudent = async (studentId, notes = null) => {
  const sId = parseInt(studentId);
  const student = await prisma.student.findUnique({
    where: { id: sId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      college: { select: { id: true, name: true } }
    }
  });

  if (!student) {
    throw new Error('Student not found');
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Check if student already checked in today
  const existingCheckIn = await prisma.checkInOut.findFirst({
    where: {
      studentId: sId,
      date: today,
      status: 'checked_in'
    }
  });

  if (existingCheckIn) {
    throw new Error('Student already checked in today');
  }

  // Create check-in record
  const checkIn = await prisma.checkInOut.create({
    data: {
      studentId: sId,
      checkInTime: new Date(),
      date: today,
      status: 'checked_in',
      notes: notes || null
    },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          college: { select: { id: true, name: true } }
        }
      }
    }
  });

  // Send notification to student
  try {
    if (student.userId) {
      await notificationService.createNotification(
        student.userId,
        'check_in',
        'Checked In',
        `You have successfully checked in at ${new Date().toLocaleString('en-US')}`,
        checkIn.id,
        'check_in_out'
      );
    }
  } catch (error) {
    console.error('Error creating check-in notification for student:', error);
  }

  // Send notification to admins
  try {
    await notificationService.createNotificationForAdmins(
      'student_check_in',
      'Student Check-in',
      `Student ${student.name} (${student.email}) has checked in`,
      checkIn.id,
      'check_in_out'
    );
  } catch (error) {
    console.error('Error creating check-in notification for admins:', error);
  }

  return checkIn;
};

// Check out student
const checkOutStudent = async (studentId, notes = null) => {
  const sId = parseInt(studentId);
  const student = await prisma.student.findUnique({
    where: { id: sId },
    include: { user: { select: { id: true, name: true, email: true } } }
  });

  if (!student) {
    throw new Error('Student not found');
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Find today's check-in
  const checkIn = await prisma.checkInOut.findFirst({
    where: {
      studentId: sId,
      date: today,
      status: 'checked_in'
    }
  });

  if (!checkIn) {
    throw new Error('Student has not checked in today');
  }

  // Update check-out
  const updatedCheckIn = await prisma.checkInOut.update({
    where: { id: checkIn.id },
    data: {
      checkOutTime: new Date(),
      status: 'checked_out',
      notes: notes || undefined
    },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          college: { select: { id: true, name: true } }
        }
      }
    }
  });

  // Send notification to student
  try {
    if (student.userId) {
      await notificationService.createNotification(
        student.userId,
        'check_out',
        'Checked Out',
        `You have successfully checked out at ${new Date().toLocaleString('en-US')}`,
        updatedCheckIn.id,
        'check_in_out'
      );
    }
  } catch (error) {
    console.error('Error creating check-out notification for student:', error);
  }

  // Create notification for admins
  try {
    await notificationService.createNotificationForAdmins(
      'student_check_out',
      'Student Check-out',
      `Student ${student.name} has checked out`,
      sId,
      'student'
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  return updatedCheckIn;
};

// Check in/out by QR code
const checkInOutByQRCode = async (qrData, notes = null) => {
  const studentId = await parseQRCode(qrData);
  
  if (!studentId) {
    throw new Error('Invalid QR code or student not found');
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Check if student has checked in today
  const existingCheckIn = await prisma.checkInOut.findFirst({
    where: {
      studentId,
      date: today,
      status: 'checked_in'
    }
  });

  if (existingCheckIn) {
    // Check out
    return await checkOutStudent(studentId, notes);
  } else {
    // Check in
    return await checkInStudent(studentId, notes);
  }
};

// Get all check-in/out records
const getAllCheckInOuts = async (page = 1, limit = 10, filters = {}) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);
  const where = {};

  if (filters.date) {
    where.date = filters.date;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.studentId) {
    where.studentId = parseInt(filters.studentId);
  }

  if (filters.startDate && filters.endDate) {
    where.date = {
      gte: filters.startDate,
      lte: filters.endDate
    };
  }

  const [records, count] = await Promise.all([
    prisma.checkInOut.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            college: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    prisma.checkInOut.count({ where })
  ]);

  return {
    records,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  };
};

// Get today's check-ins
const getTodayCheckIns = async () => {
  const today = new Date().toISOString().split('T')[0];
  
  return await prisma.checkInOut.findMany({
    where: { date: today },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          college: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { checkInTime: 'desc' }
  });
};

// Get student check-in/out history
const getStudentHistory = async (studentId, page = 1, limit = 10) => {
  const sId = parseInt(studentId);
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [records, count] = await Promise.all([
    prisma.checkInOut.findMany({
      where: { studentId: sId },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            college: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: [{ date: 'desc' }, { checkInTime: 'desc' }],
      skip,
      take
    }),
    prisma.checkInOut.count({ where: { studentId: sId } })
  ]);

  return {
    records,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  };
};

// Get current student check-in status
const getCurrentStudentStatus = async (studentId) => {
  const sId = parseInt(studentId);
  const today = new Date().toISOString().split('T')[0];
  
  const checkIn = await prisma.checkInOut.findFirst({
    where: {
      studentId: sId,
      date: today,
      status: 'checked_in'
    },
    orderBy: { checkInTime: 'desc' }
  });

  return {
    isCheckedIn: checkIn !== null,
    checkInTime: checkIn ? checkIn.checkInTime : null,
    checkOutTime: checkIn ? checkIn.checkOutTime : null,
    status: checkIn ? checkIn.status : null
  };
};

// Search students by name
const searchStudents = async (searchTerm, limit = 5) => {
  return await prisma.student.findMany({
    where: {
      name: {
        contains: searchTerm,
        mode: 'insensitive'
      }
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      college: { select: { id: true, name: true } }
    },
    take: parseInt(limit),
    orderBy: { name: 'asc' }
  });
};

module.exports = {
  checkInStudent,
  checkOutStudent,
  checkInOutByQRCode,
  getAllCheckInOuts,
  getTodayCheckIns,
  getStudentHistory,
  getCurrentStudentStatus,
  searchStudents,
  parseQRCode
};
