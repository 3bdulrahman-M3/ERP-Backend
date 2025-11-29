const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Public route for completing profile (requires auth but not admin)
router.post('/complete-profile', authMiddleware, studentController.completeStudentProfile);

// All other routes require authentication and admin role
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// CRUD operations
router.post('/', studentController.createStudent);
router.get('/', studentController.getAllStudents);
router.get('/filter', studentController.getStudentsByCollegeAndYear);
router.get('/:id', studentController.getStudentById);
router.put('/:id', studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);

module.exports = router;

