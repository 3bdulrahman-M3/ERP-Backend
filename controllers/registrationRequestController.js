const registrationRequestService = require('../services/registrationRequestService');

const createRequest = async (req, res) => {
  try {
    const request = await registrationRequestService.createRequest(req.body);
    res.status(201).json({
      success: true,
      message: 'Registration request sent successfully',
      data: request
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'An error occurred while creating the registration request'
    });
  }
};

const getRequests = async (req, res) => {
  try {
    const status = req.query.status || null;
    const requests = await registrationRequestService.getAllRequests(status);
    res.json({
      success: true,
      data: requests,
      total: requests.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while fetching registration requests'
    });
  }
};

const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await registrationRequestService.approveRequest(id);
    res.json({
      success: true,
      message: 'Request approved and student account created successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'An error occurred while approving the request'
    });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await registrationRequestService.rejectRequest(id);
    res.json({
      success: true,
      message: 'Request rejected successfully',
      data: request
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'An error occurred while rejecting the request'
    });
  }
};

module.exports = {
  createRequest,
  getRequests,
  approveRequest,
  rejectRequest
};

