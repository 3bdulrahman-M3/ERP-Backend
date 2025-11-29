const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('messages', 'attachmentUrl', {
      type: DataTypes.STRING,
      allowNull: true
    });
    
    await queryInterface.addColumn('messages', 'attachmentType', {
      type: DataTypes.ENUM('image', 'file'),
      allowNull: true
    });
    
    await queryInterface.addColumn('messages', 'attachmentName', {
      type: DataTypes.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('messages', 'attachmentUrl');
    await queryInterface.removeColumn('messages', 'attachmentType');
    await queryInterface.removeColumn('messages', 'attachmentName');
  }
};

