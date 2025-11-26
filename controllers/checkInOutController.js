const checkInOutService = require('../services/checkInOutService');

// Check in student
const checkIn = async (req, res) => {
  try {
    const { studentId, notes } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    const checkIn = await checkInOutService.checkInStudent(studentId, notes);

    res.status(201).json({
      success: true,
      message: 'Student checked in successfully',
      data: checkIn
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Check out student
const checkOut = async (req, res) => {
  try {
    const { studentId, notes } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    const checkOut = await checkInOutService.checkOutStudent(studentId, notes);

    res.json({
      success: true,
      message: 'Student checked out successfully',
      data: checkOut
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Check in/out by QR code
const checkInOutByQR = async (req, res) => {
  try {
    const { qrData, notes } = req.body;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: 'QR code data is required'
      });
    }

    const result = await checkInOutService.checkInOutByQRCode(qrData, notes);

    res.json({
      success: true,
      message: result.status === 'checked_in' ? 'Student checked in successfully' : 'Student checked out successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all check-in/out records
const getAllRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filters = {
      date: req.query.date,
      status: req.query.status,
      studentId: req.query.studentId,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const result = await checkInOutService.getAllCheckInOuts(page, limit, filters);

    res.json({
      success: true,
      message: 'Records retrieved successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get today's check-ins
const getTodayCheckIns = async (req, res) => {
  try {
    const checkIns = await checkInOutService.getTodayCheckIns();

    res.json({
      success: true,
      message: 'Today\'s check-ins retrieved successfully',
      data: checkIns
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get student history
const getStudentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // If user is student, verify they can only access their own history
    const userId = req.userId;
    const { Student } = require('../models');
    const currentStudent = await Student.findOne({ where: { userId } });
    
    if (currentStudent && currentStudent.id !== parseInt(studentId)) {
      // If student is trying to access another student's history, use their own ID
      const actualStudentId = currentStudent.id;
      const result = await checkInOutService.getStudentHistory(actualStudentId, page, limit);
      
      return res.json({
        success: true,
        message: 'Student history retrieved successfully',
        data: result
      });
    }

    const result = await checkInOutService.getStudentHistory(studentId, page, limit);

    res.json({
      success: true,
      message: 'Student history retrieved successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get current student status (for student dashboard)
const getCurrentStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { Student } = require('../models');
    const student = await Student.findOne({ where: { userId } });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const status = await checkInOutService.getCurrentStudentStatus(student.id);

    res.json({
      success: true,
      message: 'Status retrieved successfully',
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get current student's history (for student dashboard)
const getMyHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { Student } = require('../models');
    const student = await Student.findOne({ where: { userId } });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await checkInOutService.getStudentHistory(student.id, page, limit);

    res.json({
      success: true,
      message: 'Student history retrieved successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Search students (autocomplete)
const searchStudents = async (req, res) => {
  try {
    const { q, limit } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        message: 'Search term too short',
        data: []
      });
    }

    const students = await checkInOutService.searchStudents(q, limit || 5);

    res.json({
      success: true,
      message: 'Students found successfully',
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  checkIn,
  checkOut,
  checkInOutByQR,
  getAllRecords,
  getTodayCheckIns,
  getStudentHistory,
  getCurrentStatus,
  getMyHistory,
  searchStudents
};

