const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();
const { sequelize, testConnection } = require('./config/database');
const responseHandler = require('./middlewares/responseHandler');

// استيراد Routes
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(responseHandler); // تطبيق تنسيق موحد للردود

// Route للتحقق من حالة السيرفر
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'مرحباً بك في Backend ERP',
    data: {
      status: 'running',
      database: 'PostgreSQL',
      version: '1.0.0'
    }
  });
});

// Route للتحقق من الاتصال بقاعدة البيانات
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      success: true,
      message: 'الاتصال بقاعدة البيانات يعمل بشكل صحيح',
      data: {
        database: 'PostgreSQL',
        status: 'connected'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل الاتصال بقاعدة البيانات',
      error: error.message
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);

// Route للتعامل مع المسارات غير الموجودة
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'المسار غير موجود',
    error: 'NOT_FOUND'
  });
});

// بدء السيرفر
const startServer = async () => {
  try {
    // اختبار الاتصال بقاعدة البيانات
    const isConnected = await testConnection();
    
    if (isConnected) {
      // لا نستخدم sequelize.sync - يجب تشغيل Migrations يدوياً أولاً
      // التحقق من وجود الجداول الأساسية
      try {
        await sequelize.authenticate();
        console.log('✅ الاتصال بقاعدة البيانات ناجح');
        console.log('ℹ️  تأكد من تشغيل Migrations قبل بدء السيرفر: npm run migrate');
      } catch (error) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error.message);
        console.log('ℹ️  تأكد من تشغيل Migrations أولاً: npm run migrate');
        throw error;
      }
      
      // تشغيل Seeder لإنشاء حساب Admin افتراضي
      if (process.env.RUN_SEEDER !== 'false') {
        const seedAdmin = require('./seeders/seedAdmin');
        await seedAdmin();
      }
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
      console.log(`📍 الرابط: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ فشل في بدء السيرفر:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
