const prisma = require('../config/prisma');

// Get or create preferences for a user
const getOrCreatePreferences = async (userId) => {
  const uId = parseInt(userId);
  let preference = await prisma.preference.findUnique({ where: { userId: uId } });
  
  if (!preference) {
    preference = await prisma.preference.create({
      data: {
        userId: uId,
        roomType: null,
        preferredServices: []
      }
    });
  }
  
  return preference;
};

// Update preferences
const updatePreferences = async (userId, preferenceData) => {
  const uId = parseInt(userId);
  const { roomType, preferredServices } = preferenceData;
  
  const pServices = Array.isArray(preferredServices) ? preferredServices.map(id => parseInt(id)) : [];

  return await prisma.preference.upsert({
    where: { userId: uId },
    update: {
      roomType: roomType !== undefined ? roomType : undefined,
      preferredServices: preferredServices !== undefined ? pServices : undefined
    },
    create: {
      userId: uId,
      roomType: roomType || null,
      preferredServices: pServices
    }
  });
};

// Get preferences by userId
const getPreferences = async (userId) => {
  const uId = parseInt(userId);
  const preference = await prisma.preference.findUnique({ where: { userId: uId } });
  
  if (!preference) {
    return {
      userId: uId,
      roomType: null,
      preferredServices: []
    };
  }
  
  return preference;
};

// Get all students with matching preferences for a room
const getStudentsWithMatchingPreferences = async (roomType, serviceIds = []) => {
  const sIds = Array.isArray(serviceIds) ? serviceIds.map(id => parseInt(id)) : [];
  
  // Base query: active students with preferences
  const where = {
    role: 'student',
    isActive: true,
    preference: { isNot: null }
  };

  // Build preference filtering logic 
  // Note: Sequelize code had complex OR/AND logic.
  // We'll mimic the "at least one matching service" and "room type match" logic.
  
  const studentUsers = await prisma.user.findMany({
    where,
    include: { preference: true }
  });

  const matchingUserIds = studentUsers.filter(user => {
    const pref = user.preference;
    if (!pref) return false;

    let matches = true;

    // Room type match
    if (roomType && pref.roomType && pref.roomType !== roomType) {
      matches = false;
    }

    // Services match - at least one common service
    if (matches && sIds.length > 0 && pref.preferredServices.length > 0) {
      const hasMatchingService = sIds.some(sId => pref.preferredServices.includes(sId));
      if (!hasMatchingService) matches = false;
    } else if (matches && sIds.length > 0 && pref.preferredServices.length === 0) {
      matches = false;
    } else if (matches && sIds.length === 0 && pref.preferredServices.length > 0) {
      matches = false;
    }

    // If no roomType provided, ensure they have at least some preference set
    if (matches && !roomType && !pref.roomType && pref.preferredServices.length === 0) {
      matches = false;
    }

    return matches;
  }).map(u => u.id);

  return matchingUserIds;
};

module.exports = {
  getOrCreatePreferences,
  updatePreferences,
  getPreferences,
  getStudentsWithMatchingPreferences
};
