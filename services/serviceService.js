const prisma = require('../config/prisma');

// Get all services
const getAllServices = async (page = 1, limit = 10) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);
  
  const [services, count] = await Promise.all([
    prisma.service.findMany({
      orderBy: { name: 'asc' },
      skip,
      take,
      include: {
        _count: {
          select: { rooms: true }
        }
      }
    }),
    prisma.service.count()
  ]);

  const servicesWithCount = services.map(s => ({
    ...s,
    roomCount: s._count.rooms
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
  const sId = parseInt(id);
  const service = await prisma.service.findUnique({
    where: { id: sId },
    include: {
      _count: { select: { rooms: true } }
    }
  });

  if (!service) {
    throw new Error('Service not found');
  }
  
  return {
    ...service,
    roomCount: service._count.rooms
  };
};

// Create service
const createService = async (serviceData) => {
  const { name, description, icon } = serviceData;

  const existingService = await prisma.service.findUnique({ where: { name } });
  if (existingService) {
    throw new Error('Service with this name already exists');
  }

  return await prisma.service.create({
    data: {
      name,
      description: description || null,
      icon: icon || null
    }
  });
};

// Update service
const updateService = async (id, serviceData) => {
  const sId = parseInt(id);
  const service = await prisma.service.findUnique({ where: { id: sId } });
  if (!service) {
    throw new Error('Service not found');
  }

  const { name, description, icon } = serviceData;

  if (name && name !== service.name) {
    const existingService = await prisma.service.findUnique({ where: { name } });
    if (existingService) {
      throw new Error('Service with this name already exists');
    }
  }

  return await prisma.service.update({
    where: { id: sId },
    data: {
      name: name || undefined,
      description: description !== undefined ? description : undefined,
      icon: icon !== undefined ? icon : undefined
    }
  });
};

// Delete service
const deleteService = async (id) => {
  const sId = parseInt(id);
  const service = await prisma.service.findUnique({ where: { id: sId } });
  if (!service) {
    throw new Error('Service not found');
  }

  await prisma.service.delete({ where: { id: sId } });
  return { message: 'Service deleted successfully' };
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};
