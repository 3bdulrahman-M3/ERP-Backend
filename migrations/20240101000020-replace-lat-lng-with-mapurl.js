'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add mapUrl column
    await queryInterface.addColumn('buildings', 'mapUrl', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Remove latitude and longitude columns
    await queryInterface.removeColumn('buildings', 'latitude');
    await queryInterface.removeColumn('buildings', 'longitude');
  },

  down: async (queryInterface, Sequelize) => {
    // Add back latitude and longitude
    await queryInterface.addColumn('buildings', 'latitude', {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: true
    });

    await queryInterface.addColumn('buildings', 'longitude', {
      type: Sequelize.DECIMAL(12, 8),
      allowNull: true
    });

    // Remove mapUrl
    await queryInterface.removeColumn('buildings', 'mapUrl');
  }
};

