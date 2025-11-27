const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Change latitude from DECIMAL(10, 8) to DECIMAL(11, 8) to support -90 to +90
    await queryInterface.sequelize.query(`
      ALTER TABLE "buildings" 
      ALTER COLUMN "latitude" TYPE DECIMAL(11, 8);
    `);

    // Change longitude from DECIMAL(11, 8) to DECIMAL(12, 8) to support -180 to +180
    await queryInterface.sequelize.query(`
      ALTER TABLE "buildings" 
      ALTER COLUMN "longitude" TYPE DECIMAL(12, 8);
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to original precision
    await queryInterface.sequelize.query(`
      ALTER TABLE "buildings" 
      ALTER COLUMN "latitude" TYPE DECIMAL(10, 8);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "buildings" 
      ALTER COLUMN "longitude" TYPE DECIMAL(11, 8);
    `);
  }
};

