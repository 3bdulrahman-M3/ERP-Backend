const { CheckInOut, Student, User, College } = require('../models');
const { Op } = require('sequelize');
const notificationService = require('./notificationService');

// Parse QR code data and get student ID
const parseQRCode = async (qrData) => {
  try {
    const data = JSON.parse(qrData);
    if (data.id && data.type === 'student') {
      // QR code now contains student.id directly
      const student = await Student.findByPk(data.id);
      if (student) {
        return student.id;
      }
      // Fallback: try to find by userId (for backward compatibility with old QR codes)
      const studentByUserId = await Student.findOne({
        where: { userId: data.id }
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
  const student = await Student.findByPk(studentId, {
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
      { model: College, as: 'college', attributes: ['id', 'name'] }
    ]
  });

  if (!student) {
    throw new Error('Student not found');
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Check if student already checked in today
  const existingCheckIn = await CheckInOut.findOne({
    where: {
      studentId,
      date: today,
      status: 'checked_in'
    }
  });

  if (existingCheckIn) {
    throw new Error('Student already checked in today');
  }

  // Create check-in record
  const checkIn = await CheckInOut.create({
    studentId,
    checkInTime: new Date(),
    date: today,
    status: 'checked_in',
    notes: notes || null
  });

  await checkIn.reload({
    include: [
      {
        model: Student,
        as: 'student',
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
          { model: College, as: 'college', attributes: ['id', 'name'] }
        ]
      }
    ]
  });

  // Send notification to student
  try {
    if (student.user) {
      await notificationService.createNotification(
        student.user.id,
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

  return checkIn.toJSON();
};

// Check out student
const checkOutStudent = async (studentId, notes = null) => {
  const student = await Student.findByPk(studentId, {
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
    ]
  });

  if (!student) {
    throw new Error('Student not found');
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Find today's check-in
  const checkIn = await CheckInOut.findOne({
    where: {
      studentId,
      date: today,
      status: 'checked_in'
    }
  });

  if (!checkIn) {
    throw new Error('Student has not checked in today');
  }

  // Update check-out
  checkIn.checkOutTime = new Date();
  checkIn.status = 'checked_out';
  if (notes) {
    checkIn.notes = notes;
  }
  await checkIn.save();

  await checkIn.reload({
    include: [
      {
        model: Student,
        as: 'student',
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
          { model: College, as: 'college', attributes: ['id', 'name'] }
        ]
      }
    ]
  });

  // Send notification to student
  try {
    if (student.user) {
      await notificationService.createNotification(
        student.user.id,
        'check_out',
        'Checked Out',
        `You have successfully checked out at ${new Date().toLocaleString('en-US')}`,
        checkIn.id,
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
      `Student ${student.user?.name || student.name} has checked out`,
      studentId,
      'student'
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  return checkIn.toJSON();
};

// Check in/out by QR code
const checkInOutByQRCode = async (qrData, notes = null) => {
  const studentId = await parseQRCode(qrData);
  
  if (!studentId) {
    throw new Error('Invalid QR code or student not found');
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Check if student has checked in today
  const existingCheckIn = await CheckInOut.findOne({
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
  const offset = (page - 1) * limit;
  const whereClause = {};

  if (filters.date) {
    whereClause.date = filters.date;
  }

  if (filters.status) {
    whereClause.status = filters.status;
  }

  if (filters.studentId) {
    whereClause.studentId = filters.studentId;
  }

  if (filters.startDate && filters.endDate) {
    whereClause.date = {
      [Op.between]: [filters.startDate, filters.endDate]
    };
  }

  const { count, rows } = await CheckInOut.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Student,
        as: 'student',
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
          { model: College, as: 'college', attributes: ['id', 'name'] }
        ]
      }
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  return {
    records: rows.map(record => record.toJSON()),
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
  
  const checkIns = await CheckInOut.findAll({
    where: {
      date: today
    },
    include: [
      {
        model: Student,
        as: 'student',
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
          { model: College, as: 'college', attributes: ['id', 'name'] }
        ]
      }
    ],
    order: [['checkInTime', 'DESC']]
  });

  return checkIns.map(record => record.toJSON());
};

// Get student check-in/out history
const getStudentHistory = async (studentId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const { count, rows } = await CheckInOut.findAndCountAll({
    where: { studentId },
    include: [
      {
        model: Student,
        as: 'student',
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
          { model: College, as: 'college', attributes: ['id', 'name'] }
        ]
      }
    ],
    order: [['date', 'DESC'], ['checkInTime', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  return {
    records: rows.map(record => record.toJSON()),
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
  const today = new Date().toISOString().split('T')[0];
  
  const checkIn = await CheckInOut.findOne({
    where: {
      studentId,
      date: today,
      status: 'checked_in'
    },
    order: [['checkInTime', 'DESC']]
  });

  return {
    isCheckedIn: checkIn !== null,
    checkInTime: checkIn ? checkIn.checkInTime : null,
    checkOutTime: checkIn ? checkIn.checkOutTime : null,
    status: checkIn ? checkIn.status : null
  };
};

// Search students by name (for autocomplete)
const searchStudents = async (searchTerm, limit = 5) => {
  const students = await Student.findAll({
    where: {
      name: {
        [Op.iLike]: `%${searchTerm}%`
      }
    },
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
      { model: College, as: 'college', attributes: ['id', 'name'] }
    ],
    limit: parseInt(limit),
    order: [['name', 'ASC']]
  });

  return students.map(student => student.toJSON());
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

