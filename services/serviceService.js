const { Service, Room } = require('../models');

// Get all services
const getAllServices = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  
  const { count, rows } = await Service.findAndCountAll({
    order: [['name', 'ASC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  // Get room count for each service
  const servicesWithCount = await Promise.all(rows.map(async (service) => {
    const serviceJson = service.toJSON();
    const roomCount = await service.countRooms();
    serviceJson.roomCount = roomCount;
    return serviceJson;
  }));

  return {
    services: servicesWithCount,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  };
};

// Get service by ID
const getServiceById = async (id) => {
  const service = await Service.findByPk(id);
  if (!service) {
    throw new Error('Service not found');
  }
  return service;
};

// Create service
const createService = async (serviceData) => {
  const { name, description, icon } = serviceData;

  // Check if service already exists
  const existingService = await Service.findOne({ where: { name } });
  if (existingService) {
    throw new Error('Service with this name already exists');
  }

  const service = await Service.create({
    name,
    description: description || null,
    icon: icon || null
  });

  return service.toJSON();
};

// Update service
const updateService = async (id, serviceData) => {
  const service = await Service.findByPk(id);
  if (!service) {
    throw new Error('Service not found');
  }

  const { name, description, icon } = serviceData;

  if (name && name !== service.name) {
    const existingService = await Service.findOne({ where: { name } });
    if (existingService) {
      throw new Error('Service with this name already exists');
    }
    service.name = name;
  }

  if (description !== undefined) service.description = description;
  if (icon !== undefined) service.icon = icon;

  await service.save();
  return service.toJSON();
};

// Delete service
const deleteService = async (id) => {
  const service = await Service.findByPk(id);
  if (!service) {
    throw new Error('Service not found');
  }

  await service.destroy();
  return { message: 'Service deleted successfully' };
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};

