const { College } = require('../models');

const seedColleges = async () => {
  try {
    const colleges = [
      { name: 'كلية الهندسة', description: 'كلية الهندسة والتكنولوجيا' },
      { name: 'كلية الطب', description: 'كلية الطب والجراحة' },
      { name: 'كلية الصيدلة', description: 'كلية الصيدلة والعلوم الطبية' },
      { name: 'كلية العلوم', description: 'كلية العلوم الطبيعية' },
      { name: 'كلية التجارة', description: 'كلية التجارة وإدارة الأعمال' },
      { name: 'كلية الآداب', description: 'كلية الآداب والعلوم الإنسانية' },
      { name: 'كلية الحقوق', description: 'كلية الحقوق والعلوم القانونية' },
      { name: 'كلية التربية', description: 'كلية التربية والعلوم التربوية' },
      { name: 'كلية الزراعة', description: 'كلية الزراعة والعلوم الزراعية' },
      { name: 'كلية الفنون', description: 'كلية الفنون والتصميم' }
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

