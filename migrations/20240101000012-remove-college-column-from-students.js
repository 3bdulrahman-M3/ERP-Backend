const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, make the column nullable to avoid constraint issues
    await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN
        -- Check if column exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'students' 
          AND column_name = 'college'
        ) THEN
          -- Make column nullable first
          ALTER TABLE students ALTER COLUMN college DROP NOT NULL;
          
          -- Remove the column
          ALTER TABLE students DROP COLUMN college;
        END IF;
      END $$;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Re-add the column if rollback is needed
    await queryInterface.addColumn('students', 'college', {
      type: DataTypes.STRING,
      allowNull: true
    });
  }
};



