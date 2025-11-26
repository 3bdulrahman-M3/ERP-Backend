const express = require('express');
const router = express.Router();
const checkInOutController = require('../controllers/checkInOutController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Routes accessible to all authenticated users
router.use(authMiddleware);

// Student routes (accessible to students)
router.get('/current-status', checkInOutController.getCurrentStatus);
router.get('/my-history', checkInOutController.getMyHistory);
router.get('/student/:studentId', checkInOutController.getStudentHistory);

// Admin only routes
router.use(roleMiddleware('admin'));

// Check in/out routes
router.post('/check-in', checkInOutController.checkIn);
router.post('/check-out', checkInOutController.checkOut);
router.post('/qr-scan', checkInOutController.checkInOutByQR);

// Get records
router.get('/', checkInOutController.getAllRecords);
router.get('/today', checkInOutController.getTodayCheckIns);
router.get('/search-students', checkInOutController.searchStudents);

module.exports = router;

