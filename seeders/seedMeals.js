const { Meal } = require('../models');

const seedMeals = async () => {
  try {
    const meals = [
      { name: 'breakfast', startTime: '07:00:00', endTime: '09:00:00', isActive: true, category: null },
      { name: 'lunch', startTime: '13:00:00', endTime: '15:00:00', isActive: true, category: null },
      { name: 'dinner', startTime: '19:00:00', endTime: '21:00:00', isActive: true, category: null }
    ];

    for (const mealData of meals) {
      const existingMeal = await Meal.findOne({ where: { name: mealData.name } });
      if (!existingMeal) {
        await Meal.create(mealData);
        console.log(`✅ Created meal: ${mealData.name} (${mealData.startTime} - ${mealData.endTime})`);
      } else {
        console.log(`⏭️  Meal already exists: ${mealData.name}`);
      }
    }

    console.log('✅ Meals seeding completed');
  } catch (error) {
    console.error('❌ Error seeding meals:', error);
    throw error;
  }
};

module.exports = seedMeals;

