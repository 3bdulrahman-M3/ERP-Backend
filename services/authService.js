const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, RefreshToken } = require('../models');

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

  await RefreshToken.create({
    token,
    userId,
    expiresAt
  });
};

// Revoke refresh token
const revokeRefreshToken = async (token) => {
  const refreshToken = await RefreshToken.findOne({ where: { token } });
  if (refreshToken) {
    refreshToken.isRevoked = true;
    await refreshToken.save();
  }
};

// Revoke all refresh tokens for a user
const revokeAllUserTokens = async (userId) => {
  await RefreshToken.update(
    { isRevoked: true },
    { where: { userId, isRevoked: false } }
  );
};

const login = async (email, password) => {
  const user = await User.findOne({ where: { email } });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    throw new Error('Account is not active');
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken();

  // Save refresh token
  await saveRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: user.toJSON()
  };
};

const refreshAccessToken = async (refreshToken) => {
  // Find the refresh token in database
  const tokenRecord = await RefreshToken.findOne({
    where: { token: refreshToken },
    include: [{ model: User, as: 'user' }]
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

  return {
    accessToken: newAccessToken,
    user: user.toJSON()
  };
};

const logout = async (refreshToken) => {
  await revokeRefreshToken(refreshToken);
};

// Update user profile
const updateProfile = async (userId, updateData) => {
  const { Student } = require('../models');
  const { name, email, password, profileImage } = updateData;

  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Check if email is being changed and if it's already taken
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('Email already exists');
    }
    
    // Also check if email exists in students table
    const existingStudent = await Student.findOne({ where: { email } });
    if (existingStudent) {
      throw new Error('Email already exists');
    }
    
    user.email = email;
  }

  // Update name if provided
  if (name) {
    user.name = name;
  }

  // Update password if provided (will be hashed by User model hook)
  if (password) {
    user.password = password;
  }

  // Update profile image if provided
  if (profileImage !== undefined) {
    user.profileImage = profileImage;
  }

  await user.save();

  // If user is a student, sync changes to Student table
  if (user.role === 'student') {
    const student = await Student.findOne({ where: { userId: user.id } });
    if (student) {
      let studentUpdated = false;
      if (name && student.name !== name) {
        student.name = name;
        studentUpdated = true;
      }
      if (email && student.email !== email) {
        student.email = email;
        studentUpdated = true;
      }
      if (profileImage !== undefined && student.profileImage !== profileImage) {
        student.profileImage = profileImage;
        studentUpdated = true;
      }
      
      // Regenerate QR code if name or email changed
      if (name || email) {
        const QRCode = require('qrcode');
        const qrData = JSON.stringify({
          id: student.id,
          name: student.name,
          email: student.email,
          type: 'student'
        });
        student.qrCode = await QRCode.toDataURL(qrData);
        studentUpdated = true;
      }
      
      if (studentUpdated) {
        await student.save();
      }
    }
  }

  return user.toJSON();
};

// Get user profile
const getProfile = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user.toJSON();
};

module.exports = {
  login,
  refreshAccessToken,
  logout,
  revokeAllUserTokens,
  generateAccessToken,
  updateProfile,
  getProfile
};
