const express = require('express');
const router = express.Router();
const collegeController = require('../controllers/collegeController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// CRUD operations
router.get('/', collegeController.getAllColleges);
router.get('/:id', collegeController.getCollegeById);
router.post('/', collegeController.createCollege);
router.put('/:id', collegeController.updateCollege);
router.delete('/:id', collegeController.deleteCollege);

module.exports = router;

