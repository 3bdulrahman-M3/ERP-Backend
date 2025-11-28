const { Student, RoomStudent, Room, Sequelize } = require('../models');
const mealService = require('./mealService');
const checkInOutService = require('./checkInOutService');
const { Op } = require('sequelize');

// Get student dashboard data
const getStudentDashboard = async (studentId) => {
  // Get student info
  const student = await Student.findByPk(studentId, {
    include: [
      {
        model: require('./../models').User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role', 'isActive']
      },
      {
        model: require('./../models').College,
        as: 'college',
        attributes: ['id', 'name'],
        required: false
      }
    ],
    attributes: { exclude: ['password'] }
  });

  if (!student) {
    throw new Error('Student not found');
  }

  // Get student's current room
  const roomAssignment = await RoomStudent.findOne({
    where: {
      studentId,
      isActive: true
    },
    include: [
      {
        model: Room,
        as: 'room',
        attributes: ['id', 'roomNumber', 'floor', 'building', 'totalBeds', 'availableBeds', 'status']
      }
    ]
  });

  // Get kitchen status
  const kitchenStatus = await mealService.getKitchenStatus();
  
  // Get all active meals for display
  const allMeals = await mealService.getAllMeals();
  const activeMeals = allMeals.filter(meal => meal.isActive).map(meal => meal.toJSON());

  // Get current check-in/out status
  const checkInOutStatus = await checkInOutService.getCurrentStudentStatus(studentId);

  // Get current date and time
  const now = new Date();
  const currentDateTime = {
    date: now.toISOString().split('T')[0], // YYYY-MM-DD
    time: now.toTimeString().split(' ')[0], // HH:MM:SS
    timestamp: now.toISOString(),
    dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
    formatted: now.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  };

  return {
    student: student.toJSON(),
    room: roomAssignment ? {
      assignment: {
        id: roomAssignment.id,
        checkInDate: roomAssignment.checkInDate,
        checkOutDate: roomAssignment.checkOutDate,
        isActive: roomAssignment.isActive
      },
      room: roomAssignment.room.toJSON()
    } : null,
    kitchenStatus: {
      ...kitchenStatus,
      allMeals: activeMeals,
      currentDateTime: currentDateTime
    },
    checkInOutStatus: checkInOutStatus,
    currentDateTime: currentDateTime
  };
};

// Get admin dashboard statistics
const getAdminStatistics = async () => {
  try {
    // Count total students
    const totalStudents = await Student.count();

    // Count total rooms
    const totalRooms = await Room.count();

    // Count available rooms (rooms with availableBeds > 0 and status is available or reserved)
    const availableRooms = await Room.count({
      where: {
        [Op.and]: [
          { availableBeds: { [Op.gt]: 0 } },
          { status: { [Op.in]: ['available', 'reserved'] } }
        ]
      }
    });

    // Count occupied rooms (rooms with availableBeds = 0 or status = 'occupied')
    const occupiedRooms = await Room.count({
      where: {
        [Op.or]: [
          { availableBeds: { [Op.eq]: 0 } },
          { status: 'occupied' }
        ]
      }
    });

    return {
      totalStudents,
      totalRooms,
      availableRooms,
      occupiedRooms
    };
  } catch (error) {
    throw new Error(`Failed to get admin statistics: ${error.message}`);
  }
};

module.exports = {
  getStudentDashboard,
  getAdminStatistics
};

