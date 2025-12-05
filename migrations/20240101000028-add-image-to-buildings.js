'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('buildings', 'image', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Building image URL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('buildings', 'image');
  }
};

