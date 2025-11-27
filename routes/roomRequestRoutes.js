const express = require('express');
const router = express.Router();
const roomRequestController = require('../controllers/roomRequestController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Student routes
router.use(authMiddleware);

// Get matching rooms (student only)
router.get('/matching-rooms', roleMiddleware('student'), roomRequestController.getMatchingRooms);

// Get student's requests (student only)
router.get('/my-requests', roleMiddleware('student'), roomRequestController.getStudentRequests);

// Create room request (student only)
router.post('/', roleMiddleware('student'), roomRequestController.createRoomRequest);

// Get room requests for a specific room (admin only)
router.get('/room/:roomId', roleMiddleware('admin'), roomRequestController.getRoomRequests);

// Accept/Reject room request (admin only)
router.put('/:id/accept', roleMiddleware('admin'), roomRequestController.acceptRoomRequest);
router.put('/:id/reject', roleMiddleware('admin'), roomRequestController.rejectRoomRequest);

module.exports = router;

