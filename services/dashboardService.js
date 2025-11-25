const { Student, RoomStudent, Room } = require('../models');
const mealService = require('./mealService');

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
    currentDateTime: currentDateTime
  };
};

module.exports = {
  getStudentDashboard
};

