const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add year field to students
    await queryInterface.addColumn('students', 'year', {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 6
      }
    });

    // Change college from STRING to INTEGER (foreign key)
    await queryInterface.addColumn('students', 'collegeId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'colleges',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });

    // Add index for collegeId
    await queryInterface.addIndex('students', ['collegeId'], {
      name: 'students_collegeId_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('students', 'year');
    await queryInterface.removeColumn('students', 'collegeId');
  }
};

