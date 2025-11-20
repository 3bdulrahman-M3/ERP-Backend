const { Sequelize } = require('sequelize');
require('dotenv').config();

// إنشاء اتصال Sequelize مع قاعدة البيانات
const sequelize = new Sequelize(
  process.env.DB_NAME || 'erp_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '1234',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// اختبار الاتصال
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ تم الاتصال بقاعدة البيانات PostgreSQL بنجاح');
    return true;
  } catch (error) {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error.message);
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection
};
