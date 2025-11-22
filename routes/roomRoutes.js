const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// CRUD operations
router.post('/', roomController.createRoom);
router.get('/', roomController.getAllRooms);
router.get('/:id', roomController.getRoomById);
router.put('/:id', roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);

// Student assignment operations
router.post('/assign', roomController.assignStudent);
router.post('/checkout', roomController.checkOutStudent);
router.get('/student/:studentId', roomController.getStudentRoom);
router.get('/:id/students', roomController.getRoomStudents);

module.exports = router;

