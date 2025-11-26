require('dotenv').config();
const { sequelize } = require('../config/database');
const seedAdmin = require('./seedAdmin');
const seedMeals = require('./seedMeals');
const seedColleges = require('./seedColleges');
const seedServices = require('./seedServices');

const runAllSeeders = async () => {
  try {
    console.log('🌱 Starting all seeders...');
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');
    
    // Run all seeders in sequence
    console.log('📦 Seeding Admin...');
    await seedAdmin();
    console.log('');
    
    console.log('🍽️  Seeding Meals...');
    await seedMeals();
    console.log('');
    
    console.log('🏛️  Seeding Colleges...');
    await seedColleges();
    console.log('');
    
    console.log('🔧 Seeding Services...');
    await seedServices();
    console.log('');
    
    await sequelize.close();
    console.log('✅ All seeders completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running seeders:', error);
    await sequelize.close();
    process.exit(1);
  }
};

runAllSeeders();

