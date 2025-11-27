const { Service } = require('../models');

const seedServices = async () => {
  try {
    const services = [
      { name: 'WiFi', description: 'اتصال بالإنترنت', icon: 'wifi' },
      { name: 'تكييف', description: 'تكييف هواء', icon: 'ac' },
      { name: 'تلفزيون', description: 'تلفزيون', icon: 'tv' },
      { name: 'ثلاجة', description: 'ثلاجة', icon: 'fridge' },
      { name: 'ميكروويف', description: 'ميكروويف', icon: 'microwave' }
    ];

    for (const serviceData of services) {
      const existingService = await Service.findOne({ where: { name: serviceData.name } });
      if (!existingService) {
        await Service.create(serviceData);
        console.log(`✅ Created service: ${serviceData.name}`);
      } else {
        console.log(`⚠️  Service already exists: ${serviceData.name}`);
      }
    }

    console.log('✅ Services seeding completed');
  } catch (error) {
    console.error('❌ Error seeding services:', error);
    throw error;
  }
};

module.exports = seedServices;


