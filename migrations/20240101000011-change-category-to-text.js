const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if column exists and change its type from ENUM to TEXT
    await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN
        -- Check if column exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'meals' 
          AND column_name = 'category'
        ) THEN
          -- First, remove the default value if it exists (it depends on the enum type)
          ALTER TABLE meals ALTER COLUMN category DROP DEFAULT;
          
          -- Change column type from ENUM to TEXT
          ALTER TABLE meals ALTER COLUMN category TYPE TEXT USING category::TEXT;
          
          -- Now we can safely drop the enum type
          DROP TYPE IF EXISTS enum_meals_category;
        ELSE
          -- Add column if it doesn't exist
          ALTER TABLE meals ADD COLUMN category TEXT;
        END IF;
      END $$;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Keep as TEXT for rollback (no need to revert to ENUM)
    // If you need to revert, you can change it back to ENUM here
  }
};

