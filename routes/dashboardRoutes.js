const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Student dashboard
router.get('/student', dashboardController.getStudentDashboard);

module.exports = router;

