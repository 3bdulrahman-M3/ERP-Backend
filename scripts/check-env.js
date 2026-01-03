/**
 * Script to check environment variables
 * Usage: node scripts/check-env.js
 */

require('dotenv').config();

console.log('🔍 Checking Environment Variables...\n');

console.log('📋 Database Configuration:');
if (process.env.DATABASE_URL) {
  console.log('   ✅ DATABASE_URL is set');
  const url = new URL(process.env.DATABASE_URL);
  console.log(`   Host: ${url.hostname}`);
  console.log(`   Port: ${url.port}`);
  console.log(`   Database: ${url.pathname.slice(1)}`);
  console.log(`   User: ${url.username}`);
  
  // Check if it's Railway internal URL (won't work locally)
  if (url.hostname.includes('railway.internal')) {
    console.log('\n   ⚠️  WARNING: This is a Railway internal URL!');
    console.log('   This will NOT work locally. Use individual variables for local development.\n');
  }
} else {
  console.log('   ❌ DATABASE_URL is not set');
}

console.log('\n📋 Individual Database Variables:');
console.log(`   DB_HOST: ${process.env.DB_HOST || '❌ Not set'}`);
console.log(`   DB_PORT: ${process.env.DB_PORT || '❌ Not set'}`);
console.log(`   DB_NAME: ${process.env.DB_NAME || '❌ Not set'}`);
console.log(`   DB_USER: ${process.env.DB_USER || '❌ Not set'}`);
console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '✅ Set (hidden)' : '❌ Not set'}`);

console.log('\n📋 Server Configuration:');
console.log(`   PORT: ${process.env.PORT || '3001 (default)'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development (default)'}`);

console.log('\n📋 JWT Configuration:');
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Not set'}`);
console.log(`   JWT_EXPIRES_IN: ${process.env.JWT_EXPIRES_IN || '7d (default)'}`);

console.log('\n💡 Recommendation:');
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway.internal')) {
  console.log('   For LOCAL development, comment out DATABASE_URL and use individual variables:');
  console.log('   # DATABASE_URL=... (comment this out)');
  console.log('   DB_HOST=localhost');
  console.log('   DB_PORT=5432');
  console.log('   DB_NAME=ERP');
  console.log('   DB_USER=postgres');
  console.log('   DB_PASSWORD=your_local_password');
} else if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  console.log('   Set either DATABASE_URL or individual DB variables in .env file');
}

