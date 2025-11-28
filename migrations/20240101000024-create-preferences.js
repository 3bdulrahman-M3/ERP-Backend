const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('preferences', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      roomType: {
        type: DataTypes.ENUM('single', 'shared'),
        allowNull: true
      },
      preferredServices: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('preferences', ['userId'], {
      name: 'preferences_userId_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('preferences');
  }
};



