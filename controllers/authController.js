const authService = require('../services/authService');

class AuthController {
  // تسجيل الدخول
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // التحقق من البيانات المطلوبة
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني وكلمة المرور مطلوبان',
          error: 'VALIDATION_ERROR'
        });
      }
      
      // تسجيل الدخول
      const result = await authService.login(email, password);
      
      return res.status(200).json({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        data: result
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message || 'فشل تسجيل الدخول',
        error: 'LOGIN_FAILED'
      });
    }
  }
}

module.exports = new AuthController();

