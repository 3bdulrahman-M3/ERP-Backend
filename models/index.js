const User = require('./User');
const { sequelize } = require('../config/database');

// تصدير جميع الموديلات
const models = {
  User,
  sequelize
};

// إنشاء العلاقات هنا عند الحاجة

module.exports = models;

