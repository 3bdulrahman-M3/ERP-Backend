const collegeService = require('../services/collegeService');

// Get all colleges
const getAllColleges = async (req, res) => {
  try {
    const colleges = await collegeService.getAllColleges();
    res.json({
      success: true,
      message: 'Colleges retrieved successfully',
      data: colleges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get college by ID
const getCollegeById = async (req, res) => {
  try {
    const { id } = req.params;
    const college = await collegeService.getCollegeById(id);
    res.json({
      success: true,
      message: 'College retrieved successfully',
      data: college
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

// Create college
const createCollege = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide college name'
      });
    }

    const college = await collegeService.createCollege({ name, description });

    res.status(201).json({
      success: true,
      message: 'College created successfully',
      data: college
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Update college
const updateCollege = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const college = await collegeService.updateCollege(id, updateData);

    res.json({
      success: true,
      message: 'College updated successfully',
      data: college
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete college
const deleteCollege = async (req, res) => {
  try {
    const { id } = req.params;

    await collegeService.deleteCollege(id);

    res.json({
      success: true,
      message: 'College deleted successfully'
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAllColleges,
  getCollegeById,
  createCollege,
  updateCollege,
  deleteCollege
};

