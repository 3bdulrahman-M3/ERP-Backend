const express = require('express');
const router = express.Router();
const mealController = require('../controllers/mealController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Kitchen status is available for all authenticated users
router.get('/status', authMiddleware, mealController.getKitchenStatus);

// All other routes require authentication and admin role
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// CRUD operations
router.get('/', mealController.getAllMeals);
router.get('/:id', mealController.getMealById);
router.post('/', mealController.createMeal);
router.put('/:id', mealController.updateMeal);
router.delete('/:id', mealController.deleteMeal);

module.exports = router;



