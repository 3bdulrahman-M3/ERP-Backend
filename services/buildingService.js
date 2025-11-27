const { Building, Room } = require('../models');

// Get all buildings with room count
const getAllBuildings = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  
  const { count, rows } = await Building.findAndCountAll({
    order: [['name', 'ASC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
  
  // Get room count for each building
  const buildingsWithCount = await Promise.all(
    rows.map(async (building) => {
      const roomCount = await Room.count({
        where: { buildingId: building.id }
      });
      
      const buildingData = building.toJSON();
      buildingData.roomCount = roomCount;
      return buildingData;
    })
  );
  
  return {
    buildings: buildingsWithCount,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  };
};

// Get building by ID
const getBuildingById = async (id) => {
  const building = await Building.findByPk(id, {
    include: [{
      model: Room,
      as: 'rooms',
      attributes: ['id', 'roomNumber', 'floor', 'totalBeds', 'availableBeds', 'status']
    }]
  });
  if (!building) {
    throw new Error('Building not found');
  }
  return building;
};

// Create building
const createBuilding = async (buildingData) => {
  const { name, address, latitude, longitude, floors } = buildingData;

  if (!name) {
    throw new Error('Building name is required');
  }

  const building = await Building.create({
    name,
    address: address || null,
    latitude: latitude ? parseFloat(latitude) : null,
    longitude: longitude ? parseFloat(longitude) : null,
    floors: floors ? parseInt(floors) : null,
    roomCount: 0
  });

  return building;
};

// Update building
const updateBuilding = async (id, buildingData) => {
  const building = await Building.findByPk(id);
  if (!building) {
    throw new Error('Building not found');
  }

  const { name, address, latitude, longitude, floors } = buildingData;

  if (name !== undefined) building.name = name;
  if (address !== undefined) building.address = address;
  if (latitude !== undefined) building.latitude = latitude ? parseFloat(latitude) : null;
  if (longitude !== undefined) building.longitude = longitude ? parseFloat(longitude) : null;
  if (floors !== undefined) building.floors = floors ? parseInt(floors) : null;

  await building.save();
  return building;
};

// Delete building
const deleteBuilding = async (id) => {
  const building = await Building.findByPk(id, {
    include: [{
      model: Room,
      as: 'rooms'
    }]
  });

  if (!building) {
    throw new Error('Building not found');
  }

  // Check if building has rooms
  if (building.rooms && building.rooms.length > 0) {
    throw new Error('Cannot delete building with existing rooms. Please remove or reassign rooms first.');
  }

  await building.destroy();
  return { message: 'Building deleted successfully' };
};

module.exports = {
  getAllBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding
};

