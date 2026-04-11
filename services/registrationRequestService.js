const prisma = require('../config/prisma');
const studentService = require('./studentService');
const bcrypt = require('bcryptjs');

// Create registration request
const createRequest = async (requestData) => {
  const { name, email, password, phoneNumber, college, year, age, message } = requestData;

  // Check if email already exists in users
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('Email is already in use');
  }

  // Check if email already exists in pending requests
  const existingRequest = await prisma.registrationRequest.findUnique({ where: { email } });
  if (existingRequest) {
    throw new Error('There is a pending registration request with this email');
  }

  // Hash password manually before storing in request
  const hashedPassword = await bcrypt.hash(password, 10);

  return await prisma.registrationRequest.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phoneNumber: phoneNumber || null,
      college: college || null,
      year: year || null,
      age: age ? parseInt(age) : null,
      message: message || null,
      status: 'pending'
    }
  });
};

// Get all requests
const getAllRequests = async (status = null) => {
  const where = {};
  if (status) {
    where.status = status;
  }

  return await prisma.registrationRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });
};

// Approve request
const approveRequest = async (requestId) => {
  const id = parseInt(requestId);
  const request = await prisma.registrationRequest.findUnique({ where: { id } });
  
  if (!request) {
    throw new Error('Registration request not found');
  }

  if (request.status !== 'pending') {
    throw new Error('This request has already been processed');
  }

  // Check if email still available
  const existingUser = await prisma.user.findUnique({ where: { email: request.email } });
  if (existingUser) {
    throw new Error('Email is already in use');
  }

  // Complete operation in a transaction
  return await prisma.$transaction(async (tx) => {
    // 1. Create User
    const user = await tx.user.create({
      data: {
        name: request.name,
        email: request.email,
        password: request.password, // This was already hashed in createRequest
        role: 'student',
        isActive: true
      }
    });

    // 2. Create Student
    let student = await tx.student.create({
      data: {
        name: request.name,
        email: request.email,
        collegeId: null,
        year: request.year || null,
        age: request.age,
        phoneNumber: request.phoneNumber,
        userId: user.id
      }
    });

    // 3. Generate QR Code
    const qrCode = await studentService.generateQRCode(student.id, request.name, request.email);
    student = await tx.student.update({
      where: { id: student.id },
      data: { qrCode }
    });

    // 4. Update request status
    const updatedRequest = await tx.registrationRequest.update({
      where: { id },
      data: { status: 'approved' }
    });

    return {
      request: updatedRequest,
      user,
      student
    };
  });
};

// Reject request
const rejectRequest = async (requestId) => {
  const id = parseInt(requestId);
  const request = await prisma.registrationRequest.findUnique({ where: { id } });
  
  if (!request) {
    throw new Error('Registration request not found');
  }

  if (request.status !== 'pending') {
    throw new Error('This request has already been processed');
  }

  return await prisma.registrationRequest.update({
    where: { id },
    data: { status: 'rejected' }
  });
};

module.exports = {
  createRequest,
  getAllRequests,
  approveRequest,
  rejectRequest
};
