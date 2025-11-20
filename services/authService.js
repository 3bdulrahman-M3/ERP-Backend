const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthService {
  // تسجيل الدخول
  async login(email, password) {
    try {
      // البحث عن المستخدم بالبريد الإلكتروني
      const user = await User.findOne({ where: { email } });
      
      if (!user) {
        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }
      
      // التحقق من كلمة المرور
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }
      
      // إنشاء JWT Token
      const token = jwt.sign(
        {
          userId: user.id,
          role: user.role
        },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      );
      
      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService();

