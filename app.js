require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const roomRoutes = require('./routes/roomRoutes');
const collegeRoutes = require('./routes/collegeRoutes');
const mealRoutes = require('./routes/mealRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const checkInOutRoutes = require('./routes/checkInOutRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const buildingRoutes = require('./routes/buildingRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const preferenceRoutes = require('./routes/preferenceRoutes');
const roomRequestRoutes = require('./routes/roomRequestRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const registrationRequestRoutes = require('./routes/registrationRequestRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const responseHandler = require('./middlewares/responseHandler');
const path = require('path');

const app = express();
// Ensure PORT is a number, not a string
const PORT = parseInt(process.env.PORT, 10) || 3001;

// Debug: Log PORT value
if (process.env.NODE_ENV === 'development') {
  console.log(`🔧 PORT from env: ${process.env.PORT || 'not set'}`);
  console.log(`🔧 PORT resolved to: ${PORT}`);
}

// Middlewares
// CORS configuration - Allow Netlify and localhost
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:4200',
      'http://localhost:3000',
      /^https:\/\/.*\.netlify\.app$/,  // All Netlify subdomains
      /^https:\/\/.*\.koyeb\.app$/,    // All Koyeb subdomains
      /^https:\/\/.*\.railway\.app$/   // All Railway subdomains
    ];
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      callback(null, true); // Allow all for now - change to callback(new Error('Not allowed')) for strict mode
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files - Must be before responseHandler
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(responseHandler);

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to ERP System',
    data: {
      version: '1.0.0',
      status: 'running'
    }
  });
});

// Health check endpoint with detailed database info
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await sequelize.authenticate();
    
    // Get database info
    const [results] = await sequelize.query("SELECT version(), current_database(), current_user");
    const dbInfo = results[0];
    
    // Get connection config (without password)
    const config = sequelize.config;
    const connectionInfo = {
      database: config.database || 'N/A',
      host: config.host || 'N/A',
      port: config.port || 'N/A',
      username: config.username || 'N/A',
      dialect: config.dialect || 'N/A',
      usingDATABASE_URL: !!process.env.DATABASE_URL
    };
    
    res.json({
      success: true,
      message: 'Database connected successfully',
      data: {
        status: 'connected',
        timestamp: new Date().toISOString(),
        connection: connectionInfo,
        database: {
          name: dbInfo.current_database,
          user: dbInfo.current_user,
          version: dbInfo.version.split(',')[0] // PostgreSQL version
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || 'development',
          port: process.env.PORT || PORT
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection error',
      error: error.message,
      details: {
        timestamp: new Date().toISOString(),
        hasDATABASE_URL: !!process.env.DATABASE_URL,
        hasIndividualVars: !!(process.env.DB_HOST && process.env.DB_NAME),
        environment: process.env.NODE_ENV || 'development'
      }
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/colleges', collegeRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/check-in-out', checkInOutRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/room-requests', roomRequestRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/registration-requests', registrationRequestRoutes);
app.use('/api/reviews', reviewRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Page not found'
  });
});

// Start server
const startServer = async () => {
  try {
    // Debug: Print environment info
    console.log('\n🔍 Environment Debug Info:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set (hidden)' : '❌ NOT SET'}`);
    console.log(`   DB_HOST: ${process.env.DB_HOST || 'not set'}`);
    console.log(`   DB_NAME: ${process.env.DB_NAME || 'not set'}`);
    console.log(`   DB_USER: ${process.env.DB_USER || 'not set'}`);
    console.log(`   DB_PORT: ${process.env.DB_PORT || 'not set'}`);
    console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '✅ Set (hidden)' : 'not set'}`);
    console.log('');
    
    // Test database connection with timeout
    console.log('🔄 Attempting to connect to database...');
    try {
      await Promise.race([
        sequelize.authenticate(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
        )
      ]);
      console.log('✅ Successfully connected to ERP database');
    } catch (dbError) {
      console.error('❌ Database connection failed!');
      console.error(`   Error: ${dbError.message}`);
      if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
        console.error('\n📝 SOLUTION: Add DATABASE_URL to Koyeb Variables:');
        console.error('   1. Go to Koyeb Dashboard → Your App → Variables');
        console.error('   2. Add: DATABASE_URL=postgresql://user:pass@host:port/db');
        console.error('   3. Restart the app');
      }
      throw dbError;
    }
    
    // Run seeder if enabled
    if (process.env.RUN_SEEDER === 'true') {
      try {
        const seedAdmin = require('./seeders/seedAdmin');
        await seedAdmin();
      } catch (error) {
        console.log('⚠️  Seeder skipped:', error.message);
      }
    }
    
    // Try to free port before starting (only in development)
    if (process.env.NODE_ENV !== 'production') {
      try {
        const { killPort } = require('./utils/portHandler');
        const portResult = await killPort(PORT);
        if (portResult.success && portResult.pids && portResult.pids.length > 0) {
          console.log(`✅ Freed port ${PORT} (killed ${portResult.pids.length} process(es))`);
          // Wait a moment for port to be fully released
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        // Ignore port handler errors in production or if module doesn't exist
        console.log('⚠️  Port handler skipped');
      }
    }
    
    // Validate PORT is a valid number
    if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
      throw new Error(`Invalid PORT: ${PORT}. Must be a number between 1 and 65535.`);
    }
    
    console.log(`🔧 Starting server on port ${PORT}...`);
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      if (process.env.NODE_ENV === 'production') {
        console.log(`📍 Production server ready`);
      } else {
        console.log(`📍 URL: http://localhost:${PORT}`);
      }
    });

    // Handle server errors
    server.on('error', async (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`⚠️  Port ${PORT} is still in use. Attempting to free it...`);
        const result = await killPort(PORT);
        
        if (result.success) {
          console.log(`✅ ${result.message}`);
          console.log('🔄 Retrying to start server...');
          // Wait a moment then retry
          setTimeout(() => {
            const retryServer = app.listen(PORT, () => {
              console.log(`🚀 Server running on port ${PORT}`);
              console.log(`📍 URL: http://localhost:${PORT}`);
            });
            
            retryServer.on('error', (err) => {
              console.error(`❌ Port ${PORT} is still in use after retry.`);
              console.error(`💡 Please manually kill the process: netstat -ano | findstr :${PORT}`);
              process.exit(1);
            });
          }, 1000);
        } else {
          console.error(`❌ Could not free port ${PORT}`);
          console.error(`💡 Please manually kill the process: netstat -ano | findstr :${PORT}`);
          process.exit(1);
        }
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;

