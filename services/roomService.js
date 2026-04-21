const prisma = require('../config/prisma');
const { calculatePaymentStatus } = require('./paymentService');
const notificationService = require('./notificationService');
const preferenceService = require('./preferenceService');

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

  return await prisma.payment.create({
    data: {
      roomId: assignment.roomId,
      studentId: assignment.studentId,
      roomStudentId: assignment.id,
      amountDue,
      amountPaid,
      remainingAmount,
      status,
      paymentMethod: paymentDetails.paymentMethod || 'cash',
      paymentDate: paymentDetails.paymentDate ? new Date(paymentDetails.paymentDate) : new Date(),
      notes: paymentDetails.notes || null
    }
  });
};

const checkOutAssignment = async (assignment, checkOutDate = new Date()) => {
  return await prisma.$transaction(async (tx) => {
    // Update assignment
    await tx.roomStudent.update({
      where: { id: assignment.id },
      data: {
        isActive: false,
        checkOutDate: checkOutDate
      }
    });

    // Update room
    const room = await tx.room.findUnique({
      where: { id: assignment.roomId }
    });

    if (room) {
      const newAvailableBeds = (room.availableBeds || 0) + 1;
      let newStatus = room.status;
      
      if (newAvailableBeds === room.totalBeds) {
        newStatus = 'available';
      } else if (newAvailableBeds > 0) {
        newStatus = 'occupied';
      }

      await tx.room.update({
        where: { id: room.id },
        data: {
          availableBeds: newAvailableBeds,
          status: newStatus
        }
      });
    }
  });
};

// Create room
const createRoom = async (roomData) => {
  let { roomNumber, floor, buildingId, totalBeds, description, status, roomType, roomPrice, bedPrice, serviceIds, images } = roomData;

  // Auto-generate room number if not provided
  if (!roomNumber) {
    const allRooms = await prisma.room.findMany({
      select: { roomNumber: true }
    });

    let maxNumber = 0;
    for (const room of allRooms) {
      const num = parseInt(room.roomNumber, 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
    roomNumber = String(maxNumber + 1);
  }

  // Check if room number already exists
  const existingRoom = await prisma.room.findUnique({ where: { roomNumber } });
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
  if (roomType === 'single' && parseInt(totalBeds) !== 1) {
    throw new Error('Single rooms must have exactly 1 bed');
  }

  const bId = buildingId ? parseInt(buildingId) : null;
  const tBeds = parseInt(totalBeds);

  // Create room in transaction to update building count
  const room = await prisma.$transaction(async (tx) => {
    const newRoom = await tx.room.create({
      data: {
        roomNumber,
        floor: floor ? parseInt(floor) : null,
        buildingId: bId,
        totalBeds: tBeds,
        availableBeds: tBeds,
        status: status || 'available',
        roomType: roomType || 'shared',
        roomPrice: roomPrice || null,
        bedPrice: bedPrice || null,
        description: description || null,
        images: images && Array.isArray(images) ? JSON.stringify(images) : null,
        services: {
          create: serviceIds && Array.isArray(serviceIds) ? serviceIds.map(sId => ({
            service: { connect: { id: parseInt(sId) } }
          })) : []
        }
      },
      include: {
        services: {
          include: {
            service: {
              select: { id: true, name: true, description: true, icon: true }
            }
          }
        },
        buildingInfo: {
          select: { id: true, name: true, address: true }
        }
      }
    });

    if (bId) {
      const building = await tx.building.findUnique({ where: { id: bId } });
      if (building) {
        await tx.building.update({
          where: { id: bId },
          data: { roomCount: (building.roomCount || 0) + 1 }
        });
      }
    }

    return newRoom;
  });

  // Create notification for admins
  try {
    await notificationService.createNotificationForAdmins(
      'room_created',
      'New Room',
      `A new room has been added: ${roomNumber}`,
      room.id,
      'room'
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  // Notify students with matching preferences
  try {
    const roomServiceIds = room.services ? room.services.map(s => s.id) : [];
    const matchingUserIds = await preferenceService.getStudentsWithMatchingPreferences(
      room.roomType,
      roomServiceIds
    );

    for (const userId of matchingUserIds) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { preference: true }
      });

      if (user && user.preference) {
        const matchingServiceNames = room.services
          .filter(s => user.preference.preferredServices.includes(s.id))
          .map(s => s.name)
          .join(', ');

        let message = `A new room has been created (${roomNumber})`;
        if (matchingServiceNames) {
          message += ` containing: ${matchingServiceNames}`;
        }
        if (room.roomType && user.preference.roomType === room.roomType) {
          message += ` - Room type: ${room.roomType === 'single' ? 'Single' : 'Shared'}`;
        }

        await notificationService.createNotification(
          userId,
          'room_match_preferences',
          'New Room Matches Your Preferences',
          message,
          room.id,
          'room'
        );
      }
    }
  } catch (error) {
    console.error('Error notifying students with matching preferences:', error);
  }

  // Flatten services
  if (room && room.services) {
    room.services = room.services.map(rs => rs.service);
  }
  
  return room;
};

// Get all rooms
const getAllRooms = async (page = 1, limit = 10, filters = {}) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.buildingId !== undefined) {
    where.buildingId = parseInt(filters.buildingId);
  }
  if (filters.floor !== undefined) {
    where.floor = parseInt(filters.floor);
  }

  const [rooms, count] = await Promise.all([
    prisma.room.findMany({
      where,
      skip,
      take,
      orderBy: { roomNumber: 'asc' },
      include: {
        services: {
          include: {
            service: {
              select: { id: true, name: true, description: true, icon: true }
            }
          }
        },
        buildingInfo: {
          select: { id: true, name: true, address: true }
        },
        roomStudents: {
          where: { isActive: true },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                age: true,
                phoneNumber: true,
                user: { select: { id: true, name: true, email: true, role: true } },
                college: { select: { id: true, name: true } }
              }
            }
          }
        }
      }
    }),
    prisma.room.count({ where })
  ]);

  // Get pending requests count for each room
  const roomIds = rooms.map(r => r.id);
  const pendingRequests = await prisma.roomRequest.groupBy({
    by: ['roomId'],
    where: {
      roomId: { in: roomIds },
      status: 'pending'
    },
    _count: {
      id: true
    }
  });

  const requestsMap = {};
  pendingRequests.forEach(req => {
    requestsMap[req.roomId] = req._count.id;
  });

  return {
    rooms: rooms.map(room => {
      const roomData = { ...room };
      roomData.services = room.services ? room.services.map(rs => rs.service) : [];
      roomData.occupiedBeds = room.roomStudents ? room.roomStudents.length : 0;
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
  const roomId = parseInt(id);
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      services: {
        include: {
          service: {
            select: { id: true, name: true, description: true, icon: true }
          }
        }
      },
      buildingInfo: {
        select: { id: true, name: true, address: true, mapUrl: true, floors: true }
      },
      roomStudents: {
        where: { isActive: true },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              age: true,
              phoneNumber: true,
              user: { select: { id: true, name: true, email: true, role: true } },
              college: { select: { id: true, name: true } }
            }
          },
          payments: true
        }
      },
      roomRequests: {
        where: { status: 'pending' },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              age: true,
              phoneNumber: true,
              user: { select: { id: true, name: true, email: true, role: true } },
              college: { select: { id: true, name: true } }
            }
          }
        }
      }
    }
  });

  if (!room) {
    throw new Error('Room not found');
  }

  const roomData = { ...room };
  roomData.services = room.services ? room.services.map(rs => rs.service) : [];
  roomData.occupiedBeds = room.roomStudents ? room.roomStudents.length : 0;
  roomData.requests = room.roomRequests || [];
  delete roomData.roomRequests;

  if (roomData.roomStudents) {
    roomData.roomStudents = roomData.roomStudents.map((assignment) => {
      const data = { ...assignment };
      data.payment = assignment.payments && assignment.payments.length > 0 ? assignment.payments[0] : null;
      return data;
    });
  }

  return roomData;
};

// Update room
const updateRoom = async (id, roomData) => {
  const roomId = parseInt(id);
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { services: true }
  });

  if (!room) {
    throw new Error('Room not found');
  }

  const { roomNumber, floor, buildingId, totalBeds, description, status, roomType, roomPrice, bedPrice, serviceIds, images } = roomData;

  const updateData = {};
  
  if (roomNumber && roomNumber !== room.roomNumber) {
    const existingRoom = await prisma.room.findUnique({ where: { roomNumber } });
    if (existingRoom) {
      throw new Error('Room number already exists');
    }
    updateData.roomNumber = roomNumber;
  }

  if (totalBeds !== undefined) {
    const currentOccupied = room.totalBeds - room.availableBeds;
    const nTotalBeds = parseInt(totalBeds);
    updateData.totalBeds = nTotalBeds;
    updateData.availableBeds = Math.max(0, nTotalBeds - currentOccupied);
    
    // Auto-update status based on beds
    if (updateData.availableBeds === 0) {
      updateData.status = 'reserved';
    } else if (updateData.availableBeds < nTotalBeds) {
      updateData.status = 'occupied';
    } else {
      updateData.status = 'available';
    }
  }

  if (roomType !== undefined) {
    if (roomType === 'single' && (updateData.totalBeds || room.totalBeds) !== 1) {
      throw new Error('Single rooms must have exactly 1 bed');
    }
    updateData.roomType = roomType;
  }

  if (floor !== undefined) updateData.floor = parseInt(floor);
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;
  if (roomPrice !== undefined) updateData.roomPrice = roomPrice;
  if (bedPrice !== undefined) updateData.bedPrice = bedPrice;
  
  if (images !== undefined) {
    updateData.images = (Array.isArray(images) && images.length > 0) ? JSON.stringify(images) : null;
  }

  if (serviceIds !== undefined) {
    updateData.services = {
      deleteMany: {},
      create: Array.isArray(serviceIds) ? serviceIds.map(sId => ({
        service: { connect: { id: parseInt(sId) } }
      })) : []
    };
  }

  const finalRoom = await prisma.$transaction(async (tx) => {
    // Handle building count change
    if (buildingId !== undefined && parseInt(buildingId) !== room.buildingId) {
      const newBId = buildingId ? parseInt(buildingId) : null;
      if (room.buildingId) {
        await tx.building.update({
          where: { id: room.buildingId },
          data: { roomCount: { decrement: 1 } }
        });
      }
      if (newBId) {
        await tx.building.update({
          where: { id: newBId },
          data: { roomCount: { increment: 1 } }
        });
      }
      updateData.buildingId = newBId;
    }

    return await tx.room.update({
      where: { id: roomId },
      data: updateData,
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
    });
  });

  // Flatten services
  if (finalRoom && finalRoom.services) {
    finalRoom.services = finalRoom.services.map(rs => rs.service);
  }

  return finalRoom;
};

// Delete room
const deleteRoom = async (id) => {
  const roomId = parseInt(id);

  const room = await prisma.room.findUnique({
    where: { id: roomId }
  });

  if (!room) {
    throw new Error('Room not found');
  }

  const activeCount = await prisma.roomStudent.count({
    where: { roomId, isActive: true }
  });

  if (activeCount > 0) {
    throw new Error('Cannot delete room with active students. Please check out all students first.');
  }

  await prisma.$transaction(async (tx) => {
    // First, delete all payments associated with the room/assignments
    await tx.payment.deleteMany({
      where: { roomId: roomId }
    });

    // Then delete room students (inactive ones) to avoid foreign key issues
    await tx.roomStudent.deleteMany({
      where: { roomId: roomId }
    });

    if (room.buildingId) {
      await tx.building.update({
        where: { id: room.buildingId },
        data: { roomCount: { decrement: 1 } }
      });
    }

    // Use deleteMany to avoid "record not found" errors if a race condition occurs, 
    // although findUnique above and the transaction should handle it.
    await tx.room.delete({
      where: { id: roomId }
    });
  });

  return { message: 'Room deleted successfully' };
};

// Assign student to room
const assignStudentToRoom = async (roomId, studentId, checkInDate, options = {}) => {
  const { payment: paymentDetails = {}, forceCheckout = false } = options || {};
  const rId = parseInt(roomId);
  const sId = parseInt(studentId);

  const room = await prisma.room.findUnique({ where: { id: rId } });
  if (!room) throw new Error('Room not found');
  if (room.availableBeds <= 0) throw new Error('Room is full. No available beds.');
  if (room.status === 'maintenance') throw new Error('Room is under maintenance. Cannot assign students.');

  const existingAssignment = await prisma.roomStudent.findFirst({
    where: { studentId: sId, isActive: true }
  });

  if (existingAssignment) {
    if (!forceCheckout) throw new Error('Student is already assigned to a room. Please check out first.');
    await checkOutAssignment(existingAssignment, checkInDate || new Date());
  }

  const assignment = await prisma.$transaction(async (tx) => {
    const newAssignment = await tx.roomStudent.create({
      data: {
        roomId: rId,
        studentId: sId,
        checkInDate: checkInDate ? new Date(checkInDate) : new Date(),
        isActive: true
      }
    });

    const newAvailableBeds = room.availableBeds - 1;
    let newStatus = room.status;
    if (newAvailableBeds === 0) newStatus = 'reserved';
    else if (newAvailableBeds < room.totalBeds) newStatus = 'occupied';

    await tx.room.update({
      where: { id: rId },
      data: { availableBeds: newAvailableBeds, status: newStatus }
    });

    return newAssignment;
  });

  await createPaymentForAssignment(assignment, room, paymentDetails);

  const result = await prisma.roomStudent.findUnique({
    where: { id: assignment.id },
    include: {
      room: true,
      student: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          college: { select: { id: true, name: true } }
        }
      },
      payments: true
    }
  });

  const data = { ...result };
  data.payment = result.payments && result.payments.length > 0 ? result.payments[0] : null;
  return data;
};

// Check out student from room
const checkOutStudentFromRoom = async (studentId, checkOutDate) => {
  const sId = parseInt(studentId);
  const assignment = await prisma.roomStudent.findFirst({
    where: { studentId: sId, isActive: true },
    include: { room: true }
  });

  if (!assignment) throw new Error('Student is not assigned to any room');

  await checkOutAssignment(assignment, checkOutDate || new Date());

  return { message: 'Student checked out successfully' };
};

// Get student's current room
const getStudentRoom = async (studentId) => {
  const sId = parseInt(studentId);
  const assignment = await prisma.roomStudent.findFirst({
    where: { studentId: sId, isActive: true },
    include: {
      room: {
        include: {
          buildingInfo: { select: { id: true, name: true, address: true, mapUrl: true, floors: true } },
          roomStudents: {
            where: { isActive: true },
            include: {
              student: {
                select: { id: true, name: true, email: true, profileImage: true, year: true, user: { select: { id: true, name: true, email: true, profileImage: true } }, college: { select: { id: true, name: true } } }
              },
              payments: true
            }
          }
        }
      },
      student: true,
      payments: true
    }
  });

  if (!assignment) return null;

  const data = { ...assignment };
  data.payment = assignment.payments && assignment.payments.length > 0 ? assignment.payments[0] : null;
  
  if (data.room && data.room.roomStudents) {
    data.roommates = data.room.roomStudents
      .filter(rs => rs.student && rs.student.id !== sId)
      .map(rs => {
        const roommate = { ...rs.student };
        roommate.payment = rs.payments && rs.payments.length > 0 ? rs.payments[0] : null;
        return roommate;
      });
  } else {
    data.roommates = [];
  }

  return data;
};

// Get room students
const getRoomStudents = async (roomId, includeInactive = false) => {
  const rId = parseInt(roomId);
  const where = { roomId: rId };
  if (!includeInactive) where.isActive = true;

  const assignments = await prisma.roomStudent.findMany({
    where,
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          age: true,
          phoneNumber: true,
          collegeId: true,
          user: { select: { id: true, name: true, email: true, role: true } },
          college: { select: { id: true, name: true } }
        }
      },
      payments: true
    },
    orderBy: { checkInDate: 'desc' }
  });

  return assignments.map(a => {
    const data = { ...a };
    data.payment = a.payments && a.payments.length > 0 ? a.payments[0] : null;
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
