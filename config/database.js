const { Pool } = require('pg');
require('dotenv').config();

// إنشاء اتصال قاعدة البيانات
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'erp_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// اختبار الاتصال
pool.on('connect', () => {
  console.log('✅ تم الاتصال بقاعدة البيانات PostgreSQL بنجاح');
});

pool.on('error', (err) => {
  console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err);
});

// دالة لتنفيذ الاستعلامات
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('تم تنفيذ الاستعلام:', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('خطأ في تنفيذ الاستعلام:', error);
    throw error;
  }
};

// دالة للحصول على العميل من الـ pool
const getClient = async () => {
  const client = await pool.connect();
  return client;
};

module.exports = {
  query,
  getClient,
  pool
};

