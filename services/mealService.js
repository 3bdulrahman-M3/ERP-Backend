const { Meal } = require('../models');
const { Op } = require('sequelize');

// Helper function to get current time in HH:mm format
const getCurrentTime = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}:00`;
};

// Helper function to compare times (HH:mm:ss format)
const compareTime = (time1, time2) => {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  const total1 = h1 * 60 + m1;
  const total2 = h2 * 60 + m2;
  return total1 - total2;
};

// Helper function to check if current time is between start and end
const isTimeBetween = (currentTime, startTime, endTime) => {
  return compareTime(currentTime, startTime) >= 0 && compareTime(currentTime, endTime) <= 0;
};

// Get all meals
const getAllMeals = async () => {
  const meals = await Meal.findAll({
    order: [
      ['name', 'ASC'],
      ['startTime', 'ASC']
    ]
  });
  return meals;
};

// Get meal by ID
const getMealById = async (id) => {
  const meal = await Meal.findByPk(id);
  if (!meal) {
    throw new Error('Meal not found');
  }
  return meal;
};

// Create meal
const createMeal = async (mealData) => {
  const { name, startTime, endTime, isActive, category } = mealData;

  // Validate time format
  if (!startTime || !endTime) {
    throw new Error('Start time and end time are required');
  }

  // Validate that end time is after start time
  if (compareTime(endTime, startTime) <= 0) {
    throw new Error('End time must be after start time');
  }

  // Check if meal with same name already exists
  const existingMeal = await Meal.findOne({ where: { name } });
  if (existingMeal) {
    throw new Error(`Meal with name ${name} already exists`);
  }

  const meal = await Meal.create({
    name,
    startTime,
    endTime,
    isActive: isActive !== undefined ? isActive : true,
    category: category || null
  });

  return meal.toJSON();
};

// Update meal
const updateMeal = async (id, mealData) => {
  const meal = await Meal.findByPk(id);
  if (!meal) {
    throw new Error('Meal not found');
  }

  const { name, startTime, endTime, isActive, category } = mealData;

  if (name && name !== meal.name) {
    const existingMeal = await Meal.findOne({ where: { name } });
    if (existingMeal) {
      throw new Error(`Meal with name ${name} already exists`);
    }
    meal.name = name;
  }

  if (startTime) meal.startTime = startTime;
  if (endTime) meal.endTime = endTime;
  if (isActive !== undefined) meal.isActive = isActive;
  if (category !== undefined) meal.category = category;

  // Validate that end time is after start time
  if (meal.startTime && meal.endTime && compareTime(meal.endTime, meal.startTime) <= 0) {
    throw new Error('End time must be after start time');
  }

  await meal.save();
  return meal.toJSON();
};

// Delete meal
const deleteMeal = async (id) => {
  const meal = await Meal.findByPk(id);
  if (!meal) {
    throw new Error('Meal not found');
  }

  await meal.destroy();
  return { message: 'Meal deleted successfully' };
};

// Get current kitchen status and next meal
const getKitchenStatus = async () => {
  const currentTime = getCurrentTime();
  const allMeals = await Meal.findAll({
    where: { isActive: true },
    order: [['startTime', 'ASC']]
  });

  if (allMeals.length === 0) {
    return {
      isOpen: false,
      currentMeal: null,
      nextMeal: null,
      timeUntilNextMeal: null,
      currentTime: currentTime
    };
  }

  // Find current active meal
  let currentMeal = null;
  for (const meal of allMeals) {
    if (isTimeBetween(currentTime, meal.startTime, meal.endTime)) {
      currentMeal = meal;
      break;
    }
  }

  // Find next meal
  let nextMeal = null;
  let timeUntilNextMeal = null;

  if (!currentMeal) {
    // Kitchen is closed, find next meal
    for (const meal of allMeals) {
      if (compareTime(meal.startTime, currentTime) > 0) {
        nextMeal = meal;
        // Calculate time difference
        const [currentH, currentM] = currentTime.split(':').map(Number);
        const [nextH, nextM] = meal.startTime.split(':').map(Number);
        const currentTotal = currentH * 60 + currentM;
        const nextTotal = nextH * 60 + nextM;
        const diffMinutes = nextTotal - currentTotal;
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        timeUntilNextMeal = {
          hours,
          minutes,
          totalMinutes: diffMinutes
        };
        break;
      }
    }
  } else {
    // Kitchen is open, find next meal after current one ends
    for (const meal of allMeals) {
      if (compareTime(meal.startTime, currentMeal.endTime) > 0) {
        nextMeal = meal;
        // Calculate time difference from current meal end time
        const [endH, endM] = currentMeal.endTime.split(':').map(Number);
        const [nextH, nextM] = meal.startTime.split(':').map(Number);
        const endTotal = endH * 60 + endM;
        const nextTotal = nextH * 60 + nextM;
        const diffMinutes = nextTotal - endTotal;
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        timeUntilNextMeal = {
          hours,
          minutes,
          totalMinutes: diffMinutes
        };
        break;
      }
    }
  }

  return {
    isOpen: currentMeal !== null,
    currentMeal: currentMeal ? currentMeal.toJSON() : null,
    nextMeal: nextMeal ? nextMeal.toJSON() : null,
    timeUntilNextMeal,
    currentTime: currentTime
  };
};

module.exports = {
  getAllMeals,
  getMealById,
  createMeal,
  updateMeal,
  deleteMeal,
  getKitchenStatus
};

