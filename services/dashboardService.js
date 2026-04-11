const prisma = require('../config/prisma');
const mealService = require('./mealService');
const checkInOutService = require('./checkInOutService');

// Get student dashboard data
const getStudentDashboard = async (studentId) => {
  const sId = parseInt(studentId);
  
  // Get student info
  const student = await prisma.student.findUnique({
    where: { id: sId },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, isActive: true }
      },
      college: {
        select: { id: true, name: true }
      }
    }
  });

  if (!student) {
    throw new Error('Student not found');
  }

  // Get student's current room
  const roomAssignment = await prisma.roomStudent.findFirst({
    where: {
      studentId: sId,
      isActive: true
    },
    include: {
      room: {
        select: { id: true, roomNumber: true, floor: true, totalBeds: true, availableBeds: true, status: true }
      }
    }
  });

  // Get kitchen status
  const kitchenStatus = await mealService.getKitchenStatus();
  
  // Get all active meals for display
  const mealsData = await mealService.getAllMeals(1, 100);
  const activeMeals = mealsData.meals.filter(meal => meal.isActive);

  // Get current check-in/out status
  const checkInOutStatus = await checkInOutService.getCurrentStudentStatus(sId);

  // Get current date and time
  const now = new Date();
  const currentDateTime = {
    date: now.toISOString().split('T')[0],
    time: now.toTimeString().split(' ')[0],
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
    student,
    room: roomAssignment ? {
      assignment: {
        id: roomAssignment.id,
        checkInDate: roomAssignment.checkInDate,
        checkOutDate: roomAssignment.checkOutDate,
        isActive: roomAssignment.isActive
      },
      room: roomAssignment.room
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
    const [totalStudents, totalRooms, availableRooms, occupiedRooms] = await Promise.all([
      // Count total students
      prisma.student.count(),

      // Count total rooms
      prisma.room.count(),

      // Count available rooms
      prisma.room.count({
        where: {
          AND: [
            { availableBeds: { gt: 0 } },
            { status: { in: ['available', 'reserved'] } }
          ]
        }
      }),

      // Count occupied rooms
      prisma.room.count({
        where: {
          OR: [
            { availableBeds: { equals: 0 } },
            { status: 'occupied' }
          ]
        }
      })
    ]);

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
