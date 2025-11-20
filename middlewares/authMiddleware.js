const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware للتحقق من JWT Token
const authMiddleware = async (req, res, next) => {
  try {
    // الحصول على التوكن من Header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'التوكن غير موجود أو غير صحيح',
        error: 'UNAUTHORIZED'
      });
    }
    
    // استخراج التوكن
    const token = authHeader.substring(7);
    
    // التحقق من التوكن
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    
    // البحث عن المستخدم
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود',
        error: 'USER_NOT_FOUND'
      });
    }
    
    // إضافة بيانات المستخدم إلى الطلب
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'التوكن غير صحيح',
        error: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'انتهت صلاحية التوكن',
        error: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من التوكن',
      error: error.message
    });
  }
};

// Middleware للتحقق من أن المستخدم هو Admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'ليس لديك صلاحية للوصول إلى هذا المسار',
      error: 'FORBIDDEN'
    });
  }
};

// Middleware للتحقق من أن المستخدم هو Student
const isStudent = (req, res, next) => {
  if (req.user && req.user.role === 'student') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'ليس لديك صلاحية للوصول إلى هذا المسار',
      error: 'FORBIDDEN'
    });
  }
};

module.exports = {
  authMiddleware,
  isAdmin,
  isStudent
};

