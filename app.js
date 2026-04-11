require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./config/prisma');
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

// Enable trust proxy for Vercel/Reverse Proxies
app.set("trust proxy", 1);

// Ensure PORT is a number, not a string
const PORT = parseInt(process.env.PORT, 10) || 3001;

// Debug: Log PORT value
if (process.env.NODE_ENV === 'development') {
  console.log(`🔧 PORT from env: ${process.env.PORT || 'not set'}`);
  console.log(`🔧 PORT resolved to: ${PORT}`);
}

// Middlewares
const allowedOrigins = [
  'https://erp-frontend-mocha-three.vercel.app',
  'http://localhost:4200'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
}));

// Ensure preflight works for all routes
app.options('*', cors());

// 3. تحليل البيانات
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. الملفات الثابتة
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 5. موحد الاستجابات
app.use(responseHandler);

// Routes
// Debug Test Route
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Backend is live with Production-safe CORS',
    env: process.env.NODE_ENV,
    allowedOrigins
  });
});

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
    // Test database connection using Prisma
    await prisma.$queryRaw`SELECT 1`;
    
    // Get database info
    const dbInfoRaw = await prisma.$queryRaw`SELECT version(), current_database(), current_user`;
    const dbInfo = dbInfoRaw[0];
    
    res.json({
      success: true,
      message: 'Database connected successfully via Prisma',
      data: {
        status: 'connected',
        timestamp: new Date().toISOString(),
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
      error: error.message
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
  console.error('🔴 Global Error Handler:', err.stack);
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
    message: `Route ${req.method} ${req.url} not found`
  });
});

// Start server function
const startServer = async () => {
  try {
    // Debug: Print environment info
    console.log('\n🔍 Environment Debug Info:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set (hidden)' : '❌ NOT SET'}`);
    
    // Test database connection with timeout using Prisma
    console.log('🔄 Attempting to connect to database via Prisma...');
    try {
      await Promise.race([
        prisma.$connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
        )
      ]);
      console.log('✅ Successfully connected to ERP database via Prisma');
    } catch (dbError) {
      console.error('❌ Database connection failed!');
      console.error(`   Error: ${dbError.message}`);
      // Don't exit process if we're not in a standalone start
      if (require.main === module) {
        process.exit(1);
      }
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
    
    // Validate PORT is a valid number
    if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
      throw new Error(`Invalid PORT: ${PORT}. Must be a number between 1 and 65535.`);
    }
    
    if (require.main === module) {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📍 URL: http://localhost:${PORT}`);
      });
    }
  } catch (error) {
    console.error('❌ Startup error:', error);
    if (require.main === module) {
      process.exit(1);
    }
  }
};

// Only run standalone server if not required as a module (e.g., by Vercel)
if (require.main === module) {
  startServer();
}

module.exports = app;


