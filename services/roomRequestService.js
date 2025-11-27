const { RoomRequest, Room, Student, User, Service, Building, RoomStudent, Preference, College } = require('../models');
const { Op } = require('sequelize');
const notificationService = require('./notificationService');
const preferenceService = require('./preferenceService');

// Create a room request
const createRoomRequest = async (studentId, roomId, notes = null) => {
  // Check if student exists
  const student = await Student.findByPk(studentId);
  if (!student) {
    throw new Error('Student not found');
  }

  // Check if room exists
  const room = await Room.findByPk(roomId);
  if (!room) {
    throw new Error('Room not found');
  }

  // Check if room has available beds
  if (room.availableBeds <= 0) {
    throw new Error('Room has no available beds');
  }

  // Check if student already has a pending request for this room
  const existingRequest = await RoomRequest.findOne({
    where: {
      studentId,
      roomId,
      status: 'pending'
    }
  });

  if (existingRequest) {
    throw new Error('You already have a pending request for this room');
  }

  // Check if student is already in this room
  const existingAssignment = await RoomStudent.findOne({
    where: {
      studentId,
      roomId,
      isActive: true
    }
  });

  if (existingAssignment) {
    throw new Error('You are already assigned to this room');
  }

  // Create the request
  const request = await RoomRequest.create({
    studentId,
    roomId,
    status: 'pending',
    notes: notes || null
  });

  // Reload with relations
  await request.reload({
    include: [
      {
        model: Room,
        as: 'room',
        include: [
          {
            model: Service,
            as: 'services',
            attributes: ['id', 'name', 'description', 'icon'],
            through: { attributes: [] }
          },
          {
            model: Building,
            as: 'buildingInfo',
            attributes: ['id', 'name', 'address']
          }
        ]
      },
      {
        model: Student,
        as: 'student',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          },
          {
            model: College,
            as: 'college',
            attributes: ['id', 'name'],
            required: false
          }
        ]
      }
    ]
  });

  // Notify admins
  try {
    await notificationService.createNotificationForAdmins(
      'room_request',
      'طلب غرفة جديد',
      `الطالب ${student.name} قدم طلب للغرفة ${room.roomNumber}`,
      room.id, // Use roomId instead of request.id for navigation
      'room'
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  return request.toJSON();
};

// Get rooms matching student preferences
const getMatchingRooms = async (userId, page = 1, limit = 10) => {
  // Get student
  const user = await User.findByPk(userId, {
    include: [{
      model: Student,
      as: 'student',
      required: true
    }]
  });

  if (!user || !user.student) {
    throw new Error('Student not found');
  }

  const student = user.student;

  // Get student preferences
  const preferences = await preferenceService.getPreferences(userId);

  // Build query for matching rooms
  const whereClause = {
    status: { [Op.in]: ['available', 'occupied'] } // Only show available or occupied rooms
  };

  // If student has room type preference, filter by it
  if (preferences.roomType) {
    whereClause.roomType = preferences.roomType;
  }

  // Get all rooms
  const offset = (page - 1) * limit;
  const { count, rows } = await Room.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Service,
        as: 'services',
        attributes: ['id', 'name', 'description', 'icon'],
        through: { attributes: [] }
      },
      {
        model: Building,
        as: 'buildingInfo',
        attributes: ['id', 'name', 'address'],
        required: false
      },
      {
        model: RoomStudent,
        as: 'roomStudents',
        where: { isActive: true },
        required: false,
        attributes: ['id']
      }
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['roomNumber', 'ASC']]
  });

  // Filter rooms by service preferences
  let matchingRooms = rows;
  if (preferences.preferredServices && preferences.preferredServices.length > 0) {
    matchingRooms = rows.filter(room => {
      const roomServiceIds = room.services.map(s => s.id);
      return preferences.preferredServices.some(prefServiceId => 
        roomServiceIds.includes(prefServiceId)
      );
    });
  }

  // Get rooms where student is currently assigned (active room)
  const studentAssignments = await RoomStudent.findAll({
    where: {
      studentId: student.id,
      isActive: true
    },
    attributes: ['roomId']
  });
  const assignedRoomIds = studentAssignments.map(a => a.roomId);

  // Only exclude the room where student is currently assigned
  const excludedRoomIds = assignedRoomIds;

  // Get student's existing requests for these rooms
  const roomIds = matchingRooms.map(r => r.id);
  const studentRequests = await RoomRequest.findAll({
    where: {
      studentId: student.id,
      roomId: { [Op.in]: roomIds }
    }
  });

  const requestMap = {};
  studentRequests.forEach(req => {
    requestMap[req.roomId] = req.status;
  });

  // Filter out rooms where student is assigned or request was accepted
  const availableRooms = matchingRooms.filter(room => 
    !excludedRoomIds.includes(room.id)
  );

  // Format rooms with request status
  const formattedRooms = availableRooms.map(room => {
    const roomData = room.toJSON();
    roomData.occupiedBeds = room.roomStudents ? room.roomStudents.length : 0;
    roomData.hasPendingRequest = requestMap[room.id] === 'pending';
    roomData.requestStatus = requestMap[room.id] || null;
    return roomData;
  });

  return {
    rooms: formattedRooms,
    pagination: {
      total: formattedRooms.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(formattedRooms.length / limit)
    }
  };
};

// Get student's room requests
const getStudentRequests = async (studentId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const { count, rows } = await RoomRequest.findAndCountAll({
    where: { studentId },
    include: [
      {
        model: Room,
        as: 'room',
        include: [
          {
            model: Service,
            as: 'services',
            attributes: ['id', 'name', 'description', 'icon'],
            through: { attributes: [] }
          },
          {
            model: Building,
            as: 'buildingInfo',
            attributes: ['id', 'name', 'address']
          }
        ]
      }
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['createdAt', 'DESC']]
  });

  return {
    requests: rows.map(r => r.toJSON()),
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  };
};

// Get room requests for a specific room (for admin)
const getRoomRequests = async (roomId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const { count, rows } = await RoomRequest.findAndCountAll({
    where: { roomId },
    include: [
      {
        model: Student,
        as: 'student',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          },
          {
            model: College,
            as: 'college',
            attributes: ['id', 'name'],
            required: false
          }
        ]
      }
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['createdAt', 'DESC']]
  });

  return {
    requests: rows.map(r => r.toJSON()),
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  };
};

// Accept a room request
const acceptRoomRequest = async (requestId) => {
  const { Room } = require('../models');
  
  const request = await RoomRequest.findByPk(requestId, {
    include: [
      {
        model: Room,
        as: 'room'
      },
      {
        model: Student,
        as: 'student',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ]
      }
    ]
  });

  if (!request) {
    throw new Error('Request not found');
  }

  if (request.status !== 'pending') {
    throw new Error('Request is not pending');
  }

  // Check if room still has available beds
  if (request.room.availableBeds <= 0) {
    throw new Error('Room has no available beds');
  }

  // Check if student is already in another room
  const existingAssignment = await RoomStudent.findOne({
    where: {
      studentId: request.studentId,
      isActive: true
    }
  });

  // If student is in another room, remove them
  if (existingAssignment) {
    existingAssignment.isActive = false;
    existingAssignment.checkOutDate = new Date();
    await existingAssignment.save();

    // Update old room's available beds
    const oldRoom = await Room.findByPk(existingAssignment.roomId);
    if (oldRoom) {
      oldRoom.availableBeds = (oldRoom.availableBeds || 0) + 1;
      if (oldRoom.availableBeds === oldRoom.totalBeds) {
        oldRoom.status = 'available';
      }
      await oldRoom.save();
    }
  }

  // Assign student to the new room
  await RoomStudent.create({
    roomId: request.roomId,
    studentId: request.studentId,
    checkInDate: new Date(),
    isActive: true,
    paid: false
  });

  // Update room available beds
  request.room.availableBeds = (request.room.availableBeds || 0) - 1;
  if (request.room.availableBeds === 0) {
    request.room.status = 'occupied';
  } else {
    request.room.status = 'occupied';
  }
  await request.room.save();

  // Update request status
  request.status = 'accepted';
  await request.save();

  // Reject all other pending requests for this student
  await RoomRequest.update(
    { status: 'rejected' },
    {
      where: {
        studentId: request.studentId,
        status: 'pending',
        id: { [Op.ne]: requestId }
      }
    }
  );

  // Notify student
  try {
    await notificationService.createNotification(
      request.student.userId,
      'room_request_accepted',
      'تم قبول طلب الغرفة',
      `تم قبول طلبك للغرفة ${request.room.roomNumber}`,
      request.roomId,
      'room'
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  return request.toJSON();
};

// Reject a room request
const rejectRoomRequest = async (requestId) => {
  const request = await RoomRequest.findByPk(requestId, {
    include: [
      {
        model: Room,
        as: 'room'
      },
      {
        model: Student,
        as: 'student',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ]
      }
    ]
  });

  if (!request) {
    throw new Error('Request not found');
  }

  if (request.status !== 'pending') {
    throw new Error('Request is not pending');
  }

  // Update request status
  request.status = 'rejected';
  await request.save();

  // Notify student
  try {
    await notificationService.createNotification(
      request.student.userId,
      'room_request_rejected',
      'تم رفض طلب الغرفة',
      `تم رفض طلبك للغرفة ${request.room.roomNumber}`,
      request.roomId,
      'room'
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  return request.toJSON();
};

module.exports = {
  createRoomRequest,
  getMatchingRooms,
  getStudentRequests,
  getRoomRequests,
  acceptRoomRequest,
  rejectRoomRequest
};

