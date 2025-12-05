const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Public route - get approved reviews (for landing page)
router.get('/public', reviewController.getApprovedReviews);

// Student routes - require authentication
router.post('/', authMiddleware, reviewController.createReview);
router.get('/my-review', authMiddleware, reviewController.getStudentReview);
router.put('/my-review', authMiddleware, reviewController.updateReview);

// Admin routes - require authentication and admin role
router.get('/stats', authMiddleware, roleMiddleware('admin'), reviewController.getReviewStats);
router.get('/', authMiddleware, roleMiddleware('admin'), reviewController.getAllReviews);
router.put('/:id/approve', authMiddleware, roleMiddleware('admin'), reviewController.approveReview);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), reviewController.deleteReview);

module.exports = router;

