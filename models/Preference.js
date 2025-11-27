const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Preference = sequelize.define('Preference', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  roomType: {
    type: DataTypes.ENUM('single', 'shared'),
    allowNull: true
  },
  preferredServices: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  }
}, {
  tableName: 'preferences',
  timestamps: true
});

module.exports = Preference;

