const { User } = require('../models');
const { sequelize } = require('../config/database');

const seedAdmin = async () => {
  try {
    console.log('🌱 Starting seeder...');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ where: { email: 'admin@erp.com' } });

    if (existingAdmin) {
      console.log('⏭️  Admin account already exists');
      return;
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@erp.com',
      password: 'admin123',
      role: 'admin',
      isActive: true
    });

    console.log('✅ Admin account created successfully');
    console.log('📧 Email: admin@erp.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the password after first login');

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error running seeder:', error);
    await sequelize.close();
    process.exit(1);
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin;

