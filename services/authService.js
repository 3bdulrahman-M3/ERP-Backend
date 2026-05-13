const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

// Generate access token (expires in 1 day)
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// Generate refresh token (expires in 7 days)
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Save refresh token to database
const saveRefreshToken = async (userId, token) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt
    }
  });
};

// Revoke refresh token
const revokeRefreshToken = async (token) => {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { isRevoked: true }
  });
};

// Revoke all refresh tokens for a user
const revokeAllUserTokens = async (userId) => {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true }
  });
};

const login = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    throw new Error('Account is not active');
  }

  // Use a manual check for password since Sequelize hooks are gone
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken();

  // Save refresh token
  await saveRefreshToken(user.id, refreshToken);

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;

  return {
    accessToken,
    refreshToken,
    user: userWithoutPassword
  };
};

const refreshAccessToken = async (refreshToken) => {
  // Find the refresh token in database
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true }
  });

  if (!tokenRecord) {
    throw new Error('Invalid refresh token');
  }

  if (tokenRecord.isRevoked) {
    throw new Error('Refresh token has been revoked');
  }

  if (new Date() > tokenRecord.expiresAt) {
    throw new Error('Refresh token has expired');
  }

  const user = tokenRecord.user;
  
  if (!user || !user.isActive) {
    throw new Error('User not found or inactive');
  }

  // Generate new access token
  const newAccessToken = generateAccessToken(user.id, user.role);

  const { password: _, ...userWithoutPassword } = user;

  return {
    accessToken: newAccessToken,
    user: userWithoutPassword
  };
};

const logout = async (refreshToken) => {
  await revokeRefreshToken(refreshToken);
};

// Update user profile
const updateProfile = async (userId, updateData) => {
  const { name, email, password, profileImage } = updateData;

  const dataToUpdate = {};
  if (name) dataToUpdate.name = name;
  if (profileImage !== undefined) dataToUpdate.profileImage = profileImage;

  if (email) {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.id !== userId) {
      throw new Error('Email already exists');
    }
    
    // Also check if email exists in students table
    const existingStudent = await prisma.student.findUnique({ where: { email } });
    if (existingStudent && existingStudent.userId !== userId) {
      throw new Error('Email already exists');
    }
    
    dataToUpdate.email = email;
  }

  if (password) {
    dataToUpdate.password = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: dataToUpdate
  });

  // If user is a student, sync changes to Student table
  if (user.role === 'student') {
    const student = await prisma.student.findUnique({ where: { userId: user.id } });
    if (student) {
      const studentUpdate = {};
      if (name) studentUpdate.name = name;
      if (email) studentUpdate.email = email;
      if (profileImage !== undefined) studentUpdate.profileImage = profileImage;
      
      // Regenerate QR code if name or email changed
      if (name || email) {
        const QRCode = require('qrcode');
        const qrData = JSON.stringify({
          id: student.id,
          name: studentUpdate.name || student.name,
          email: studentUpdate.email || student.email,
          type: 'student'
        });
        studentUpdate.qrCode = await QRCode.toDataURL(qrData);
      }
      
      if (Object.keys(studentUpdate).length > 0) {
        await prisma.student.update({
          where: { id: student.id },
          data: studentUpdate
        });
      }
    }
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

// Get user profile
const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

// Register new student
const register = async (registerData) => {
  const { name, email, password, phoneNumber, college, year, age } = registerData;

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('Email is already in use');
  }

  // Hash password manually
  const hashedPassword = await bcrypt.hash(password, 10);

  // Use transaction to create both User and Student
  const result = await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'student',
        isActive: true
      }
    });

    // Create student
    const student = await tx.student.create({
      data: {
        userId: user.id,
        name,
        email,
        phoneNumber: phoneNumber || null,
        collegeId: college ? parseInt(college) : null,
        year: year ? parseInt(year) : null,
        age: age ? parseInt(age) : null
      }
    });

    // Generate QR code for student
    const QRCode = require('qrcode');
    const qrData = JSON.stringify({
      id: student.id,
      name: student.name,
      email: student.email,
      type: 'student'
    });
    const qrCode = await QRCode.toDataURL(qrData);

    // Update student with QR code
    await tx.student.update({
      where: { id: student.id },
      data: { qrCode }
    });

    return { user, student };
  });

  // Generate tokens for immediate login
  const accessToken = generateAccessToken(result.user.id, result.user.role);
  const refreshToken = generateRefreshToken();

  // Save refresh token
  await saveRefreshToken(result.user.id, refreshToken);

  const { password: _, ...userWithoutPassword } = result.user;

  return {
    accessToken,
    refreshToken,
    user: userWithoutPassword,
    student: result.student
  };
};

module.exports = {
  login,
  refreshAccessToken,
  logout,
  revokeAllUserTokens,
  generateAccessToken,
  updateProfile,
  getProfile,
  register
};
