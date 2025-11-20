// Middleware لتنسيق موحد للردود JSON
const responseHandler = (req, res, next) => {
  // حفظ الدالة الأصلية للـ res.json
  const originalJson = res.json.bind(res);
  
  // استبدال res.json بدالة مخصصة
  res.json = function(data, statusCode = 200) {
    const response = {
      success: statusCode >= 200 && statusCode < 300,
      statusCode: statusCode || res.statusCode || 200,
      message: data.message || '',
      data: data.data || data || null,
      error: data.error || null
    };
    
    // إزالة الحقول الفارغة
    if (!response.message) delete response.message;
    if (!response.data) delete response.data;
    if (!response.error) delete response.error;
    
    res.statusCode = statusCode || res.statusCode || 200;
    return originalJson(response);
  };
  
  next();
};

module.exports = responseHandler;

