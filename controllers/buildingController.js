const buildingService = require('../services/buildingService');

// Get all buildings
const getAllBuildings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await buildingService.getAllBuildings(page, limit);
    res.json({
      success: true,
      message: 'Buildings retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Get building by ID
const getBuildingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const building = await buildingService.getBuildingById(id);
    res.json({
      success: true,
      data: { building }
    });
  } catch (error) {
    next(error);
  }
};

// Create building
const createBuilding = async (req, res, next) => {
  try {
    const building = await buildingService.createBuilding(req.body);
    res.status(201).json({
      success: true,
      data: { building },
      message: 'Building created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update building
const updateBuilding = async (req, res, next) => {
  try {
    const { id } = req.params;
    const building = await buildingService.updateBuilding(id, req.body);
    res.json({
      success: true,
      data: { building },
      message: 'Building updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Delete building
const deleteBuilding = async (req, res, next) => {
  try {
    const { id } = req.params;
    await buildingService.deleteBuilding(id);
    res.json({
      success: true,
      message: 'Building deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding
};

