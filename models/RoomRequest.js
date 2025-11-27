const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RoomRequest = sequelize.define('RoomRequest', {
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
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'room_requests',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['roomId', 'studentId', 'status'],
      where: {
        status: 'pending'
      },
      name: 'unique_pending_room_request'
    }
  ]
});

module.exports = RoomRequest;

