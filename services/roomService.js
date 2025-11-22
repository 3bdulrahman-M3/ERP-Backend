const { Room, Student, RoomStudent } = require('../models');

// Create room
const createRoom = async (roomData) => {
  const { roomNumber, floor, building, totalBeds, description, status, roomType, roomPrice, bedPrice } = roomData;

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
    building: building || null,
    totalBeds,
    availableBeds: totalBeds, // Initially all beds are available
    status: status || 'available',
    roomType: roomType || 'shared',
    roomPrice: roomPrice || null,
    bedPrice: bedPrice || null,
    description: description || null
  });

  return room.toJSON();
};

// Get all rooms
const getAllRooms = async (page = 1, limit = 10, filters = {}) => {
  const offset = (page - 1) * limit;
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.building) {
    where.building = filters.building;
  }
  if (filters.floor !== undefined) {
    where.floor = filters.floor;
  }

  const { count, rows } = await Room.findAndCountAll({
    where,
    include: [{
      model: RoomStudent,
      as: 'roomStudents',
      where: { isActive: true },
      required: false,
      include: [{
        model: Student,
        as: 'student',
        attributes: ['id', 'name', 'email', 'college'],
        include: [{
          model: require('./../models').User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role']
        }]
      }]
    }],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['roomNumber', 'ASC']]
  });

  return {
    rooms: rows.map(room => {
      const roomData = room.toJSON();
      roomData.occupiedBeds = roomData.roomStudents ? roomData.roomStudents.length : 0;
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
    include: [{
      model: RoomStudent,
      as: 'roomStudents',
      where: { isActive: true },
      required: false,
      include: [{
        model: Student,
        as: 'student',
        attributes: ['id', 'name', 'email', 'college', 'phoneNumber'],
        include: [{
          model: require('./../models').User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role']
        }]
      }]
    }]
  });

  if (!room) {
    throw new Error('Room not found');
  }

  const roomData = room.toJSON();
  roomData.occupiedBeds = roomData.roomStudents ? roomData.roomStudents.length : 0;
  return roomData;
};

// Update room
const updateRoom = async (id, roomData) => {
  const room = await Room.findByPk(id);

  if (!room) {
    throw new Error('Room not found');
  }

  const { roomNumber, floor, building, totalBeds, description, status, roomType, roomPrice, bedPrice } = roomData;

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
  if (building !== undefined) room.building = building;
  if (description !== undefined) room.description = description;
  if (status !== undefined) room.status = status;
  if (roomPrice !== undefined) room.roomPrice = roomPrice;
  if (bedPrice !== undefined) room.bedPrice = bedPrice;

  await room.save();

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

  return room.toJSON();
};

// Delete room
const deleteRoom = async (id) => {
  const room = await Room.findByPk(id, {
    include: [{
      model: RoomStudent,
      as: 'roomStudents',
      where: { isActive: true }
    }]
  });

  if (!room) {
    throw new Error('Room not found');
  }

  // Check if room has active students
  if (room.roomStudents && room.roomStudents.length > 0) {
    throw new Error('Cannot delete room with active students. Please check out all students first.');
  }

  await room.destroy();
  return { message: 'Room deleted successfully' };
};

// Assign student to room
const assignStudentToRoom = async (roomId, studentId, checkInDate, paid = false) => {
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
    throw new Error('Student is already assigned to a room. Please check out first.');
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
    isActive: true,
    paid: paid || false
  });

  // Update room available beds
  room.availableBeds -= 1;
  if (room.availableBeds === 0) {
    room.status = 'reserved'; // Room is fully occupied, mark as reserved
  } else if (room.availableBeds < room.totalBeds) {
    room.status = 'occupied'; // Room is partially occupied
  }
  await room.save();

  // Reload with relations
  await assignment.reload({
    include: [
      { model: Room, as: 'room' },
      { model: Student, as: 'student', include: [{ model: require('./../models').User, as: 'user', attributes: ['id', 'name', 'email'] }] }
    ]
  });

  return assignment.toJSON();
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
      { model: Room, as: 'room' },
      { model: Student, as: 'student' }
    ]
  });

  if (!assignment) {
    return null;
  }

  return assignment.toJSON();
};

// Get room students (all students in a room)
const getRoomStudents = async (roomId, includeInactive = false) => {
  const where = { roomId };
  if (!includeInactive) {
    where.isActive = true;
  }

  const assignments = await RoomStudent.findAll({
    where,
    include: [{
      model: Student,
      as: 'student',
      attributes: ['id', 'name', 'email', 'college', 'phoneNumber'],
      include: [{
        model: require('./../models').User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role']
      }]
    }],
    order: [['checkInDate', 'DESC']]
  });

  return assignments.map(a => a.toJSON());
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

