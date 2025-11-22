const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add roomType enum
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_rooms_roomType AS ENUM ('single', 'shared');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add fields to rooms table
    await queryInterface.addColumn('rooms', 'roomType', {
      type: DataTypes.ENUM('single', 'shared'),
      allowNull: true,
      defaultValue: 'shared'
    });

    await queryInterface.addColumn('rooms', 'roomPrice', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    });

    await queryInterface.addColumn('rooms', 'bedPrice', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    });

    // Add paid field to room_students table
    await queryInterface.addColumn('room_students', 'paid', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('rooms', 'roomType');
    await queryInterface.removeColumn('rooms', 'roomPrice');
    await queryInterface.removeColumn('rooms', 'bedPrice');
    await queryInterface.removeColumn('room_students', 'paid');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_rooms_roomType;');
  }
};

