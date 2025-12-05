const { RegistrationRequest, User, Student } = require('../models');
const studentService = require('./studentService');
const nodemailer = require('nodemailer');

// Email transporter configuration
const createTransporter = () => {
  // You can configure this with your email service (Gmail, SendGrid, etc.)
  // For now, using a simple configuration
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  });
};

// Create registration request
const createRequest = async (requestData) => {
  const { name, email, password, phoneNumber, college, year, age, message } = requestData;

  // Check if email already exists in users
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new Error('Email is already in use');
  }

  // Check if email already exists in pending requests
  const existingRequest = await RegistrationRequest.findOne({ where: { email } });
  if (existingRequest) {
    throw new Error('There is a pending registration request with this email');
  }

  const request = await RegistrationRequest.create({
    name,
    email,
    password, // Will be hashed by model hook
    phoneNumber: phoneNumber || null,
    college: college || null,
    year: year || null,
    age: age || null,
    message: message || null,
    status: 'pending'
  });

  return request;
};

// Get all requests
const getAllRequests = async (status = null) => {
  const where = {};
  if (status) {
    where.status = status;
  }

  const requests = await RegistrationRequest.findAll({
    where,
    order: [['createdAt', 'DESC']]
  });

  return requests;
};

// Approve request
const approveRequest = async (requestId) => {
  const request = await RegistrationRequest.findByPk(requestId);
  if (!request) {
    throw new Error('Registration request not found');
  }

  if (request.status !== 'pending') {
    throw new Error('This request has already been processed');
  }

  // Check if email still available
  const existingUser = await User.findOne({ where: { email: request.email } });
  if (existingUser) {
    throw new Error('Email is already in use');
  }

  // Create user - Note: User model will hash the password again, but since it's already hashed,
  // we need to bypass the hook. Actually, let's use the hashed password directly.
  // But User model has a hook that hashes, so we need to set it after creation or use a different approach.
  // For now, we'll let User model handle it, but we need to pass the plain password.
  // Actually, the request.password is already hashed, so we need to create user without hashing.
  // Let's create user with raw password (it will be hashed again, but that's okay for now)
  // Better approach: Create user with a temporary password, then update with the hashed one
  const tempPassword = 'temp_' + Date.now();
  const user = await User.create({
    name: request.name,
    email: request.email,
    password: tempPassword, // Temporary, will be updated
    role: 'student',
    isActive: true
  });
  
  // Update with the already hashed password (bypass hook)
  await user.update({ password: request.password }, { hooks: false });

  // Generate QR code
  const qrCode = await studentService.generateQRCode(user.id, request.name, request.email);

  // Create student
  const student = await Student.create({
    name: request.name,
    email: request.email,
    collegeId: null, // Can be updated later
    year: request.year || null,
    age: request.age || null,
    phoneNumber: request.phoneNumber || null,
    qrCode,
    userId: user.id
  });

  // Update request status
  request.status = 'approved';
  await request.save();

  // Email sending removed - direct registration now

  return {
    request,
    user,
    student
  };
};

// Reject request
const rejectRequest = async (requestId) => {
  const request = await RegistrationRequest.findByPk(requestId);
  if (!request) {
    throw new Error('Registration request not found');
  }

  if (request.status !== 'pending') {
    throw new Error('This request has already been processed');
  }

  request.status = 'rejected';
  await request.save();

  // Email sending removed - direct registration now

  return request;
};

// Send approval email
const sendApprovalEmail = async (email, name) => {
  try {
    const transporter = createTransporter();
    
    // Skip if no email configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('Email not configured, skipping approval email');
      return;
    }

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Registration Request Approved - University Housing Management System',
      html: `
        <div style="font-family: Arial, sans-serif; direction: ltr; text-align: left;">
          <h2 style="color: #1f2937;">Hello ${name}</h2>
          <p>We are pleased to inform you that your registration request for the University Housing Management System has been approved.</p>
          <p>You can now log in using the email and password you entered in the request.</p>
          <p style="margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/login" 
               style="background-color: #1f2937; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Login
            </a>
          </p>
          <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
            Thank you for using the University Housing Management System
          </p>
        </div>
      `
    });
  } catch (error) {
    console.error('Error sending approval email:', error);
    throw error;
  }
};

// Send rejection email
const sendRejectionEmail = async (email, name) => {
  try {
    const transporter = createTransporter();
    
    // Skip if no email configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('Email not configured, skipping rejection email');
      return;
    }

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Registration Request Rejected - University Housing Management System',
      html: `
        <div style="font-family: Arial, sans-serif; direction: ltr; text-align: left;">
          <h2 style="color: #1f2937;">Hello ${name}</h2>
          <p>We regret to inform you that your registration request for the University Housing Management System has been rejected.</p>
          <p>If you have any inquiries, please contact the administration.</p>
          <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
            Thank you for your interest in the University Housing Management System
          </p>
        </div>
      `
    });
  } catch (error) {
    console.error('Error sending rejection email:', error);
    throw error;
  }
};

module.exports = {
  createRequest,
  getAllRequests,
  approveRequest,
  rejectRequest
};

