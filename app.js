const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();
const { query } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route للتحقق من حالة السيرفر
app.get('/', (req, res) => {
  res.json({
    message: 'مرحباً بك في Backend ERP',
    status: 'running',
    database: 'PostgreSQL'
  });
});

// Route للتحقق من الاتصال بقاعدة البيانات
app.get('/api/health', async (req, res) => {
  try {
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    res.json({
      status: 'success',
      message: 'الاتصال بقاعدة البيانات يعمل بشكل صحيح',
      database: {
        currentTime: result.rows[0].current_time,
        version: result.rows[0].pg_version
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'فشل الاتصال بقاعدة البيانات',
      error: error.message
    });
  }
});

// Route مثال لإنشاء جدول (يمكنك حذفه لاحقاً)
app.get('/api/init', async (req, res) => {
  try {
    // مثال على إنشاء جدول بسيط
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    res.json({
      status: 'success',
      message: 'تم إنشاء الجدول بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء إنشاء الجدول',
      error: error.message
    });
  }
});

// بدء السيرفر
app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
  console.log(`📍 الرابط: http://localhost:${PORT}`);
});

module.exports = app;

