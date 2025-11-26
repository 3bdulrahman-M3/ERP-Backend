const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('room_services', {
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
      serviceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'services',
          key: 'id'
        },
        onDelete: 'CASCADE'
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

    // Create unique constraint to prevent duplicate room-service pairs
    await queryInterface.addIndex('room_services', ['roomId', 'serviceId'], {
      unique: true,
      name: 'room_services_roomId_serviceId_unique'
    });

    // Create indexes
    await queryInterface.addIndex('room_services', ['roomId'], {
      name: 'room_services_roomId_index'
    });

    await queryInterface.addIndex('room_services', ['serviceId'], {
      name: 'room_services_serviceId_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('room_services');
  }
};

