const express = require('express');
const router = express.Router();
const registrationRequestController = require('../controllers/registrationRequestController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Public route - anyone can create a registration request (but we don't need it anymore since we have direct registration)
// Keeping it for backward compatibility, but it's not used
router.post('/', registrationRequestController.createRequest);

// Admin only routes
router.get('/', authMiddleware, roleMiddleware('admin'), registrationRequestController.getRequests);
router.post('/:id/approve', authMiddleware, roleMiddleware('admin'), registrationRequestController.approveRequest);
router.post('/:id/reject', authMiddleware, roleMiddleware('admin'), registrationRequestController.rejectRequest);

module.exports = router;

