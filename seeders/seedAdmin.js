const User = require('../models/User');
const { sequelize } = require('../config/database');

// Seeder لإنشاء حساب Admin افتراضي
const seedAdmin = async () => {
  try {
    await sequelize.sync({ force: false }); // force: false لعدم حذف البيانات الموجودة
    
    // التحقق من وجود Admin
    const existingAdmin = await User.findOne({ where: { email: 'admin@dormitory.com' } });
    
    if (!existingAdmin) {
      // إنشاء حساب Admin افتراضي
      await User.create({
        name: 'مدير النظام',
        email: 'admin@dormitory.com',
        password: 'admin123', // سيتم تشفيرها تلقائياً بواسطة Hook
        role: 'admin'
      });
      
      console.log('✅ تم إنشاء حساب Admin الافتراضي بنجاح');
      console.log('📧 البريد الإلكتروني: admin@dormitory.com');
      console.log('🔑 كلمة المرور: admin123');
    } else {
      console.log('ℹ️  حساب Admin موجود بالفعل');
    }
    
    // إنشاء حساب Student تجريبي (اختياري)
    const existingStudent = await User.findOne({ where: { email: 'student@dormitory.com' } });
    
    if (!existingStudent) {
      await User.create({
        name: 'طالب تجريبي',
        email: 'student@dormitory.com',
        password: 'student123',
        role: 'student'
      });
      
      console.log('✅ تم إنشاء حساب Student التجريبي بنجاح');
      console.log('📧 البريد الإلكتروني: student@dormitory.com');
      console.log('🔑 كلمة المرور: student123');
    }
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء الحسابات الافتراضية:', error);
    throw error;
  }
};

module.exports = seedAdmin;

