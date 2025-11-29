const express = require('express');
const router = express.Router();
const collegeController = require('../controllers/collegeController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// GET routes - available to all authenticated users (students and admins)
router.get('/', authMiddleware, collegeController.getAllColleges);
router.get('/:id', authMiddleware, collegeController.getCollegeById);

// POST, PUT, DELETE routes - require admin role
router.use(authMiddleware);
router.use(roleMiddleware('admin'));
router.post('/', collegeController.createCollege);
router.put('/:id', collegeController.updateCollege);
router.delete('/:id', collegeController.deleteCollege);

module.exports = router;

