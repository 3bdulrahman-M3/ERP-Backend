const prisma = require('../config/prisma');
const notificationService = require('./notificationService');

// Track previous kitchen status (in-memory cache)
let previousKitchenStatus = {
  isOpen: false,
  currentMealId: null
};

// Helper function to format Prisma Date to HH:mm:ss
const formatPrismaTime = (date) => {
  if (!date) return '00:00:00';
  const d = new Date(date);
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

// Helper function to convert HH:mm:ss string to Date object for Prisma
const parseTimeToDate = (timeStr) => {
  if (!timeStr) return new Date();
  const [h, m, s] = timeStr.split(':').map(Number);
  const d = new Date(0); // Use epoch to keep date part stable
  d.setUTCHours(h || 0, m || 0, s || 0, 0);
  return d;
};

// Helper function to get current time in HH:mm:ss format
const getCurrentTime = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

// Helper function to compare times (HH:mm:ss format)
const compareTime = (time1, time2) => {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  const total1 = h1 * 60 + (m1 || 0);
  const total2 = h2 * 60 + (m2 || 0);
  return total1 - total2;
};

// Helper function to check if current time is between start and end
const isTimeBetween = (currentTime, startTime, endTime) => {
  return compareTime(currentTime, startTime) >= 0 && compareTime(currentTime, endTime) <= 0;
};

// Get all meals
const getAllMeals = async (page = 1, limit = 10) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);
  
  const [meals, count] = await Promise.all([
    prisma.meal.findMany({
      orderBy: [
        { name: 'asc' },
        { startTime: 'asc' }
      ],
      skip,
      take
    }),
    prisma.meal.count()
  ]);
  
  const formattedMeals = meals.map(meal => ({
    ...meal,
    startTime: formatPrismaTime(meal.startTime),
    endTime: formatPrismaTime(meal.endTime)
  }));
  
  return {
    meals: formattedMeals,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  };
};

// Get meal by ID
const getMealById = async (id) => {
  const mealId = parseInt(id);
  const meal = await prisma.meal.findUnique({
    where: { id: mealId }
  });
  
  if (!meal) {
    throw new Error('Meal not found');
  }
  
  return {
    ...meal,
    startTime: formatPrismaTime(meal.startTime),
    endTime: formatPrismaTime(meal.endTime)
  };
};

// Create meal
const createMeal = async (mealData) => {
  const { name, startTime, endTime, isActive, category, image } = mealData;

  if (!startTime || !endTime) {
    throw new Error('Start time and end time are required');
  }

  if (compareTime(endTime, startTime) <= 0) {
    throw new Error('End time must be after start time');
  }

  const existingMeal = await prisma.meal.findUnique({ where: { name } });
  if (existingMeal) {
    throw new Error(`Meal with name ${name} already exists`);
  }

  const meal = await prisma.meal.create({
    data: {
      name,
      startTime: parseTimeToDate(startTime),
      endTime: parseTimeToDate(endTime),
      isActive: isActive !== undefined ? isActive : true,
      category: category || null,
      image: image || null
    }
  });

  try {
    await notificationService.createNotificationForAdmins(
      'meal_created',
      'New Meal',
      `A new meal has been added: ${name}`,
      meal.id,
      'meal'
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  return {
    ...meal,
    startTime: formatPrismaTime(meal.startTime),
    endTime: formatPrismaTime(meal.endTime)
  };
};

// Update meal
const updateMeal = async (id, mealData) => {
  const mealId = parseInt(id);
  const meal = await prisma.meal.findUnique({ where: { id: mealId } });
  if (!meal) {
    throw new Error('Meal not found');
  }

  const { name, startTime, endTime, isActive, category, image } = mealData;

  if (name && name !== meal.name) {
    const existingMeal = await prisma.meal.findUnique({ where: { name } });
    if (existingMeal) {
      throw new Error(`Meal with name ${name} already exists`);
    }
  }

  const sTime = startTime ? startTime : formatPrismaTime(meal.startTime);
  const eTime = endTime ? endTime : formatPrismaTime(meal.endTime);

  if (compareTime(eTime, sTime) <= 0) {
    throw new Error('End time must be after start time');
  }

  const updatedMeal = await prisma.meal.update({
    where: { id: mealId },
    data: {
      name: name || undefined,
      startTime: startTime ? parseTimeToDate(startTime) : undefined,
      endTime: endTime ? parseTimeToDate(endTime) : undefined,
      isActive: isActive !== undefined ? isActive : undefined,
      category: category !== undefined ? category : undefined,
      image: image !== undefined ? (image || null) : undefined
    }
  });

  return {
    ...updatedMeal,
    startTime: formatPrismaTime(updatedMeal.startTime),
    endTime: formatPrismaTime(updatedMeal.endTime)
  };
};

// Delete meal
const deleteMeal = async (id) => {
  const mealId = parseInt(id);
  const meal = await prisma.meal.findUnique({ where: { id: mealId } });
  if (!meal) {
    throw new Error('Meal not found');
  }

  await prisma.meal.delete({ where: { id: mealId } });
  return { message: 'Meal deleted successfully' };
};

// Get current kitchen status and next meal
const getKitchenStatus = async () => {
  const currentTime = getCurrentTime();
  const allMealsRaw = await prisma.meal.findMany({
    where: { isActive: true },
    orderBy: { startTime: 'asc' }
  });

  const allMeals = allMealsRaw.map(m => ({
    ...m,
    startTimeStr: formatPrismaTime(m.startTime),
    endTimeStr: formatPrismaTime(m.endTime)
  }));

  if (allMeals.length === 0) {
    return {
      isOpen: false,
      currentMeal: null,
      nextMeal: null,
      timeUntilNextMeal: null,
      currentTime: currentTime
    };
  }

  let currentMeal = null;
  for (const meal of allMeals) {
    if (isTimeBetween(currentTime, meal.startTimeStr, meal.endTimeStr)) {
      currentMeal = meal;
      break;
    }
  }

  let nextMeal = null;
  let timeUntilNextMeal = null;

  if (!currentMeal) {
    for (const meal of allMeals) {
      if (compareTime(meal.startTimeStr, currentTime) > 0) {
        nextMeal = meal;
        const [currentH, currentM] = currentTime.split(':').map(Number);
        const [nextH, nextM] = meal.startTimeStr.split(':').map(Number);
        const currentTotal = currentH * 60 + currentM;
        const nextTotal = nextH * 60 + nextM;
        const diffMinutes = nextTotal - currentTotal;
        timeUntilNextMeal = {
          hours: Math.floor(diffMinutes / 60),
          minutes: diffMinutes % 60,
          totalMinutes: diffMinutes
        };
        break;
      }
    }
  } else {
    for (const meal of allMeals) {
      if (compareTime(meal.startTimeStr, currentMeal.endTimeStr) > 0) {
        nextMeal = meal;
        const [endH, endM] = currentMeal.endTimeStr.split(':').map(Number);
        const [nextH, nextM] = meal.startTimeStr.split(':').map(Number);
        const endTotal = endH * 60 + endM;
        const nextTotal = nextH * 60 + nextM;
        const diffMinutes = nextTotal - endTotal;
        timeUntilNextMeal = {
          hours: Math.floor(diffMinutes / 60),
          minutes: diffMinutes % 60,
          totalMinutes: diffMinutes
        };
        break;
      }
    }
  }

  const currentStatus = {
    isOpen: currentMeal !== null,
    currentMealId: currentMeal ? currentMeal.id : null
  };

  if (previousKitchenStatus.isOpen !== currentStatus.isOpen) {
    try {
      const allUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true }
      });
      const userIds = allUsers.map(u => u.id);

      if (currentStatus.isOpen) {
        const mealName = currentMeal ? currentMeal.name : 'Meal';
        await Promise.all(userIds.map(uId =>
          notificationService.createNotification(uId, 'kitchen_opened', 'Kitchen is Now Open', `Kitchen has been opened! Current meal: ${mealName}`, currentMeal.id, 'meal')
        ));
      } else {
        await Promise.all(userIds.map(uId =>
          notificationService.createNotification(uId, 'kitchen_closed', 'Kitchen is Now Closed', `Kitchen has been closed. ${nextMeal ? `Next meal: ${nextMeal.name}` : 'No upcoming meals'}`, null, 'meal')
        ));
      }
    } catch (error) {
      console.error('Error creating kitchen status notification:', error);
    }
    previousKitchenStatus = currentStatus;
  } else if (currentStatus.isOpen && previousKitchenStatus.currentMealId !== currentStatus.currentMealId) {
    try {
      const allUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true }
      });
      const userIds = allUsers.map(u => u.id);
      const mealName = currentMeal ? currentMeal.name : 'Meal';
      await Promise.all(userIds.map(uId =>
        notificationService.createNotification(uId, 'meal_changed', 'Meal Changed', `Current meal now: ${mealName}`, currentMeal.id, 'meal')
      ));
    } catch (error) {
      console.error('Error creating meal change notification:', error);
    }
    previousKitchenStatus = currentStatus;
  }

  const finalizeMeal = (m) => m ? { ...m, startTime: m.startTimeStr, endTime: m.endTimeStr, startTimeStr: undefined, endTimeStr: undefined } : null;

  return {
    isOpen: currentMeal !== null,
    currentMeal: finalizeMeal(currentMeal),
    nextMeal: finalizeMeal(nextMeal),
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
