const { Service } = require('../models');

const seedServices = async () => {
  try {
    const services = [
      { name: 'WiFi', description: 'Internet connection', icon: 'wifi' },
      { name: 'Air Conditioning', description: 'Air conditioning', icon: 'ac' },
      { name: 'TV', description: 'Television', icon: 'tv' },
      { name: 'Refrigerator', description: 'Refrigerator', icon: 'fridge' },
      { name: 'Microwave', description: 'Microwave', icon: 'microwave' }
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


