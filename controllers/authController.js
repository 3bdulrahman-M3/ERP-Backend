const authService = require('../services/authService');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
        hint: 'Make sure to send a POST request with Content-Type: application/json and body: { "email": "your@email.com", "password": "yourpassword" }'
      });
    }

    const result = await authService.login(email, password);

    // Set tokens in cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true for HTTPS on Vercel
      sameSite: 'none', // Required for cross-domain cookies
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    res.cookie('accessToken', result.accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15 mins
    res.cookie('refreshToken', result.refreshToken, cookieOptions);

    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
};

const refreshToken = async (req, res, next) => {
  try {
    let refreshToken = req.body.refreshToken;
    if (!refreshToken && req.cookies) {
      refreshToken = req.cookies.refreshToken;
    }

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Please provide refresh token'
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 15 * 60 * 1000 // 15 mins
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
};

const logout = async (req, res, next) => {
  try {
    let refreshToken = req.body.refreshToken;
    if (!refreshToken && req.cookies) {
      refreshToken = req.cookies.refreshToken;
    }

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Please provide refresh token'
      });
    }

    await authService.logout(refreshToken);

    res.clearCookie('accessToken', { httpOnly: true, secure: true, sameSite: 'none' });
    res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'none' });

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await authService.getProfile(userId);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, email, password, profileImage } = req.body;

    const user = await authService.updateProfile(userId, { name, email, password, profileImage });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, phoneNumber, college, year, age } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter name, email, and password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const result = await authService.register({
      name,
      email,
      password,
      phoneNumber,
      college,
      year,
      age
    });

    // Set tokens in cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    res.cookie('accessToken', result.accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', result.refreshToken, cookieOptions);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'An error occurred during registration'
    });
  }
};

module.exports = {
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  register
};

