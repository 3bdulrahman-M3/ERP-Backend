const dashboardService = require('../services/dashboardService');

// Get student dashboard
const getStudentDashboard = async (req, res) => {
  try {
    // Get student ID from authenticated user
    const userId = req.userId;
    
    // Find student by userId
    const { Student } = require('../models');
    const student = await Student.findOne({ where: { userId } });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const dashboard = await dashboardService.getStudentDashboard(student.id);

    res.json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: dashboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getStudentDashboard
};

