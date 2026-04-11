const prisma = require('../config/prisma');

// Get all buildings with room count
const getAllBuildings = async (page = 1, limit = 10) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);
  
  const [buildings, count] = await Promise.all([
    prisma.building.findMany({
      orderBy: { name: 'asc' },
      skip,
      take,
      include: {
        _count: {
          select: { rooms: true }
        }
      }
    }),
    prisma.building.count()
  ]);
  
  // Get student count for each building
  const buildingsWithStats = await Promise.all(
    buildings.map(async (building) => {
      const studentCount = await prisma.roomStudent.count({
        where: { 
          isActive: true,
          room: { buildingId: building.id }
        }
      });
      
      return {
        ...building,
        roomCount: building._count.rooms,
        studentCount
      };
    })
  );
  
  return {
    buildings: buildingsWithStats,
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
  const bId = parseInt(id);
  const building = await prisma.building.findUnique({
    where: { id: bId },
    include: {
      rooms: {
        select: { id: true, roomNumber: true, floor: true, totalBeds: true, availableBeds: true, status: true }
      }
    }
  });
  
  if (!building) {
    throw new Error('Building not found');
  }
  return building;
};

// Create building
const createBuilding = async (buildingData) => {
  const { name, address, mapUrl, floors, image } = buildingData;

  if (!name) {
    throw new Error('Building name is required');
  }

  return await prisma.building.create({
    data: {
      name,
      address: address || null,
      mapUrl: mapUrl || null,
      floors: floors ? parseInt(floors) : null,
      image: image || null,
      roomCount: 0
    }
  });
};

// Update building
const updateBuilding = async (id, buildingData) => {
  const bId = parseInt(id);
  const building = await prisma.building.findUnique({ where: { id: bId } });
  if (!building) {
    throw new Error('Building not found');
  }

  const { name, address, mapUrl, floors, image } = buildingData;

  return await prisma.building.update({
    where: { id: bId },
    data: {
      name: name !== undefined ? name : undefined,
      address: address !== undefined ? address : undefined,
      mapUrl: mapUrl !== undefined ? (mapUrl || null) : undefined,
      floors: floors !== undefined ? (floors ? parseInt(floors) : null) : undefined,
      image: image !== undefined ? (image || null) : undefined
    }
  });
};

// Delete building
const deleteBuilding = async (id) => {
  const bId = parseInt(id);
  const building = await prisma.building.findUnique({
    where: { id: bId },
    include: { rooms: { take: 1 } }
  });

  if (!building) {
    throw new Error('Building not found');
  }

  if (building.rooms && building.rooms.length > 0) {
    throw new Error('Cannot delete building with existing rooms. Please remove or reassign rooms first.');
  }

  await prisma.building.delete({ where: { id: bId } });
  return { message: 'Building deleted successfully' };
};

module.exports = {
  getAllBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding
};
