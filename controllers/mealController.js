const mealService = require('../services/mealService');

// Get all meals
const getAllMeals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await mealService.getAllMeals(page, limit);
    res.json({
      success: true,
      message: 'Meals retrieved successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get meal by ID
const getMealById = async (req, res) => {
  try {
    const { id } = req.params;
    const meal = await mealService.getMealById(id);
    res.json({
      success: true,
      message: 'Meal retrieved successfully',
      data: meal
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

// Create meal
const createMeal = async (req, res) => {
  try {
    const { name, startTime, endTime, isActive, category, image } = req.body;

    if (!name || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, startTime, and endTime'
      });
    }

    const meal = await mealService.createMeal({ name, startTime, endTime, isActive, category, image });

    res.status(201).json({
      success: true,
      message: 'Meal created successfully',
      data: meal
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Update meal
const updateMeal = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const meal = await mealService.updateMeal(id, updateData);

    res.json({
      success: true,
      message: 'Meal updated successfully',
      data: meal
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete meal
const deleteMeal = async (req, res) => {
  try {
    const { id } = req.params;

    await mealService.deleteMeal(id);

    res.json({
      success: true,
      message: 'Meal deleted successfully'
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

// Get kitchen status (available for all authenticated users)
const getKitchenStatus = async (req, res) => {
  try {
    const status = await mealService.getKitchenStatus();
    res.json({
      success: true,
      message: 'Kitchen status retrieved successfully',
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAllMeals,
  getMealById,
  createMeal,
  updateMeal,
  deleteMeal,
  getKitchenStatus
};

