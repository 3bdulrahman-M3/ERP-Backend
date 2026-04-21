const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const prisma = require('../config/prisma');
const notificationService = require('./notificationService');

// Generate QR Code
const generateQRCode = async (studentId, studentName, studentEmail) => {
  try {
    const qrData = JSON.stringify({
      id: studentId,
      name: studentName,
      email: studentEmail,
      type: 'student'
    });
    const qrCode = await QRCode.toDataURL(qrData);
    return qrCode;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

// Create student and user
const createStudent = async (studentData) => {
  const { name, email, password, collegeId, year, age, phoneNumber, profileImage, governorate, address, guardianPhone, idCardImage } = studentData;

  // Check if email already exists
  const existingStudent = await prisma.student.findUnique({ where: { email } });
  if (existingStudent) {
    throw new Error('Student with this email already exists');
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password manually before creating user
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user and student in a transaction to ensure integrity
  const result = await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'student',
        isActive: true,
        profileImage: profileImage || null,
      }
    });

    // Create student
    let student = await tx.student.create({
      data: {
        name,
        email,
        collegeId: collegeId ? parseInt(collegeId) : null,
        year: year ? parseInt(year) : null,
        age: parseInt(age),
        phoneNumber,
        profileImage: profileImage || null,
        governorate: governorate || null,
        address: address || null,
        guardianPhone: guardianPhone || null,
        idCardImage: idCardImage || null,
        userId: user.id
      }
    });

    // Generate QR code with student.id
    const qrCode = await generateQRCode(student.id, name, email);
    
    // Update student with QR code
    student = await tx.student.update({
      where: { id: student.id },
      data: { qrCode },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            profileImage: true
          }
        },
        college: true
      }
    });

    return student;
  });

  // Create notification for admins
  try {
    await notificationService.createNotificationForAdmins(
      'student_created',
      'New Student',
      `A new student has been added: ${name}`,
      result.id,
      'student'
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  return result;
};

// Get all students
const getAllStudents = async (page = 1, limit = 10, excludeAssigned = false) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {};
  
  // If excludeAssigned is true, exclude students who have active room assignments
  if (excludeAssigned) {
    where.roomStudents = {
      none: {
        isActive: true
      }
    };
  }

  const [students, count] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true
          }
        },
        college: {
          select: {
            id: true,
            name: true
          }
        }
      },
      skip,
      take,
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.student.count({ where })
  ]);

  return {
    students,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  };
};

// Get student by ID
const getStudentById = async (id) => {
  const studentId = parseInt(id);
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          profileImage: true
        }
      },
      college: {
        select: {
          id: true,
          name: true
        }
      },
      roomStudents: {
        where: { isActive: true },
        include: {
          room: {
            select: {
              id: true,
              roomNumber: true,
              building: true,
              buildingId: true,
              buildingInfo: {
                select: {
                  id: true,
                  name: true,
                  address: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!student) {
    throw new Error('Student not found');
  }

  // Flatten the response to match frontend expectations if needed
  // Sequelize used "roomAssignments" as alias, Prisma uses "roomStudents" (model name)
  // Let's add roomAssignments for compatibility
  student.roomAssignments = student.roomStudents;

  return student;
};

// Update student
const updateStudent = async (id, studentData) => {
  const studentId = parseInt(id);
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: true }
  });

  if (!student) {
    throw new Error('Student not found');
  }

  const { name, email, password, collegeId, year, age, phoneNumber, profileImage, governorate, address, guardianPhone, idCardImage } = studentData;

  // Check if email is being changed and if it's already taken
  if (email && email !== student.email) {
    const existingStudent = await prisma.student.findUnique({ where: { email } });
    if (existingStudent) {
      throw new Error('Email already exists');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('Email already exists in users');
    }
  }

  // Prepare data for update
  const studentUpdateData = {};
  if (name) studentUpdateData.name = name;
  if (email) studentUpdateData.email = email;
  if (collegeId !== undefined) studentUpdateData.collegeId = collegeId ? parseInt(collegeId) : null;
  if (year !== undefined) studentUpdateData.year = year ? parseInt(year) : null;
  if (age) studentUpdateData.age = parseInt(age);
  if (phoneNumber) studentUpdateData.phoneNumber = phoneNumber;
  if (profileImage !== undefined) studentUpdateData.profileImage = profileImage;
  if (governorate !== undefined) studentUpdateData.governorate = governorate;
  if (address !== undefined) studentUpdateData.address = address;
  if (guardianPhone !== undefined) studentUpdateData.guardianPhone = guardianPhone;
  if (idCardImage !== undefined) studentUpdateData.idCardImage = idCardImage;

  // Regenerate QR code if student data changed
  if (name || email) {
    const qrCode = await generateQRCode(student.id, name || student.name, email || student.email);
    studentUpdateData.qrCode = qrCode;
  }

  // Update in a transaction
  const updatedStudent = await prisma.$transaction(async (tx) => {
    // Update User if student has one and fields changed
    if (student.userId) {
      const userUpdateData = {};
      if (name) userUpdateData.name = name;
      if (email) userUpdateData.email = email;
      if (profileImage !== undefined) userUpdateData.profileImage = profileImage;
      if (password) {
        userUpdateData.password = await bcrypt.hash(password, 10);
      }

      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: student.userId },
          data: userUpdateData
        });
      }
    }

    // Update Student
    return await tx.student.update({
      where: { id: studentId },
      data: studentUpdateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            profileImage: true
          }
        },
        college: true
      }
    });
  });

  return updatedStudent;
};

// Delete student
const deleteStudent = async (id) => {
  const studentId = parseInt(id);
  const student = await prisma.student.findUnique({
    where: { id: studentId }
  });

  if (!student) {
    throw new Error('Student not found');
  }

  const userId = student.userId;

  await prisma.$transaction(async (tx) => {
    // 1. Delete notifications for the user
    if (userId) {
      await tx.notification.deleteMany({
        where: { userId: userId }
      });
    }

    // 2. Delete messages tied to the student's conversation
    const conversation = await tx.conversation.findUnique({
      where: { studentId: studentId }
    });
    
    if (conversation) {
      await tx.message.deleteMany({
        where: { conversationId: conversation.id }
      });
      // 3. Delete the conversation
      await tx.conversation.delete({
        where: { id: conversation.id }
      });
    }

    // 4. Delete reviews by the student
    await tx.review.deleteMany({
      where: { studentId: studentId }
    });

    // 5. Delete room requests by the student
    await tx.roomRequest.deleteMany({
      where: { studentId: studentId }
    });

    // 6. Delete check-in/out records
    await tx.checkInOut.deleteMany({
      where: { studentId: studentId }
    });

    // 7. Delete payments tied to the student
    // Note: We delete payments first because they depend on roomStudent
    await tx.payment.deleteMany({
      where: { studentId: studentId }
    });

    // 8. Delete room assignments
    await tx.roomStudent.deleteMany({
      where: { studentId: studentId }
    });

    // 9. Deleting the user will cascade to the student profile
    // Using deleteMany to avoid "Record not found" error if the record was already deleted
    if (userId) {
      await tx.user.deleteMany({
        where: { id: userId }
      });
    } else {
      await tx.student.deleteMany({
        where: { id: studentId }
      });
    }
  });

  return { message: 'Student deleted successfully' };
};

// Get student by email
const getStudentByEmail = async (email) => {
  const student = await prisma.student.findUnique({
    where: { email },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true
        }
      },
      college: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  return student;
};

// Get students by college and/or year
const getStudentsByCollegeAndYear = async (collegeId, year, page = 1, limit = 10) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);
  const where = {};

  if (collegeId) {
    where.collegeId = parseInt(collegeId);
  }

  if (year) {
    where.year = parseInt(year);
  }

  const [students, count] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true
          }
        },
        college: {
          select: {
            id: true,
            name: true
          }
        }
      },
      skip,
      take,
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.student.count({ where })
  ]);

  return {
    students,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  };
};

// Complete student profile
const completeStudentProfile = async (userId, studentData) => {
  const uId = parseInt(userId);
  const { collegeId, year, age, phoneNumber } = studentData;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: uId }
  });
  
  if (!user) {
    throw new Error('User not found');
  }

  if (user.role !== 'student') {
    throw new Error('This user is not a student');
  }

  // Check if student already exists
  const existingStudent = await prisma.student.findUnique({ 
    where: { userId: uId } 
  });
  
  if (existingStudent) {
    throw new Error('Student profile already exists');
  }

  const result = await prisma.$transaction(async (tx) => {
    // Create student
    let student = await tx.student.create({
      data: {
        name: user.name,
        email: user.email,
        collegeId: collegeId ? parseInt(collegeId) : null,
        year: year ? parseInt(year) : null,
        age: age ? parseInt(age) : null,
        phoneNumber: phoneNumber || null,
        userId: user.id
      }
    });

    // Generate QR code
    const qrCode = await generateQRCode(student.id, user.name, user.email);
    
    // Update with QR code
    student = await tx.student.update({
      where: { id: student.id },
      data: { qrCode },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            profileImage: true
          }
        },
        college: true
      }
    });
    
    return student;
  });

  // Create notification for admins
  try {
    await notificationService.createNotificationForAdmins(
      'student_created',
      'New Student',
      `New student added: ${user.name}`,
      result.id,
      'student'
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  return result;
};

module.exports = {
  generateQRCode,
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentByEmail,
  getStudentsByCollegeAndYear,
  completeStudentProfile
};
