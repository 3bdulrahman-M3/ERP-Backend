const { User } = require('../models');
const { sequelize } = require('../config/database');

const seedAdmin = async (closeConnection = false) => {
  try {
    console.log('🌱 Starting seeder...');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ where: { email: 'admin@erp.com' } });

    if (existingAdmin) {
      console.log('⏭️  Admin account already exists');
      if (closeConnection) {
        await sequelize.close();
      }
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

    if (closeConnection) {
      await sequelize.close();
    }
  } catch (error) {
    console.error('❌ Error running seeder:', error);
    if (closeConnection) {
      await sequelize.close();
      process.exit(1);
    }
    throw error;
  }
};

// Run seeder if called directly (close connection when run standalone)
if (require.main === module) {
  seedAdmin(true);
}

module.exports = seedAdmin;

