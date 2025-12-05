const { College } = require('../models');

const seedColleges = async () => {
  try {
    const colleges = [
      { name: 'Faculty of Engineering', description: 'Faculty of Engineering and Technology' },
      { name: 'Faculty of Medicine', description: 'Faculty of Medicine and Surgery' },
      { name: 'Faculty of Pharmacy', description: 'Faculty of Pharmacy and Medical Sciences' },
      { name: 'Faculty of Science', description: 'Faculty of Natural Sciences' },
      { name: 'Faculty of Commerce', description: 'Faculty of Commerce and Business Administration' },
      { name: 'Faculty of Arts', description: 'Faculty of Arts and Humanities' },
      { name: 'Faculty of Law', description: 'Faculty of Law and Legal Sciences' },
      { name: 'Faculty of Education', description: 'Faculty of Education and Educational Sciences' },
      { name: 'Faculty of Agriculture', description: 'Faculty of Agriculture and Agricultural Sciences' },
      { name: 'Faculty of Fine Arts', description: 'Faculty of Fine Arts and Design' }
    ];

    for (const collegeData of colleges) {
      const existingCollege = await College.findOne({ where: { name: collegeData.name } });
      if (!existingCollege) {
        await College.create(collegeData);
        console.log(`✅ Created college: ${collegeData.name}`);
      } else {
        console.log(`⏭️  College already exists: ${collegeData.name}`);
      }
    }

    console.log('✅ Colleges seeding completed');
  } catch (error) {
    console.error('❌ Error seeding colleges:', error);
    throw error;
  }
};

module.exports = seedColleges;

