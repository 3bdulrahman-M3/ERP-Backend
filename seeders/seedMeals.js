const { Meal } = require('../models');

const seedMeals = async () => {
  try {
    const meals = [
      { name: 'breakfast', startTime: '07:00:00', endTime: '09:00:00', isActive: true, category: null },
      { name: 'lunch', startTime: '13:00:00', endTime: '15:00:00', isActive: true, category: null },
      { name: 'dinner', startTime: '19:00:00', endTime: '21:00:00', isActive: true, category: null }
    ];

    for (const mealData of meals) {
      const existingMeal = await Meal.findFirst({ where: { name: mealData.name } });
      if (!existingMeal) {
        const [sh, sm, ss] = mealData.startTime.split(':').map(Number);
        const [eh, em, es] = mealData.endTime.split(':').map(Number);
        const startTime = new Date(0);
        startTime.setUTCHours(sh || 0, sm || 0, ss || 0, 0);
        const endTime = new Date(0);
        endTime.setUTCHours(eh || 0, em || 0, es || 0, 0);

        await Meal.create({
          data: {
            ...mealData,
            startTime,
            endTime
          }
        });
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

