'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('students', 'profileImage', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Student profile image'
    });

    await queryInterface.addColumn('students', 'governorate', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Governorate'
    });

    await queryInterface.addColumn('students', 'address', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Address'
    });

    await queryInterface.addColumn('students', 'guardianPhone', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Guardian phone number'
    });

    await queryInterface.addColumn('students', 'idCardImage', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'ID card image'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('students', 'profileImage');
    await queryInterface.removeColumn('students', 'governorate');
    await queryInterface.removeColumn('students', 'address');
    await queryInterface.removeColumn('students', 'guardianPhone');
    await queryInterface.removeColumn('students', 'idCardImage');
  }
};


