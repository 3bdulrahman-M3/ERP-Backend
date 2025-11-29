const { Room, Student, RoomStudent, College, User, Service, Building, RoomRequest, Payment } = require('../models');
const { calculatePaymentStatus } = require('./paymentService');

const getDefaultAmountDue = (room) => {
  if (!room) {
    return 0;
  }

  if (room.roomType === 'single' && room.roomPrice) {
    return Number(room.roomPrice);
  }

  if (room.roomType === 'shared' && room.bedPrice) {
    return Number(room.bedPrice);
  }

  return Number(room.roomPrice || room.bedPrice || 0);
};

const createPaymentForAssignment = async (assignment, room, paymentDetails = {}) => {
  const amountDue = paymentDetails.amountDue !== undefined
    ? Number(paymentDetails.amountDue)
    : getDefaultAmountDue(room);

  const amountPaid = paymentDetails.amountPaid !== undefined
    ? Number(paymentDetails.amountPaid)
    : 0;

  const remainingAmount = Math.max(amountDue - amountPaid, 0);
  const status = paymentDetails.status || calculatePaymentStatus(amountDue, amountPaid);

  return Payment.create({
    roomId: assignment.roomId,
    studentId: assignment.studentId,
    roomStudentId: assignment.id,
    amountDue,
    amountPaid,
    remainingAmount,
    status,
    paymentMethod: paymentDetails.paymentMethod || 'cash',
    paymentDate: paymentDetails.paymentDate || new Date(),
    notes: paymentDetails.notes || null
  });
};

const checkOutAssignment = async (assignment, checkOutDate = new Date()) => {
  assignment.isActive = false;
  assignment.checkOutDate = checkOutDate;
  await assignment.save();

  const oldRoom = await Room.findByPk(assignment.roomId);
  if (oldRoom) {
    oldRoom.availableBeds = (oldRoom.availableBeds || 0) + 1;
    if (oldRoom.availableBeds === oldRoom.totalBeds) {
      oldRoom.status = 'available';
    } else if (oldRoom.availableBeds > 0) {
      oldRoom.status = 'occupied';
    }
    await oldRoom.save();
  }
};
const { Op } = require('sequelize');
const notificationService = require('./notificationService');
const preferenceService = require('./preferenceService');

// Create room
const createRoom = async (roomData) => {
  let { roomNumber, floor, buildingId, totalBeds, description, status, roomType, roomPrice, bedPrice, serviceIds } = roomData;

  // Auto-generate room number if not provided
  if (!roomNumber) {
    // Get all rooms and find the highest numeric room number
    const allRooms = await Room.findAll({
      attributes: ['roomNumber']
    });

    let maxNumber = 0;
    for (const room of allRooms) {
      // Try to parse room number as integer
      const num = parseInt(room.roomNumber, 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
    
    // Generate next room number (starts from 1 if no numeric rooms exist)
    roomNumber = String(maxNumber + 1);
  }

  // Check if room number already exists
  const existingRoom = await Room.findOne({ where: { roomNumber } });
  if (existingRoom) {
    throw new Error('Room number already exists');
  }

  // Validate room type and prices
  if (roomType === 'single' && !roomPrice) {
    throw new Error('Room price is required for single rooms');
  }
  if (roomType === 'shared' && !bedPrice) {
    throw new Error('Bed price is required for shared rooms');
  }
  if (roomType === 'single' && totalBeds !== 1) {
    throw new Error('Single rooms must have exactly 1 bed');
  }

  // Create room
  const room = await Room.create({
    roomNumber,
    floor: floor || null,
    buildingId: buildingId || null,
    totalBeds,
    availableBeds: totalBeds, // Initially all beds are available
    status: status || 'available',
    roomType: roomType || 'shared',
    roomPrice: roomPrice || null,
    bedPrice: bedPrice || null,
    description: description || null
  });

  // Update building room count if buildingId is provided
  if (buildingId) {
    const building = await Building.findByPk(buildingId);
    if (building) {
      building.roomCount = (building.roomCount || 0) + 1;
      await building.save();
    }
  }

  // Add services if provided
  if (serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0) {
    await room.setServices(serviceIds);
  }

  // Reload with services and building
  await room.reload({
    include: [
      {
        model: Service,
        as: 'services',
        attributes: ['id', 'name', 'description', 'icon']
      },
      {
        model: Building,
        as: 'buildingInfo',
        attributes: ['id', 'name', 'address']
      }
    ]
  });

  // Create notification for admins
  try {
    await notificationService.createNotificationForAdmins(
      'room_created',
      'غرفة جديدة',
      `تم إضافة غرفة جديدة: ${roomNumber}`,
      room.id,
      'room'
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  // Notify students with matching preferences
  try {
    const roomServiceIds = room.services ? room.services.map(s => s.id) : [];
    const { Service } = require('../models');
    
    // Get service names for the notification message
    const roomServices = await Service.findAll({
      where: { id: roomServiceIds },
      attributes: ['id', 'name']
    });
    const serviceNames = roomServices.map(s => s.name).join('، ');

    const matchingUserIds = await preferenceService.getStudentsWithMatchingPreferences(
      room.roomType,
      roomServiceIds
    );

    // Send notification to each matching student with details about matching services
    for (const userId of matchingUserIds) {
      // Get student's preferences to find which services matched
      const { User, Preference } = require('../models');
      const user = await User.findByPk(userId, {
        include: [{ model: Preference, as: 'preference' }]
      });

      if (user && user.preference) {
        const matchingServices = roomServices.filter(s => 
          user.preference.preferredServices.includes(s.id)
        );
        const matchingServiceNames = matchingServices.map(s => s.name).join('، ');

        let message = `تم إنشاء غرفة جديدة (${roomNumber})`;
        if (matchingServiceNames) {
          message += ` تحتوي على: ${matchingServiceNames}`;
        }
        if (room.roomType && user.preference.roomType === room.roomType) {
          message += ` - نوع الغرفة: ${room.roomType === 'single' ? 'فردية' : 'جماعية'}`;
        }

        await notificationService.createNotification(
          userId,
          'room_match_preferences',
          'غرفة جديدة تطابق تفضيلاتك',
          message,
          room.id,
          'room'
        );
      }
    }
  } catch (error) {
    console.error('Error notifying students with matching preferences:', error);
  }

  return room.toJSON();
};

// Get all rooms
const getAllRooms = async (page = 1, limit = 10, filters = {}) => {
  const offset = (page - 1) * limit;
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.buildingId !== undefined) {
    where.buildingId = filters.buildingId;
  }
  if (filters.floor !== undefined) {
    where.floor = filters.floor;
  }

  const { count, rows } = await Room.findAndCountAll({
    where,
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
      include: [{
        model: Student,
        as: 'student',
        attributes: ['id', 'name', 'email', 'age', 'phoneNumber'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'role']
          },
          {
            model: College,
            as: 'college',
            attributes: ['id', 'name'],
            required: false
          }
        ]
      }]
    }],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['roomNumber', 'ASC']]
  });

  // Get pending requests count for each room
  const roomIds = rows.map(r => r.id);
  const pendingRequests = await RoomRequest.findAll({
    where: {
      roomId: { [Op.in]: roomIds },
      status: 'pending'
    },
    attributes: ['roomId']
  });

  const requestsMap = {};
  pendingRequests.forEach(req => {
    requestsMap[req.roomId] = (requestsMap[req.roomId] || 0) + 1;
  });

  return {
    rooms: rows.map(room => {
      const roomData = room.toJSON();
      roomData.occupiedBeds = roomData.roomStudents ? roomData.roomStudents.length : 0;
      roomData.pendingRequestsCount = requestsMap[room.id] || 0;
      return roomData;
    }),
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  };
};

// Get room by ID
const getRoomById = async (id) => {
  const room = await Room.findByPk(id, {
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
        attributes: ['id', 'name', 'address', 'mapUrl', 'floors'],
        required: false
      },
      {
        model: RoomStudent,
        as: 'roomStudents',
        where: { isActive: true },
        required: false,
        include: [
          {
            model: Student,
            as: 'student',
            attributes: ['id', 'name', 'email', 'age', 'phoneNumber'],
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email', 'role']
              },
              {
                model: College,
                as: 'college',
                attributes: ['id', 'name'],
                required: false
              }
            ]
          },
          {
            model: Payment,
            as: 'payments'
          }
        ]
      },
      {
        model: RoomRequest,
        as: 'requests',
        where: { status: 'pending' },
        required: false,
        include: [{
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'email', 'age', 'phoneNumber'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'role']
            },
            {
              model: College,
              as: 'college',
              attributes: ['id', 'name'],
              required: false
            }
          ]
        }]
      }
    ]
  });

  if (!room) {
    throw new Error('Room not found');
  }

  const roomData = room.toJSON();
  roomData.occupiedBeds = roomData.roomStudents ? roomData.roomStudents.length : 0;

  if (roomData.roomStudents) {
    roomData.roomStudents = roomData.roomStudents.map((studentAssignment) => {
      const assignment = { ...studentAssignment };
      assignment.payment = assignment.payments && assignment.payments.length > 0 ? assignment.payments[0] : null;
      return assignment;
    });
  }

  return roomData;
};

// Update room
const updateRoom = async (id, roomData) => {
  const room = await Room.findByPk(id);

  if (!room) {
    throw new Error('Room not found');
  }

  const { roomNumber, floor, buildingId, totalBeds, description, status, roomType, roomPrice, bedPrice, serviceIds } = roomData;

  // Check if room number is being changed and if it's already taken
  if (roomNumber && roomNumber !== room.roomNumber) {
    const existingRoom = await Room.findOne({ where: { roomNumber } });
    if (existingRoom) {
      throw new Error('Room number already exists');
    }
    room.roomNumber = roomNumber;
  }

  // Update total beds and recalculate available beds
  if (totalBeds !== undefined) {
    const currentOccupied = room.totalBeds - room.availableBeds;
    room.totalBeds = totalBeds;
    room.availableBeds = Math.max(0, totalBeds - currentOccupied);
  }

  // Validate and update room type and prices
  if (roomType !== undefined) {
    if (roomType === 'single' && totalBeds !== undefined && totalBeds !== 1) {
      throw new Error('Single rooms must have exactly 1 bed');
    }
    if (roomType === 'single' && !roomPrice && !room.roomPrice) {
      throw new Error('Room price is required for single rooms');
    }
    if (roomType === 'shared' && !bedPrice && !room.bedPrice) {
      throw new Error('Bed price is required for shared rooms');
    }
    room.roomType = roomType;
  }

  if (floor !== undefined) room.floor = floor;
  if (buildingId !== undefined) {
    // Update building room counts if building is changed
    if (room.buildingId && room.buildingId !== buildingId) {
      const oldBuilding = await Building.findByPk(room.buildingId);
      if (oldBuilding) {
        oldBuilding.roomCount = Math.max(0, (oldBuilding.roomCount || 0) - 1);
        await oldBuilding.save();
      }
    }
    if (buildingId) {
      const newBuilding = await Building.findByPk(buildingId);
      if (newBuilding) {
        newBuilding.roomCount = (newBuilding.roomCount || 0) + 1;
        await newBuilding.save();
      }
    }
    room.buildingId = buildingId;
  }
  if (description !== undefined) room.description = description;
  if (status !== undefined) room.status = status;
  if (roomPrice !== undefined) room.roomPrice = roomPrice;
  if (bedPrice !== undefined) room.bedPrice = bedPrice;

  await room.save();

  // Update services if provided
  if (serviceIds !== undefined) {
    if (Array.isArray(serviceIds)) {
      await room.setServices(serviceIds);
    } else {
      await room.setServices([]);
    }
  }

  // Update status based on available beds
  if (room.availableBeds === 0) {
    room.status = 'reserved'; // Room is fully occupied, mark as reserved
  } else if (room.availableBeds < room.totalBeds) {
    room.status = 'occupied'; // Room is partially occupied
  } else if (room.availableBeds === room.totalBeds) {
    if (room.status === 'reserved' || room.status === 'occupied') {
      room.status = 'available'; // Room is now fully available
    }
  }
  await room.save();

  // Reload with services and building
  await room.reload({
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
  });

  return room.toJSON();
};

// Delete room
const deleteRoom = async (id) => {
  const room = await Room.findByPk(id);

  if (!room) {
    throw new Error('Room not found');
  }

  // Check if room has active students
  const activeStudents = await RoomStudent.findAll({
    where: {
      roomId: id,
      isActive: true
    }
  });

  if (activeStudents && activeStudents.length > 0) {
    throw new Error('Cannot delete room with active students. Please check out all students first.');
  }

  // Update building room count if room has a building
  if (room.buildingId) {
    const building = await Building.findByPk(room.buildingId);
    if (building) {
      building.roomCount = Math.max(0, (building.roomCount || 0) - 1);
      await building.save();
    }
  }

  await room.destroy();
  return { message: 'Room deleted successfully' };
};

// Assign student to room
const assignStudentToRoom = async (roomId, studentId, checkInDate, options = {}) => {
  const { payment: paymentDetails = {}, forceCheckout = false } = options || {};

  // Check if room exists
  const room = await Room.findByPk(roomId);
  if (!room) {
    throw new Error('Room not found');
  }

  // Check if student exists
  const student = await Student.findByPk(studentId);
  if (!student) {
    throw new Error('Student not found');
  }

  // Check if room has available beds
  if (room.availableBeds <= 0) {
    throw new Error('Room is full. No available beds.');
  }

  // Check if student already has an active room assignment
  const existingAssignment = await RoomStudent.findOne({
    where: {
      studentId,
      isActive: true
    }
  });

  if (existingAssignment) {
    if (!forceCheckout) {
      throw new Error('Student is already assigned to a room. Please check out first.');
    }

    await checkOutAssignment(existingAssignment, checkInDate || new Date());
  }

  // Check if room status allows assignment
  if (room.status === 'maintenance') {
    throw new Error('Room is under maintenance. Cannot assign students.');
  }

  // Create room assignment
  const assignment = await RoomStudent.create({
    roomId,
    studentId,
    checkInDate: checkInDate || new Date(),
    isActive: true
  });

  // Update room available beds
  room.availableBeds -= 1;
  if (room.availableBeds === 0) {
    room.status = 'reserved'; // Room is fully occupied, mark as reserved
  } else if (room.availableBeds < room.totalBeds) {
    room.status = 'occupied'; // Room is partially occupied
  }
  await room.save();

  await createPaymentForAssignment(assignment, room, paymentDetails);

  await assignment.reload({
    include: [
      { model: Room, as: 'room' },
      {
        model: Student,
        as: 'student',
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
          { model: College, as: 'college', attributes: ['id', 'name'], required: false }
        ]
      },
      {
        model: Payment,
        as: 'payments'
      }
    ]
  });

  const assignmentData = assignment.toJSON();
  assignmentData.payment = assignmentData.payments && assignmentData.payments.length > 0
    ? assignmentData.payments[0]
    : null;
  return assignmentData;
};

// Check out student from room
const checkOutStudentFromRoom = async (studentId, checkOutDate) => {
  // Find active assignment
  const assignment = await RoomStudent.findOne({
    where: {
      studentId,
      isActive: true
    },
    include: [{ model: Room, as: 'room' }]
  });

  if (!assignment) {
    throw new Error('Student is not assigned to any room');
  }

  // Update assignment
  assignment.isActive = false;
  assignment.checkOutDate = checkOutDate || new Date();
  await assignment.save();

  // Update room available beds
  const room = await Room.findByPk(assignment.roomId);
  room.availableBeds += 1;
  
  if (room.availableBeds === room.totalBeds) {
    room.status = 'available'; // Room is now fully available
  } else if (room.availableBeds > 0) {
    room.status = 'occupied'; // Room is partially occupied
  }
  await room.save();

  return { message: 'Student checked out successfully', assignment: assignment.toJSON() };
};

// Get student's current room
const getStudentRoom = async (studentId) => {
  const assignment = await RoomStudent.findOne({
    where: {
      studentId,
      isActive: true
    },
    include: [
      { 
        model: Room, 
        as: 'room',
        include: [
          {
            model: Building,
            as: 'buildingInfo',
            attributes: ['id', 'name', 'address', 'mapUrl', 'floors'],
            required: false
          },
          {
            model: RoomStudent,
            as: 'roomStudents',
            where: { isActive: true },
            required: false,
            include: [
              {
                model: Student,
                as: 'student',
                attributes: ['id', 'name', 'email', 'profileImage', 'year'],
                include: [
                  {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'profileImage']
                  },
                  {
                    model: College,
                    as: 'college',
                    attributes: ['id', 'name'],
                    required: false
                  }
                ]
              },
              {
                model: Payment,
                as: 'payments'
              }
            ]
          }
        ]
      },
      { model: Student, as: 'student' },
      { model: Payment, as: 'payments' }
    ]
  });

  if (!assignment) {
    return null;
  }

  const assignmentData = assignment.toJSON();
  assignmentData.payment = assignmentData.payments && assignmentData.payments.length > 0
    ? assignmentData.payments[0]
    : null;
  
  // Get all roommates (excluding current student)
  if (assignmentData.room && assignmentData.room.roomStudents) {
    assignmentData.roommates = assignmentData.room.roomStudents
      .filter(rs => rs.student && rs.student.id !== studentId)
      .map(rs => {
        const roommate = { ...rs.student };
        roommate.payment = rs.payments && rs.payments.length > 0 ? rs.payments[0] : null;
        return roommate;
      });
  } else {
    assignmentData.roommates = [];
  }

  return assignmentData;
};

// Get room students (all students in a room)
const getRoomStudents = async (roomId, includeInactive = false) => {
  const where = { roomId };
  if (!includeInactive) {
    where.isActive = true;
  }

  const assignments = await RoomStudent.findAll({
    where,
    include: [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'name', 'email', 'age', 'phoneNumber', 'collegeId'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'role']
          },
          {
            model: College,
            as: 'college',
            attributes: ['id', 'name'],
            required: false
          }
        ]
      },
      {
        model: Payment,
        as: 'payments'
      }
    ],
    order: [['checkInDate', 'DESC']]
  });

  return assignments.map(assignment => {
    const data = assignment.toJSON();
    data.payment = data.payments && data.payments.length > 0 ? data.payments[0] : null;
    return data;
  });
};

module.exports = {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  assignStudentToRoom,
  checkOutStudentFromRoom,
  getStudentRoom,
  getRoomStudents
};

