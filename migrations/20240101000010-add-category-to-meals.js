const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add category field to meals table as TEXT (free text)
    await queryInterface.addColumn('meals', 'category', {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('meals', 'category');
  }
};

