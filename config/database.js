const { Sequelize } = require('sequelize');
require('dotenv').config();

// Support for DATABASE_URL (Railway, Koyeb, etc.) or individual variables
let sequelize;

/**
 * Removes sslmode and other query parameters from DATABASE_URL
 * This prevents conflicts with Sequelize's SSL settings
 * @param {string} databaseUrl - The original DATABASE_URL
 * @returns {string} - Clean DATABASE_URL without query parameters
 */
function cleanDatabaseUrl(databaseUrl) {
  if (!databaseUrl) return databaseUrl;
  
  // Remove query parameters (sslmode, etc.) to avoid conflicts with Sequelize SSL config
  const urlParts = databaseUrl.split('?');
  if (urlParts.length > 1) {
    console.log('🔧 Removing query parameters from DATABASE_URL (using Sequelize SSL config instead)');
    return urlParts[0];
  }
  return databaseUrl;
}

/**
 * Determines if SSL is needed based on environment and URL
 * @param {string} databaseUrl - The DATABASE_URL (can be null)
 * @returns {boolean} - Whether SSL is required
 */
function needsSSL(databaseUrl) {
  const isProduction = process.env.NODE_ENV === 'production';
  const isRailwayURL = databaseUrl && (
    databaseUrl.includes('railway') || 
    databaseUrl.includes('rlwy.net') ||
    databaseUrl.includes('railway.internal')
  );
  const isKoyebURL = databaseUrl && databaseUrl.includes('koyeb');
  
  // SSL is required for:
  // 1. Production environment
  // 2. Railway URLs (always require SSL)
  // 3. Koyeb URLs (always require SSL)
  return isProduction || isRailwayURL || isKoyebURL;
}

/**
 * Gets SSL configuration for Sequelize dialectOptions
 * @param {boolean} requireSSL - Whether SSL is required
 * @returns {object} - SSL configuration object
 */
function getSSLConfig(requireSSL) {
  if (!requireSSL) {
    return {};
  }
  
  return {
    ssl: {
      require: true,
      rejectUnauthorized: false  // Accept self-signed certificates (required for Railway/Koyeb)
    },
    native: true  // Use native PostgreSQL client for better SSL support
  };
}

// Check if DATABASE_URL exists and is not a Railway internal URL (for local development)
const isRailwayInternal = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway.internal');
const isDevelopment = process.env.NODE_ENV !== 'production';
const hasDATABASE_URL = process.env.DATABASE_URL && !isRailwayInternal;
const hasIndividualVars = process.env.DB_HOST && process.env.DB_NAME;

// Log connection info for debugging (without password)
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log('📋 Database Configuration:');
    console.log(`   Using DATABASE_URL`);
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Port: ${url.port}`);
    console.log(`   Database: ${url.pathname.slice(1)}`);
    console.log(`   User: ${url.username}`);
  } catch (e) {
    console.log('⚠️  DATABASE_URL format issue');
  }
} else if (hasIndividualVars) {
  console.log('📋 Database Configuration:');
  console.log(`   Using individual variables`);
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   Port: ${process.env.DB_PORT}`);
  console.log(`   Database: ${process.env.DB_NAME}`);
  console.log(`   User: ${process.env.DB_USER}`);
} else {
  console.warn('⚠️  No database configuration found!');
}

// If Railway internal URL in development, ignore it and use individual vars
if (isRailwayInternal && isDevelopment) {
  console.warn('⚠️  Railway internal DATABASE_URL detected in development mode.');
  console.warn('⚠️  Ignoring DATABASE_URL. Please use individual DB variables (DB_HOST, DB_NAME, etc.) for local development.');
}

if (hasDATABASE_URL) {
  // Railway/Koyeb provides DATABASE_URL in format: postgresql://user:password@host:port/database
  // Only use it if it's not a Railway internal URL (which won't work locally)
  console.log('🔧 Using DATABASE_URL for connection');
  
  // Clean DATABASE_URL by removing sslmode and other query parameters
  const cleanedUrl = cleanDatabaseUrl(process.env.DATABASE_URL);
  const requireSSL = needsSSL(process.env.DATABASE_URL);
  const sslConfig = getSSLConfig(requireSSL);
  
  console.log(`🔍 SSL Detection: Production=${process.env.NODE_ENV === 'production'}, RequiresSSL=${requireSSL}`);
  
  if (requireSSL) {
    console.log('🔒 SSL enabled for database connection (rejectUnauthorized: false)');
  }
  
  sequelize = new Sequelize(cleanedUrl, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: sslConfig,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    retry: {
      max: 3
    }
  });
} else if (hasIndividualVars) {
  // Fallback to individual environment variables
  const requireSSL = process.env.NODE_ENV === 'production';
  const sslConfig = getSSLConfig(requireSSL);
  
  if (requireSSL) {
    console.log('🔒 SSL enabled for database connection (rejectUnauthorized: false)');
  }
  
  sequelize = new Sequelize(
    process.env.DB_NAME || 'ERP',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: sslConfig,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
} else {
  // Fallback: try to use DATABASE_URL even if it's Railway internal (for Railway production only)
  if (process.env.DATABASE_URL && !isRailwayInternal) {
    // Use DATABASE_URL if it's not Railway internal
    const cleanedUrl = cleanDatabaseUrl(process.env.DATABASE_URL);
    const requireSSL = needsSSL(process.env.DATABASE_URL);
    const sslConfig = getSSLConfig(requireSSL);
    
    if (requireSSL) {
      console.log('🔒 SSL enabled with rejectUnauthorized: false');
    }
    
    sequelize = new Sequelize(cleanedUrl, {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: sslConfig,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  } else if (process.env.DATABASE_URL && isRailwayInternal) {
    // Railway internal URL should ONLY work on Railway, not locally
    // Check if we're actually on Railway by checking for Railway-specific env vars
    const isOnRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;
    
    if (!isOnRailway) {
      // We're not on Railway, so Railway internal URL won't work
      console.error('❌ ERROR: Railway internal DATABASE_URL detected but not running on Railway!');
      console.error('📝 This URL only works on Railway platform, not locally.');
      console.error('📝 Solution: In your .env file:');
      console.error('   1. Comment out DATABASE_URL (add # at the beginning)');
      console.error('   2. Add individual variables:');
      console.error('      DB_HOST=localhost');
      console.error('      DB_PORT=5432');
      console.error('      DB_NAME=ERP');
      console.error('      DB_USER=postgres');
      console.error('      DB_PASSWORD=your_password');
      console.error('   3. Set NODE_ENV=development (for local development)');
      throw new Error('Railway internal DATABASE_URL cannot be used locally. Please use individual DB variables for local development.');
    }
    
    // We're on Railway, so Railway internal URL is fine
    console.log('✅ Using Railway internal DATABASE_URL (running on Railway).');
    console.log('🔒 SSL enabled with rejectUnauthorized: false');
    
    // Clean DATABASE_URL by removing sslmode and other query parameters
    const cleanedUrl = cleanDatabaseUrl(process.env.DATABASE_URL);
    const sslConfig = getSSLConfig(true); // Railway always requires SSL
    
    sequelize = new Sequelize(cleanedUrl, {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: sslConfig,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  } else {
    // Last resort: use defaults or show helpful error
    if (isRailwayInternal && isDevelopment) {
      console.error('❌ ERROR: Railway internal DATABASE_URL cannot be used locally!');
      console.error('📝 Solution: In your .env file, comment out DATABASE_URL and add:');
      console.error('   DB_HOST=localhost');
      console.error('   DB_PORT=5432');
      console.error('   DB_NAME=ERP');
      console.error('   DB_USER=postgres');
      console.error('   DB_PASSWORD=your_password');
      throw new Error('Railway internal DATABASE_URL cannot be used in local development. Please use individual DB variables.');
    }
    console.warn('⚠️  No database configuration found. Using defaults (will likely fail).');
    sequelize = new Sequelize(
      process.env.DB_NAME || 'ERP',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || '',
      {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      }
    );
  }
}

module.exports = { sequelize };

