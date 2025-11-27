const express = require('express');
const router = express.Router();
const buildingController = require('../controllers/buildingController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Get all buildings (accessible to all authenticated users)
router.get('/', buildingController.getAllBuildings);

// Get building by ID (accessible to all authenticated users)
router.get('/:id', buildingController.getBuildingById);

// Create, update, delete routes require admin role
router.post('/', roleMiddleware('admin'), buildingController.createBuilding);
router.put('/:id', roleMiddleware('admin'), buildingController.updateBuilding);
router.delete('/:id', roleMiddleware('admin'), buildingController.deleteBuilding);

module.exports = router;

