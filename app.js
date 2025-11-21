require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const responseHandler = require('./middlewares/responseHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please stop the process using this port or change the PORT in .env file`);
        console.error(`💡 To find and kill the process: netstat -ano | findstr :${PORT}`);
        process.exit(1);
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

