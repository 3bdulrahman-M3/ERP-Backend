const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Change content column to allow NULL
    await queryInterface.changeColumn('messages', 'content', {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert: make content NOT NULL again
    await queryInterface.changeColumn('messages', 'content', {
      type: DataTypes.TEXT,
      allowNull: false
    });
  }
};

