const prisma = require('../config/prisma');

const calculatePaymentStatus = (amountDue = 0, amountPaid = 0) => {
  const due = Number(amountDue) || 0;
  const paid = Number(amountPaid) || 0;

  if (due <= 0 && paid <= 0) {
    return 'unpaid';
  }

  if (paid >= due) {
    return 'paid';
  }

  if (paid > 0 && paid < due) {
    return 'partial';
  }

  return 'unpaid';
};

const normalizePaymentValues = (paymentData = {}) => {
  const amountDue = Number(paymentData.amountDue ?? 0);
  const amountPaid = Number(paymentData.amountPaid ?? 0);
  const remainingAmount = Math.max(amountDue - amountPaid, 0);
  const status = paymentData.status || calculatePaymentStatus(amountDue, amountPaid);

  return {
    amountDue,
    amountPaid,
    remainingAmount,
    status,
    paymentMethod: paymentData.paymentMethod || 'cash',
    paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
    notes: paymentData.notes || null
  };
};

const resolveAssignmentContext = async ({ roomStudentId, roomId, studentId }) => {
  let assignment = null;

  if (roomStudentId) {
    assignment = await prisma.roomStudent.findUnique({
      where: { id: parseInt(roomStudentId) }
    });
    if (!assignment) {
      throw new Error('Room assignment not found');
    }
  }

  return {
    assignment,
    roomId: roomId ? parseInt(roomId) : assignment?.roomId,
    studentId: studentId ? parseInt(studentId) : assignment?.studentId
  };
};

const createOrUpdatePayment = async (paymentData) => {
  const { roomStudentId } = paymentData;
  if (!roomStudentId) {
    throw new Error('roomStudentId is required to register a payment');
  }

  const context = await resolveAssignmentContext(paymentData);
  if (!context.roomId || !context.studentId) {
    throw new Error('Unable to resolve room or student for payment');
  }

  const normalized = normalizePaymentValues(paymentData);

  const rsId = parseInt(roomStudentId);

  return await prisma.payment.upsert({
    where: { roomStudentId: rsId },
    update: {
      roomId: context.roomId,
      studentId: context.studentId,
      amountDue: normalized.amountDue,
      amountPaid: normalized.amountPaid,
      remainingAmount: normalized.remainingAmount,
      status: normalized.status,
      paymentMethod: normalized.paymentMethod,
      paymentDate: normalized.paymentDate,
      notes: normalized.notes
    },
    create: {
      roomStudentId: rsId,
      roomId: context.roomId,
      studentId: context.studentId,
      amountDue: normalized.amountDue,
      amountPaid: normalized.amountPaid,
      remainingAmount: normalized.remainingAmount,
      status: normalized.status,
      paymentMethod: normalized.paymentMethod,
      paymentDate: normalized.paymentDate,
      notes: normalized.notes
    }
  });
};

const updatePayment = async (paymentId, paymentData) => {
  const id = parseInt(paymentId);
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) {
    throw new Error('Payment not found');
  }

  const normalized = normalizePaymentValues(paymentData);
  
  return await prisma.payment.update({
    where: { id },
    data: {
      amountDue: paymentData.amountDue !== undefined ? normalized.amountDue : undefined,
      amountPaid: paymentData.amountPaid !== undefined ? normalized.amountPaid : undefined,
      remainingAmount: (paymentData.amountDue !== undefined || paymentData.amountPaid !== undefined) 
        ? Math.max(normalized.amountDue - normalized.amountPaid, 0) 
        : undefined,
      status: normalized.status,
      paymentMethod: paymentData.paymentMethod || undefined,
      paymentDate: paymentData.paymentDate ? normalized.paymentDate : undefined,
      notes: paymentData.notes ?? undefined
    }
  });
};

const addPayment = async (paymentId, additionalPaymentData) => {
  const id = parseInt(paymentId);
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) {
    throw new Error('Payment not found');
  }

  const additionalAmount = Number(additionalPaymentData.amount || 0);
  if (additionalAmount <= 0) {
    throw new Error('Additional payment amount must be greater than 0');
  }

  const currentPaid = Number(payment.amountPaid) || 0;
  const amountDue = Number(payment.amountDue) || 0;
  const newAmountPaid = currentPaid + additionalAmount;
  const remainingAmount = Math.max(amountDue - newAmountPaid, 0);
  const status = calculatePaymentStatus(amountDue, newAmountPaid);

  let newNotes = payment.notes || '';
  if (additionalPaymentData.notes) {
    const timestamp = new Date().toLocaleString('ar-EG');
    newNotes = `${newNotes}\n${timestamp}: ${additionalPaymentData.notes}`.trim();
  }

  return await prisma.payment.update({
    where: { id },
    data: {
      amountPaid: newAmountPaid,
      remainingAmount,
      status,
      paymentMethod: additionalPaymentData.paymentMethod || payment.paymentMethod,
      paymentDate: additionalPaymentData.paymentDate ? new Date(additionalPaymentData.paymentDate) : new Date(),
      notes: newNotes
    }
  });
};

const buildPaymentFilters = (filters = {}) => {
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.paymentMethod) {
    where.paymentMethod = filters.paymentMethod;
  }

  if (filters.roomId) {
    where.roomId = parseInt(filters.roomId);
  }

  if (filters.studentId) {
    where.studentId = parseInt(filters.studentId);
  }

  if (filters.startDate || filters.endDate) {
    where.paymentDate = {};
    if (filters.startDate) {
      where.paymentDate.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.paymentDate.lte = new Date(filters.endDate);
    }
  }

  return where;
};

const getPayments = async (filters = {}, page = 1, limit = 20) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);
  const where = buildPaymentFilters(filters);

  const [payments, count] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take,
      orderBy: { paymentDate: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        room: {
          select: {
            id: true,
            roomNumber: true,
            floor: true,
            roomType: true
          }
        },
        assignment: {
          select: {
            id: true,
            checkInDate: true,
            checkOutDate: true,
            isActive: true
          }
        }
      }
    }),
    prisma.payment.count({ where })
  ]);

  return {
    payments,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  };
};

const getFinancialReport = async (filters = {}) => {
  const where = buildPaymentFilters(filters);

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { paymentDate: 'desc' },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      },
      room: {
        select: {
          id: true,
          roomNumber: true,
          roomType: true
        }
      }
    }
  });

  const totals = payments.reduce((acc, payment) => {
    const paid = Number(payment.amountPaid) || 0;
    const due = Number(payment.amountDue) || 0;
    const remaining = Number(payment.remainingAmount) || Math.max(due - paid, 0);

    acc.totalDue += due;
    acc.totalPaid += paid;
    acc.totalRemaining += remaining;

    if (!acc.methods[payment.paymentMethod]) {
      acc.methods[payment.paymentMethod] = {
        totalPaid: 0,
        count: 0
      };
    }

    acc.methods[payment.paymentMethod].totalPaid += paid;
    acc.methods[payment.paymentMethod].count += 1;

    return acc;
  }, {
    totalDue: 0,
    totalPaid: 0,
    totalRemaining: 0,
    methods: {}
  });

  return {
    payments,
    totals
  };
};

module.exports = {
  createOrUpdatePayment,
  updatePayment,
  addPayment,
  getPayments,
  getFinancialReport,
  calculatePaymentStatus
};
