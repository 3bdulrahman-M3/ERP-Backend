/**
 * Script to test database connection
 * Usage: node scripts/test-connection.js
 */

require('dotenv').config();

// Check if Railway internal URL is being used locally
const isRailwayInternal = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway.internal');
const isOnRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;

if (isRailwayInternal && !isOnRailway) {
  console.error('❌ ERROR: Railway internal DATABASE_URL detected but not running on Railway!');
  console.error('📝 This URL only works on Railway platform, not locally.');
  console.error('\n📝 Solution: In your .env file:');
  console.error('   1. Comment out DATABASE_URL (add # at the beginning)');
  console.error('   2. Add individual variables:');
  console.error('      DB_HOST=localhost');
  console.error('      DB_PORT=5432');
  console.error('      DB_NAME=ERP');
  console.error('      DB_USER=postgres');
  console.error('      DB_PASSWORD=your_password');
  console.error('   3. Set NODE_ENV=development (for local development)');
  console.error('\n💡 Tip: Railway internal URLs (postgres.railway.internal) only work on Railway platform.');
  process.exit(1);
}

const { sequelize } = require('../config/database');

const testConnection = async () => {
  console.log('🔍 Testing database connection...\n');
  
  // Display connection info (without password)
  console.log('📋 Connection Configuration:');
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    console.log('   Using DATABASE_URL');
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Port: ${url.port}`);
    console.log(`   Database: ${url.pathname.slice(1)}`);
    console.log(`   User: ${url.username}`);
  } else {
    console.log('   Using individual environment variables');
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Port: ${process.env.DB_PORT || 5432}`);
    console.log(`   Database: ${process.env.DB_NAME || 'ERP'}`);
    console.log(`   User: ${process.env.DB_USER || 'postgres'}`);
  }
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
  
  try {
    // Test authentication
    console.log('⏳ Attempting to connect...');
    await sequelize.authenticate();
    console.log('✅ Connection successful!\n');
    
    // Get database info
    console.log('📊 Database Information:');
    const [results] = await sequelize.query("SELECT version(), current_database(), current_user");
    const dbInfo = results[0];
    console.log(`   Database Name: ${dbInfo.current_database}`);
    console.log(`   Current User: ${dbInfo.current_user}`);
    console.log(`   PostgreSQL Version: ${dbInfo.version.split(',')[0]}\n`);
    
    // Test query
    console.log('🧪 Testing query...');
    const [testResults] = await sequelize.query('SELECT 1 as test');
    console.log(`   Query Result: ${testResults[0].test === 1 ? '✅ Success' : '❌ Failed'}\n`);
    
    // Check if migrations table exists
    console.log('📋 Checking migrations...');
    const [migrations] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'migrations'
      ) as exists
    `);
    
    if (migrations[0].exists) {
      const [migrationCount] = await sequelize.query('SELECT COUNT(*) as count FROM migrations');
      console.log(`   ✅ Migrations table exists`);
      console.log(`   📝 Executed migrations: ${migrationCount[0].count}\n`);
    } else {
      console.log('   ⚠️  Migrations table not found. Run: npm run migrate\n');
    }
    
    console.log('🎉 All tests passed! Database connection is working correctly.');
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Connection failed!\n');
    console.error('Error Details:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.original?.code || 'N/A'}`);
    console.error(`   SQL State: ${error.original?.sqlState || 'N/A'}\n`);
    
    console.error('🔧 Troubleshooting:');
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('   - Check if DB_HOST is correct');
      console.error('   - Verify network connectivity');
    } else if (error.message.includes('password') || error.message.includes('authentication')) {
      console.error('   - Check DB_PASSWORD or DATABASE_URL password');
      console.error('   - Verify user credentials');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.error('   - Database does not exist');
      console.error('   - Create database: CREATE DATABASE "ERP";');
    } else if (error.message.includes('timeout')) {
      console.error('   - Connection timeout');
      console.error('   - Check if database server is running');
      console.error('   - Verify firewall settings');
    } else {
      console.error('   - Check all environment variables');
      console.error('   - Verify database server is running');
      console.error('   - Check network connectivity');
    }
    
    await sequelize.close();
    process.exit(1);
  }
};

testConnection();

