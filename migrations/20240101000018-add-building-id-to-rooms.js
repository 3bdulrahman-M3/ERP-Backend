const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add buildingId column to rooms table
    await queryInterface.addColumn('rooms', 'buildingId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'buildings',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Create index for buildingId
    await queryInterface.addIndex('rooms', ['buildingId'], {
      name: 'rooms_buildingId_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('rooms', 'rooms_buildingId_index');
    await queryInterface.removeColumn('rooms', 'buildingId');
  }
};

