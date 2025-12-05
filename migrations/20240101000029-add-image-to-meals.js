'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('meals', 'image', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Meal image URL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('meals', 'image');
  }
};

