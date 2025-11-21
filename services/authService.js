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

module.exports = {
  login,
  refreshAccessToken,
  logout,
  revokeAllUserTokens,
  generateAccessToken
};
