const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RoomStudent = sequelize.define('RoomStudent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  roomId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'rooms',
      key: 'id'
    },
    onDelete: 'CASCADE'
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
  checkInDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  checkOutDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'room_students',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['studentId'],
      where: {
        isActive: true
      },
      name: 'unique_active_student_room'
    }
  ]
});

// Associations will be set up in models/index.js

module.exports = RoomStudent;

