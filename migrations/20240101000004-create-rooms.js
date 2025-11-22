const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create enum for room status
    await queryInterface.sequelize.query(`
      CREATE TYPE enum_rooms_status AS ENUM ('available', 'occupied', 'maintenance', 'reserved');
    `);

    await queryInterface.createTable('rooms', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      roomNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      floor: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      building: {
        type: DataTypes.STRING,
        allowNull: true
      },
      totalBeds: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      availableBeds: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('available', 'occupied', 'maintenance', 'reserved'),
        defaultValue: 'available'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes
    await queryInterface.addIndex('rooms', ['roomNumber'], {
      unique: true,
      name: 'rooms_roomNumber_unique'
    });

    await queryInterface.addIndex('rooms', ['status'], {
      name: 'rooms_status_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('rooms');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_rooms_status;');
  }
};

