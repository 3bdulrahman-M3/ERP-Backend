const { Preference, User, Student } = require('../models');

// Get or create preferences for a user
const getOrCreatePreferences = async (userId) => {
  let preference = await Preference.findOne({ where: { userId } });
  
  if (!preference) {
    preference = await Preference.create({
      userId,
      roomType: null,
      preferredServices: []
    });
  }
  
  return preference.toJSON();
};

// Update preferences
const updatePreferences = async (userId, preferenceData) => {
  const { roomType, preferredServices } = preferenceData;
  
  let preference = await Preference.findOne({ where: { userId } });
  
  if (!preference) {
    preference = await Preference.create({
      userId,
      roomType: roomType || null,
      preferredServices: preferredServices || []
    });
  } else {
    if (roomType !== undefined) {
      preference.roomType = roomType;
    }
    if (preferredServices !== undefined) {
      preference.preferredServices = preferredServices;
    }
    await preference.save();
  }
  
  return preference.toJSON();
};

// Get preferences by userId
const getPreferences = async (userId) => {
  const preference = await Preference.findOne({ where: { userId } });
  
  if (!preference) {
    return {
      userId,
      roomType: null,
      preferredServices: []
    };
  }
  
  return preference.toJSON();
};

// Get all students with matching preferences for a room
const getStudentsWithMatchingPreferences = async (roomType, serviceIds = []) => {
  const { User, Preference } = require('../models');
  
  // Get all users with preferences
  const users = await User.findAll({
    where: { role: 'student', isActive: true },
    include: [{
      model: Preference,
      as: 'preference',
      required: false
    }]
  });

  // Filter users whose preferences match
  const matchingUserIds = [];
  
  for (const user of users) {
    if (!user.preference) {
      continue; // Skip users without preferences
    }
    
    const pref = user.preference;
    let matches = true;
    
    // Check room type match (if roomType is specified and preference has roomType)
    if (roomType && pref.roomType && pref.roomType !== roomType) {
      matches = false;
    }
    
    // Check services match - if room has at least one service from student's preferences, it's a match
    if (matches && serviceIds && serviceIds.length > 0 && pref.preferredServices && pref.preferredServices.length > 0) {
      const hasMatchingService = serviceIds.some(serviceId => 
        pref.preferredServices.includes(serviceId)
      );
      if (!hasMatchingService) {
        matches = false;
      }
    } else if (matches && serviceIds && serviceIds.length > 0 && (!pref.preferredServices || pref.preferredServices.length === 0)) {
      // If student has no preferred services but room has services, don't match
      matches = false;
    } else if (matches && (!serviceIds || serviceIds.length === 0) && pref.preferredServices && pref.preferredServices.length > 0) {
      // If student has preferred services but room has no services, don't match
      matches = false;
    }
    
    // If roomType is not specified, still match if student has any preferences
    if (matches && !roomType && (!pref.roomType || pref.preferredServices.length === 0)) {
      // Only match if student has some preferences set
      if (!pref.roomType && (!pref.preferredServices || pref.preferredServices.length === 0)) {
        matches = false;
      }
    }
    
    if (matches) {
      matchingUserIds.push(user.id);
    }
  }

  return matchingUserIds;
};

module.exports = {
  getOrCreatePreferences,
  updatePreferences,
  getPreferences,
  getStudentsWithMatchingPreferences
};

