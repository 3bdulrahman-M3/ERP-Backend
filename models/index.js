const prisma = require('../config/prisma');

/**
 * هذا الملف يعمل كجسر (Bridge) لتوفير موديلات Prisma للخدمات التي لا تزال تستورد من مجلد models.
 * ملاحظة: ستحتاج لتحديث أكواد الخدمات (Services) لتستخدم Prisma Syntax بدلاً من Sequelize
 * (مثلاً: findUnique بدلاً من findOne، findMany بدلاً من findAll).
 */

module.exports = {
  prisma,
  User: prisma.user,
  RefreshToken: prisma.refreshToken,
  Student: prisma.student,
  Room: prisma.room,
  RoomStudent: prisma.roomStudent,
  College: prisma.college,
  Meal: prisma.meal,
  CheckInOut: prisma.checkInOut,
  Service: prisma.service,
  Building: prisma.building,
  Conversation: prisma.conversation,
  Message: prisma.message,
  Notification: prisma.notification,
  Preference: prisma.preference,
  RoomRequest: prisma.roomRequest,
  Payment: prisma.payment,
  RegistrationRequest: prisma.registrationRequest,
  Review: prisma.review
};
