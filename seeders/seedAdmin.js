const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
  try {
    console.log('🌱 Starting seeder...');

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({ 
      where: { email: 'admin@erp.com' } 
    });

    if (existingAdmin) {
      console.log('⏭️  Admin account already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create admin user
    await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@erp.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      }
    });

    console.log('✅ Admin account created successfully');
    console.log('📧 Email: admin@erp.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the password after first login');

  } catch (error) {
    console.error('❌ Error running seeder:', error);
    throw error;
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedAdmin().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = seedAdmin;
