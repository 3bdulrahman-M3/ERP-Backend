const roomRequestService = require('../services/roomRequestService');

// Create a room request (student)
const createRoomRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { Student } = require('../models');
    
    // Get student by userId
    const student = await Student.findOne({ where: { userId } });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const { roomId, notes } = req.body;
    const request = await roomRequestService.createRoomRequest(student.id, roomId, notes);
    
    res.json({
      success: true,
      message: 'Room request created successfully',
      data: request
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get matching rooms for student (based on preferences)
const getMatchingRooms = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await roomRequestService.getMatchingRooms(userId, page, limit);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get student's room requests
const getStudentRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { Student } = require('../models');
    
    // Get student by userId
    const student = await Student.findOne({ where: { userId } });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await roomRequestService.getStudentRequests(student.id, page, limit);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get room requests for a specific room (admin)
const getRoomRequests = async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await roomRequestService.getRoomRequests(roomId, page, limit);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Accept a room request (admin)
const acceptRoomRequest = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const request = await roomRequestService.acceptRoomRequest(requestId);
    
    res.json({
      success: true,
      message: 'Room request accepted successfully',
      data: request
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Reject a room request (admin)
const rejectRoomRequest = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const request = await roomRequestService.rejectRoomRequest(requestId);
    
    res.json({
      success: true,
      message: 'Room request rejected successfully',
      data: request
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createRoomRequest,
  getMatchingRooms,
  getStudentRequests,
  getRoomRequests,
  acceptRoomRequest,
  rejectRoomRequest
};

