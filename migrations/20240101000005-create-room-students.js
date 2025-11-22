const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table already exists
    const [tableExists] = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'room_students'
      );
    `);

    if (!tableExists[0].exists) {
      await queryInterface.createTable('room_students', {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      checkOutDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
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
    }

    // Create indexes (check if they exist first)
    const indexNames = [
      'room_students_roomId_index',
      'room_students_studentId_index',
      'room_students_isActive_index',
      'unique_active_student_room'
    ];

    const [existingIndexes] = await queryInterface.sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'room_students' 
      AND schemaname = 'public';
    `);

    const existingIndexNames = existingIndexes.map(idx => idx.indexname);

    if (!existingIndexNames.includes('room_students_roomId_index')) {
      await queryInterface.addIndex('room_students', ['roomId'], {
        name: 'room_students_roomId_index'
      });
    }

    if (!existingIndexNames.includes('room_students_studentId_index')) {
      await queryInterface.addIndex('room_students', ['studentId'], {
        name: 'room_students_studentId_index'
      });
    }

    if (!existingIndexNames.includes('room_students_isActive_index')) {
      await queryInterface.addIndex('room_students', ['isActive'], {
        name: 'room_students_isActive_index'
      });
    }

    // Create unique partial index to ensure one active room per student
    if (!existingIndexNames.includes('unique_active_student_room')) {
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX unique_active_student_room 
        ON "room_students" ("studentId") 
        WHERE "isActive" = true;
      `);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('room_students');
  }
};

