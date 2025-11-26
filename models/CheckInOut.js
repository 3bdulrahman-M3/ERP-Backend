const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CheckInOut = sequelize.define('CheckInOut', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  checkInTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  checkOutTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('checked_in', 'checked_out'),
    allowNull: false,
    defaultValue: 'checked_in'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'check_in_out',
  timestamps: true,
  indexes: [
    {
      fields: ['studentId', 'date'],
      name: 'student_date_index'
    },
    {
      fields: ['date'],
      name: 'date_index'
    },
    {
      fields: ['status'],
      name: 'status_index'
    }
  ]
});

module.exports = CheckInOut;

