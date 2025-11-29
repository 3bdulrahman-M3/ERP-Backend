const paymentService = require('../services/paymentService');

// Create or update payment for assignment
const createPayment = async (req, res) => {
  try {
    const payment = await paymentService.createOrUpdatePayment(req.body);
    res.status(201).json({
      success: true,
      message: 'Payment saved successfully',
      data: payment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await paymentService.updatePayment(id, req.body);
    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: payment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query;
    const result = await paymentService.getPayments(filters, page, limit);
    res.json({
      success: true,
      message: 'Payments retrieved successfully',
      data: result.payments,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getFinancialReport = async (req, res) => {
  try {
    const report = await paymentService.getFinancialReport(req.query);
    res.json({
      success: true,
      message: 'Financial report generated successfully',
      data: report
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const addPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await paymentService.addPayment(id, req.body);
    res.json({
      success: true,
      message: 'Additional payment added successfully',
      data: payment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createPayment,
  updatePayment,
  addPayment,
  getPayments,
  getFinancialReport
};

