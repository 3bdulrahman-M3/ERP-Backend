const { Op } = require('sequelize');
const { Payment, RoomStudent, Room, Student, User } = require('../models');

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
    paymentDate: paymentData.paymentDate || new Date(),
    notes: paymentData.notes || null
  };
};

const resolveAssignmentContext = async ({ roomStudentId, roomId, studentId }) => {
  let assignment = null;

  if (roomStudentId) {
    assignment = await RoomStudent.findByPk(roomStudentId);
    if (!assignment) {
      throw new Error('Room assignment not found');
    }
  }

  return {
    assignment,
    roomId: roomId || assignment?.roomId,
    studentId: studentId || assignment?.studentId
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

  let payment = await Payment.findOne({ where: { roomStudentId } });
  if (payment) {
    Object.assign(payment, {
      roomId: context.roomId,
      studentId: context.studentId,
      amountDue: normalized.amountDue,
      amountPaid: normalized.amountPaid,
      remainingAmount: normalized.remainingAmount,
      status: normalized.status,
      paymentMethod: normalized.paymentMethod,
      paymentDate: normalized.paymentDate,
      notes: normalized.notes
    });
    await payment.save();
    return payment.toJSON();
  }

  payment = await Payment.create({
    roomId: context.roomId,
    studentId: context.studentId,
    roomStudentId,
    ...normalized
  });

  return payment.toJSON();
};

const updatePayment = async (paymentId, paymentData) => {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) {
    throw new Error('Payment not found');
  }

  const normalized = normalizePaymentValues(paymentData);
  Object.assign(payment, {
    amountDue: normalized.amountDue ?? payment.amountDue,
    amountPaid: normalized.amountPaid ?? payment.amountPaid,
    remainingAmount: normalized.remainingAmount ?? payment.remainingAmount,
    status: normalized.status ?? payment.status,
    paymentMethod: normalized.paymentMethod ?? payment.paymentMethod,
    paymentDate: normalized.paymentDate ?? payment.paymentDate,
    notes: normalized.notes ?? payment.notes
  });

  await payment.save();
  return payment.toJSON();
};

const addPayment = async (paymentId, additionalPaymentData) => {
  const payment = await Payment.findByPk(paymentId);
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

  Object.assign(payment, {
    amountPaid: newAmountPaid,
    remainingAmount,
    status,
    paymentMethod: additionalPaymentData.paymentMethod || payment.paymentMethod,
    paymentDate: additionalPaymentData.paymentDate || new Date(),
    notes: additionalPaymentData.notes 
      ? `${payment.notes || ''}\n${new Date().toLocaleString('ar-EG')}: ${additionalPaymentData.notes}`.trim()
      : payment.notes
  });

  await payment.save();
  return payment.toJSON();
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
    where.roomId = filters.roomId;
  }

  if (filters.studentId) {
    where.studentId = filters.studentId;
  }

  if (filters.startDate && filters.endDate) {
    where.paymentDate = {
      [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
    };
  } else if (filters.startDate) {
    where.paymentDate = {
      [Op.gte]: new Date(filters.startDate)
    };
  } else if (filters.endDate) {
    where.paymentDate = {
      [Op.lte]: new Date(filters.endDate)
    };
  }

  return where;
};

const getPayments = async (filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const where = buildPaymentFilters(filters);

  const { count, rows } = await Payment.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['paymentDate', 'DESC']],
    include: [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'name', 'email'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ]
      },
      {
        model: Room,
        as: 'room',
        attributes: ['id', 'roomNumber', 'floor', 'roomType']
      },
      {
        model: RoomStudent,
        as: 'assignment',
        attributes: ['id', 'checkInDate', 'checkOutDate', 'isActive']
      }
    ]
  });

  return {
    payments: rows.map(row => row.toJSON()),
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

  const payments = await Payment.findAll({
    where,
    order: [['paymentDate', 'DESC']],
    include: [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'name', 'email'],
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }]
      },
      {
        model: Room,
        as: 'room',
        attributes: ['id', 'roomNumber', 'roomType']
      }
    ]
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
    payments: payments.map(payment => payment.toJSON()),
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

