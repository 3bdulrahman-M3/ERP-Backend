const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payments', {
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
      roomStudentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'room_students',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      amountDue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      amountPaid: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      remainingAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: DataTypes.ENUM('paid', 'partial', 'unpaid'),
        allowNull: false,
        defaultValue: 'unpaid'
      },
      paymentMethod: {
        type: DataTypes.ENUM('cash', 'visa', 'bank_transfer', 'other'),
        allowNull: false,
        defaultValue: 'cash'
      },
      paymentDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
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

    await queryInterface.addIndex('payments', ['studentId']);
    await queryInterface.addIndex('payments', ['roomId']);
    await queryInterface.addIndex('payments', ['status']);
    await queryInterface.addIndex('payments', ['paymentMethod']);

    await queryInterface.removeColumn('room_students', 'paid');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('room_students', 'paid', {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    });

    await queryInterface.dropTable('payments');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_paymentMethod";');
  }
};