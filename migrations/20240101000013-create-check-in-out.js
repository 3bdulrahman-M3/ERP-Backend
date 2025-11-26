const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table already exists
    const [tableExists] = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'check_in_out'
      );
    `);

    if (!tableExists[0].exists) {
      await queryInterface.createTable('check_in_out', {
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
          defaultValue: Sequelize.literal('CURRENT_DATE')
        },
        status: {
          type: DataTypes.ENUM('checked_in', 'checked_out'),
          allowNull: false,
          defaultValue: 'checked_in'
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
      await queryInterface.addIndex('check_in_out', ['studentId', 'date'], {
        name: 'student_date_index'
      });

      await queryInterface.addIndex('check_in_out', ['date'], {
        name: 'date_index'
      });

      await queryInterface.addIndex('check_in_out', ['status'], {
        name: 'status_index'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('check_in_out');
  }
};


