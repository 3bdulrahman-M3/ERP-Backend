const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Check if student profile exists
router.get('/check-student-profile', dashboardController.checkStudentProfile);

// Student dashboard
router.get('/student', dashboardController.getStudentDashboard);

// Admin dashboard statistics
router.get('/admin/statistics', dashboardController.getAdminStatistics);

module.exports = router;

