const prisma = require('../config/prisma');
const notificationService = require('./notificationService');
const preferenceService = require('./preferenceService');
const roomService = require('./roomService');

// Create a room request
const createRoomRequest = async (studentId, roomId, notes = null) => {
  const sId = parseInt(studentId);
  const rId = parseInt(roomId);

  const student = await prisma.student.findUnique({ where: { id: sId } });
  if (!student) throw new Error('Student not found');

  const room = await prisma.room.findUnique({ where: { id: rId } });
  if (!room) throw new Error('Room not found');
  if (room.availableBeds <= 0) throw new Error('Room has no available beds');

  const existingRequest = await prisma.roomRequest.findFirst({
    where: { studentId: sId, roomId: rId, status: 'pending' }
  });
  if (existingRequest) throw new Error('You already have a pending request for this room');

  const existingAssignment = await prisma.roomStudent.findFirst({
    where: { studentId: sId, roomId: rId, isActive: true }
  });
  if (existingAssignment) throw new Error('You are already assigned to this room');

  const request = await prisma.roomRequest.create({
    data: {
      studentId: sId,
      roomId: rId,
      status: 'pending',
      notes: notes || null
    },
    include: {
      room: {
        include: {
          services: {
            include: {
              service: {
                select: { id: true, name: true, description: true, icon: true }
              }
            }
          },
          buildingInfo: { select: { id: true, name: true, address: true } }
        }
      },
      student: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          college: { select: { id: true, name: true } }
        }
      }
    }
  });

  try {
    await notificationService.createNotificationForAdmins('room_request', 'New Room Request', `Student ${student.name} has requested room ${room.roomNumber}`, rId, 'room');
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  // Flatten services
  if (request && request.room && request.room.services) {
    request.room.services = request.room.services.map(rs => rs.service);
  }

  return request;
};

// Get rooms matching student preferences
const getMatchingRooms = async (userId, page = 1, limit = 10) => {
  const uId = parseInt(userId);
  const user = await prisma.user.findUnique({
    where: { id: uId },
    include: { student: true }
  });

  if (!user || !user.student) throw new Error('Student not found');
  const student = user.student;

  const preferences = await preferenceService.getPreferences(uId);
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    status: { in: ['available', 'occupied'] }
  };
  if (preferences.roomType) where.roomType = preferences.roomType;

  let rooms = await prisma.room.findMany({
    where,
    include: {
      services: {
        include: {
          service: {
            select: { id: true, name: true, description: true, icon: true }
          }
        }
      },
      buildingInfo: { select: { id: true, name: true, address: true } },
      roomStudents: { where: { isActive: true }, select: { id: true } }
    },
    orderBy: { roomNumber: 'asc' },
    skip,
    take
  });

  // Filter rooms by service preferences
  if (preferences.preferredServices && preferences.preferredServices.length > 0) {
    rooms = rooms.filter(room => {
      const roomServiceIds = room.services.map(rs => rs.service.id);
      return preferences.preferredServices.some(p => roomServiceIds.includes(p));
    });
  }

  const studentAssignments = await prisma.roomStudent.findMany({
    where: { studentId: student.id, isActive: true },
    select: { roomId: true }
  });
  const excludedRoomIds = studentAssignments.map(a => a.roomId);

  const studentRequests = await prisma.roomRequest.findMany({
    where: { studentId: student.id, roomId: { in: rooms.map(r => r.id) } }
  });

  const requestMap = {};
  studentRequests.forEach(req => { requestMap[req.roomId] = req.status; });

  const formattedRooms = rooms
    .filter(room => !excludedRoomIds.includes(room.id))
    .map(room => {
      const roomData = { ...room };
      roomData.services = room.services ? room.services.map(rs => rs.service) : [];
      return {
        ...roomData,
        occupiedBeds: room.roomStudents.length,
        hasPendingRequest: requestMap[room.id] === 'pending',
        requestStatus: requestMap[room.id] || null
      };
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
  const sId = parseInt(studentId);
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [requests, count] = await Promise.all([
    prisma.roomRequest.findMany({
      where: { studentId: sId },
      include: {
        room: {
          include: {
            services: {
              include: {
                service: {
                  select: { id: true, name: true, description: true, icon: true }
                }
              }
            },
            buildingInfo: { select: { id: true, name: true, address: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    prisma.roomRequest.count({ where: { studentId: sId } })
  ]);

  const processedRequests = requests.map(req => {
    const data = { ...req };
    if (data.room && data.room.services) {
      data.room.services = data.room.services.map(rs => rs.service);
    }
    return data;
  });

  return {
    requests: processedRequests,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  };
};

// Get room requests
const getRoomRequests = async (roomId, page = 1, limit = 10) => {
  const rId = parseInt(roomId);
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [requests, count] = await Promise.all([
    prisma.roomRequest.findMany({
      where: { roomId: rId },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            college: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    prisma.roomRequest.count({ where: { roomId: rId } })
  ]);

  return {
    requests,
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
  const rId = parseInt(requestId);
  const request = await prisma.roomRequest.findUnique({
    where: { id: rId },
    include: {
      room: true,
      student: { include: { user: { select: { id: true, name: true, email: true } } } }
    }
  });

  if (!request) throw new Error('Request not found');
  if (request.status !== 'pending') throw new Error('Request is not pending');
  if (request.room.availableBeds <= 0) throw new Error('Room has no available beds');

  const existingAssignment = await prisma.roomStudent.findFirst({
    where: { studentId: request.studentId, isActive: true }
  });

  if (existingAssignment) {
    await prisma.$transaction(async (tx) => {
      await tx.roomStudent.update({
        where: { id: existingAssignment.id },
        data: { isActive: false, checkOutDate: new Date() }
      });
      await tx.room.update({
        where: { id: existingAssignment.roomId },
        data: {
          availableBeds: { increment: 1 },
          status: 'available' // Simplification
        }
      });
    });
  }

  await roomService.assignStudentToRoom(request.roomId, request.studentId, new Date(), { forceCheckout: true });

  await prisma.roomRequest.update({
    where: { id: rId },
    data: { status: 'accepted' }
  });

  await prisma.roomRequest.updateMany({
    where: { studentId: request.studentId, status: 'pending', NOT: { id: rId } },
    data: { status: 'rejected' }
  });

  try {
    await notificationService.createNotification(request.student.userId, 'room_request_accepted', 'Room Request Approved', `Your request for room ${request.room.roomNumber} has been approved`, request.roomId, 'room');
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  return request;
};

// Reject a room request
const rejectRoomRequest = async (requestId) => {
  const rId = parseInt(requestId);
  const request = await prisma.roomRequest.findUnique({
    where: { id: rId },
    include: {
      room: true,
      student: { include: { user: { select: { id: true, name: true, email: true } } } }
    }
  });

  if (!request) throw new Error('Request not found');
  if (request.status !== 'pending') throw new Error('Request is not pending');

  const updatedRequest = await prisma.roomRequest.update({
    where: { id: rId },
    data: { status: 'rejected' }
  });

  try {
    await notificationService.createNotification(request.student.userId, 'room_request_rejected', 'Room Request Rejected', `Your request for room ${request.room.roomNumber} has been rejected`, request.roomId, 'room');
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  return updatedRequest;
};

module.exports = {
  createRoomRequest,
  getMatchingRooms,
  getStudentRequests,
  getRoomRequests,
  acceptRoomRequest,
  rejectRoomRequest
};
