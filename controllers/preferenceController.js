const preferenceService = require('../services/preferenceService');

// Get preferences for current user
const getPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await preferenceService.getPreferences(userId);
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Update preferences
const updatePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roomType, preferredServices } = req.body;
    
    const preferences = await preferenceService.updatePreferences(userId, {
      roomType,
      preferredServices
    });
    
    res.json({
      success: true,
      message: 'تم تحديث التفضيلات بنجاح',
      data: preferences
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getPreferences,
  updatePreferences
};

