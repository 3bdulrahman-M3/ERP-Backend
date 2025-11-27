const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  roomNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  floor: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  building: {
    type: DataTypes.STRING,
    allowNull: true
  },
  buildingId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'buildings',
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  totalBeds: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      isInt: true
    }
  },
  availableBeds: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      isInt: true
    }
  },
  status: {
    type: DataTypes.ENUM('available', 'occupied', 'maintenance', 'reserved'),
    defaultValue: 'available'
  },
  roomType: {
    type: DataTypes.ENUM('single', 'shared'),
    allowNull: true,
    defaultValue: 'shared'
  },
  roomPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  bedPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'rooms',
  timestamps: true
});

// Associations will be set up in models/index.js

module.exports = Room;

