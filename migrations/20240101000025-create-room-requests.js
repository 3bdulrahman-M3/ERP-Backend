const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create enum for request status
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_room_requests_status AS ENUM ('pending', 'accepted', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.createTable('room_requests', {
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
    await queryInterface.addIndex('room_requests', ['roomId'], {
      name: 'room_requests_roomId_index'
    });

    await queryInterface.addIndex('room_requests', ['studentId'], {
      name: 'room_requests_studentId_index'
    });

    await queryInterface.addIndex('room_requests', ['status'], {
      name: 'room_requests_status_index'
    });

    // Unique constraint: one pending request per student per room
    await queryInterface.addIndex('room_requests', ['roomId', 'studentId', 'status'], {
      unique: true,
      where: {
        status: 'pending'
      },
      name: 'unique_pending_room_request'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('room_requests');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_room_requests_status;');
  }
};

