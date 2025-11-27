const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// All routes require authentication
router.use(authMiddleware);

// GET routes are available for all authenticated users (students and admins)
router.get('/', serviceController.getAllServices);
router.get('/:id', serviceController.getServiceById);

// POST, PUT, DELETE routes require admin role
router.use(roleMiddleware('admin'));
router.post('/', serviceController.createService);
router.put('/:id', serviceController.updateService);
router.delete('/:id', serviceController.deleteService);

module.exports = router;


