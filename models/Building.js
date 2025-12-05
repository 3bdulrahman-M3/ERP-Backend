const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Building = sequelize.define('Building', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  mapUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  floors: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  roomCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Building image URL'
  }
}, {
  tableName: 'buildings',
  timestamps: true
});

module.exports = Building;

