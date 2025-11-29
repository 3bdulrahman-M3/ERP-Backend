const registrationRequestService = require('../services/registrationRequestService');

const createRequest = async (req, res) => {
  try {
    const request = await registrationRequestService.createRequest(req.body);
    res.status(201).json({
      success: true,
      message: 'تم إرسال طلب التسجيل بنجاح',
      data: request
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء إنشاء طلب التسجيل'
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
      message: error.message || 'حدث خطأ أثناء جلب طلبات التسجيل'
    });
  }
};

const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await registrationRequestService.approveRequest(id);
    res.json({
      success: true,
      message: 'تم قبول الطلب وإنشاء حساب الطالب بنجاح',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء قبول الطلب'
    });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await registrationRequestService.rejectRequest(id);
    res.json({
      success: true,
      message: 'تم رفض الطلب بنجاح',
      data: request
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء رفض الطلب'
    });
  }
};

module.exports = {
  createRequest,
  getRequests,
  approveRequest,
  rejectRequest
};

