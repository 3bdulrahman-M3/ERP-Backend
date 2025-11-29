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
const responseHandler = require('./middlewares/responseHandler');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files - يجب أن يكون قبل responseHandler
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

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      success: true,
      message: 'Database connected successfully',
      data: {
        database: 'ERP',
        status: 'connected'
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
    await sequelize.authenticate();
    console.log('✅ Successfully connected to ERP database');
    
    // Run seeder if enabled
    if (process.env.RUN_SEEDER === 'true') {
      try {
        const seedAdmin = require('./seeders/seedAdmin');
        await seedAdmin();
      } catch (error) {
        console.log('⚠️  Seeder skipped:', error.message);
      }
    }
    
    // Try to free port before starting
    const { killPort } = require('./utils/portHandler');
    const portResult = await killPort(PORT);
    if (portResult.success && portResult.pids && portResult.pids.length > 0) {
      console.log(`✅ Freed port ${PORT} (killed ${portResult.pids.length} process(es))`);
      // Wait a moment for port to be fully released
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
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

