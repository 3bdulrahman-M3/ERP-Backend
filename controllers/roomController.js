const roomService = require('../services/roomService');

// Create room
const createRoom = async (req, res) => {
  try {
    const { roomNumber, floor, buildingId, totalBeds, description, status, roomType, roomPrice, bedPrice, serviceIds } = req.body;

    if (!totalBeds) {
      return res.status(400).json({
        success: false,
        message: 'Please provide totalBeds'
      });
    }

    const room = await roomService.createRoom({
      roomNumber,
      floor,
      buildingId,
      totalBeds,
      description,
      status,
      roomType,
      roomPrice,
      bedPrice,
      serviceIds
    });

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: room
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all rooms
const getAllRooms = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const filters = {
      status: req.query.status,
      buildingId: req.query.buildingId ? parseInt(req.query.buildingId) : undefined,
      floor: req.query.floor ? parseInt(req.query.floor) : undefined
    };

    const result = await roomService.getAllRooms(page, limit, filters);

    res.json({
      success: true,
      message: 'Rooms retrieved successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get room by ID
const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await roomService.getRoomById(id);

    res.json({
      success: true,
      message: 'Room retrieved successfully',
      data: room
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

// Update room
const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Ensure serviceIds is included if provided
    if (req.body.serviceIds !== undefined) {
      updateData.serviceIds = req.body.serviceIds;
    }

    const room = await roomService.updateRoom(id, updateData);

    res.json({
      success: true,
      message: 'Room updated successfully',
      data: room
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete room
const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    await roomService.deleteRoom(id);

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Assign student to room
const assignStudent = async (req, res) => {
  try {
    const { roomId, studentId, checkInDate, paid } = req.body;

    if (!roomId || !studentId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide roomId and studentId'
      });
    }

    const assignment = await roomService.assignStudentToRoom(roomId, studentId, checkInDate, paid);

    res.status(201).json({
      success: true,
      message: 'Student assigned to room successfully',
      data: assignment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Check out student from room
const checkOutStudent = async (req, res) => {
  try {
    const { studentId, checkOutDate } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide studentId'
      });
    }

    const result = await roomService.checkOutStudentFromRoom(studentId, checkOutDate);

    res.json({
      success: true,
      message: result.message,
      data: result.assignment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get student's current room
const getStudentRoom = async (req, res) => {
  try {
    const { studentId } = req.params;

    const room = await roomService.getStudentRoom(studentId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Student is not assigned to any room'
      });
    }

    res.json({
      success: true,
      message: 'Student room retrieved successfully',
      data: room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all students in a room
const getRoomStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const includeInactive = req.query.includeInactive === 'true';

    const students = await roomService.getRoomStudents(id, includeInactive);

    res.json({
      success: true,
      message: 'Room students retrieved successfully',
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get current student's room (for student role)
const getMyRoom = async (req, res) => {
  try {
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

    const room = await roomService.getStudentRoom(student.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Student is not assigned to any room'
      });
    }

    res.json({
      success: true,
      message: 'Student room retrieved successfully',
      data: room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  assignStudent,
  checkOutStudent,
  getStudentRoom,
  getRoomStudents,
  getMyRoom
};

