const prisma = require('../config/prisma');
const seedColleges = require('./seedColleges');

const runSeeder = async () => {
  try {
    console.log('🌱 Starting colleges seeder...');
    await prisma.$connect();
    console.log('✅ Database connection established via Prisma');
    
    await seedColleges();
    
    await prisma.$disconnect();
    console.log('✅ Seeder completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running seeder:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

runSeeder();

