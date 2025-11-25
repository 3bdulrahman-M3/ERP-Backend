require('dotenv').config();
const { sequelize } = require('../config/database');

const fixCategoryEnum = async () => {
  try {
    console.log('🔧 Fixing category column from ENUM to TEXT...');
    
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Step 1: Remove default value
    await sequelize.query(`
      ALTER TABLE meals ALTER COLUMN category DROP DEFAULT;
    `);
    console.log('✅ Removed default value');

    // Step 2: Change column type from ENUM to TEXT
    await sequelize.query(`
      ALTER TABLE meals ALTER COLUMN category TYPE TEXT USING category::TEXT;
    `);
    console.log('✅ Changed column type to TEXT');

    // Step 3: Drop the enum type
    await sequelize.query(`
      DROP TYPE IF EXISTS enum_meals_category CASCADE;
    `);
    console.log('✅ Dropped enum type');

    console.log('✅ Category column fixed successfully!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing category column:', error);
    await sequelize.close();
    process.exit(1);
  }
};

fixCategoryEnum();



