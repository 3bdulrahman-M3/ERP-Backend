const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const { Sequelize } = require('sequelize');
const { Student, User, RoomStudent, College } = require('../models');

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
  const existingStudent = await Student.findOne({ where: { email } });
  if (existingStudent) {
    throw new Error('Student with this email already exists');
  }

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Create user first (password will be hashed automatically by User model hook)
  const user = await User.create({
    name,
    email,
    password: password, // User model will hash it automatically
    role: 'student',
    isActive: true
  });

  // Generate QR code
  const qrCode = await generateQRCode(user.id, name, email);

  // Create student
  const student = await Student.create({
    name,
    email,
    collegeId: collegeId || null,
    year: year || null,
    age,
    phoneNumber,
    profileImage: profileImage || null,
    governorate: governorate || null,
    address: address || null,
    guardianPhone: guardianPhone || null,
    idCardImage: idCardImage || null,
    qrCode,
    userId: user.id
  });

  // Reload with user and college relations
  await student.reload({ 
    include: [
      { model: User, as: 'user' },
      { model: College, as: 'college' }
    ] 
  });

  // Remove password from user in response
  const studentResponse = student.toJSON();
  if (studentResponse.user) {
    delete studentResponse.user.password;
  }

  return studentResponse;
};

// Get all students
const getAllStudents = async (page = 1, limit = 10, excludeAssigned = false) => {
  const offset = (page - 1) * limit;

  const whereClause = {};
  
  // If excludeAssigned is true, exclude students who have active room assignments
  if (excludeAssigned) {
    whereClause.id = {
      [Sequelize.Op.notIn]: Sequelize.literal(`(
        SELECT DISTINCT "studentId" 
        FROM "room_students" 
        WHERE "isActive" = true
      )`)
    };
  }

  const { count, rows } = await Student.findAndCountAll({
    where: whereClause,
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role', 'isActive'] },
      { model: College, as: 'college', attributes: ['id', 'name'] }
    ],
    attributes: { exclude: ['password'] },
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['createdAt', 'DESC']]
  });

  return {
    students: rows,
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
  const student = await Student.findByPk(id, {
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role', 'isActive'] },
      { model: College, as: 'college', attributes: ['id', 'name'] },
      { 
        model: RoomStudent, 
        as: 'roomAssignments',
        where: { isActive: true },
        required: false,
        include: [{ model: require('../models').Room, as: 'room', attributes: ['id', 'roomNumber', 'building'] }]
      }
    ],
    attributes: { exclude: ['password'] }
  });

  if (!student) {
    throw new Error('Student not found');
  }

  return student;
};

// Update student
const updateStudent = async (id, studentData) => {
  const student = await Student.findByPk(id, {
    include: [{ model: User, as: 'user' }]
  });

  if (!student) {
    throw new Error('Student not found');
  }

  const { name, email, password, collegeId, year, age, phoneNumber, profileImage, governorate, address, guardianPhone, idCardImage } = studentData;

  // Check if email is being changed and if it's already taken
  if (email && email !== student.email) {
    const existingStudent = await Student.findOne({ where: { email } });
    if (existingStudent) {
      throw new Error('Email already exists');
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('Email already exists in users');
    }
  }

  // Update student
  if (name) student.name = name;
  if (email) student.email = email;
  if (collegeId !== undefined) student.collegeId = collegeId;
  if (year !== undefined) student.year = year;
  if (age) student.age = age;
  if (phoneNumber) student.phoneNumber = phoneNumber;
  if (profileImage !== undefined) student.profileImage = profileImage;
  if (governorate !== undefined) student.governorate = governorate;
  if (address !== undefined) student.address = address;
  if (guardianPhone !== undefined) student.guardianPhone = guardianPhone;
  if (idCardImage !== undefined) student.idCardImage = idCardImage;

  // Update password in user if provided (User model hook will hash it)
  if (password && student.user) {
    student.user.password = password; // User model beforeUpdate hook will hash it automatically
  }

  // Regenerate QR code if student data changed
  if (name || email) {
    const qrCode = await generateQRCode(student.userId, student.name, student.email);
    student.qrCode = qrCode;
  }

  await student.save();

  // Update user if needed
  if (student.user) {
    if (name) student.user.name = name;
    if (email) student.user.email = email;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      student.user.password = hashedPassword;
    }
    await student.user.save();
  }

  await student.reload({ 
    include: [
      { model: User, as: 'user' },
      { model: College, as: 'college' }
    ] 
  });

  const studentResponse = student.toJSON();
  delete studentResponse.password;
  if (studentResponse.user) {
    delete studentResponse.user.password;
  }

  return studentResponse;
};

// Delete student
const deleteStudent = async (id) => {
  const student = await Student.findByPk(id, {
    include: [{ model: User, as: 'user' }]
  });

  if (!student) {
    throw new Error('Student not found');
  }

  const userId = student.userId;

  // Delete student first
  await student.destroy();

  // Delete user if it exists
  // We need to explicitly delete User because onDelete: 'CASCADE' only works when deleting User (which deletes Student)
  // But when deleting Student, we need to manually delete the associated User
  if (userId) {
    const user = await User.findByPk(userId);
    if (user) {
      await user.destroy();
    }
  }

  return { message: 'Student deleted successfully' };
};

// Get student by email
const getStudentByEmail = async (email) => {
  const student = await Student.findOne({
    where: { email },
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role', 'isActive'] },
      { model: College, as: 'college', attributes: ['id', 'name'] }
    ],
    attributes: { exclude: ['password'] }
  });

  return student;
};

// Get students by college and/or year
const getStudentsByCollegeAndYear = async (collegeId, year, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const whereClause = {};

  if (collegeId) {
    whereClause.collegeId = collegeId;
  }

  if (year) {
    whereClause.year = year;
  }

  const { count, rows } = await Student.findAndCountAll({
    where: whereClause,
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role', 'isActive'] },
      { model: College, as: 'college', attributes: ['id', 'name'] }
    ],
    attributes: { exclude: ['password'] },
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['createdAt', 'DESC']]
  });

  return {
    students: rows,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  };
};

module.exports = {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentByEmail,
  getStudentsByCollegeAndYear
};

