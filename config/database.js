const { Sequelize } = require('sequelize');
require('dotenv').config();

// Support for DATABASE_URL (Railway, Koyeb, etc.) or individual variables
let sequelize;

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
  // Railway provides DATABASE_URL in format: postgresql://user:password@host:port/database
  // Only use it if it's not a Railway internal URL (which won't work locally)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} else if (hasIndividualVars) {
  // Fallback to individual environment variables
  sequelize = new Sequelize(
    process.env.DB_NAME || 'ERP',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      },
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
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      },
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
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      },
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

