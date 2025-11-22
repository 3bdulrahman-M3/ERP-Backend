require('dotenv').config();
const { sequelize } = require('../config/database');
const seedColleges = require('./seedColleges');

const runSeeder = async () => {
  try {
    console.log('🌱 Starting colleges seeder...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    await seedColleges();
    
    await sequelize.close();
    console.log('✅ Seeder completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running seeder:', error);
    await sequelize.close();
    process.exit(1);
  }
};

runSeeder();

