const { Notification, User } = require('../models');
const { Op } = require('sequelize');

// Create notification
const createNotification = async (userId, type, title, message, relatedId = null, relatedType = null) => {
  return await Notification.create({
    userId,
    type,
    title,
    message,
    relatedId,
    relatedType,
    isRead: false
  });
};

// Create notification for all admins
const createNotificationForAdmins = async (type, title, message, relatedId = null, relatedType = null) => {
  const admins = await User.findAll({
    where: {
      role: 'admin',
      isActive: true
    }
  });

  const notifications = await Promise.all(
    admins.map(admin =>
      Notification.create({
        userId: admin.id,
        type,
        title,
        message,
        relatedId,
        relatedType,
        isRead: false
      })
    )
  );

  return notifications;
};

// Get all notifications for a user
const getUserNotifications = async (userId, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  const { count, rows } = await Notification.findAndCountAll({
    where: { userId },
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'name', 'email']
    }],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  return {
    notifications: rows,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  };
};

// Get unread count
const getUnreadCount = async (userId) => {
  return await Notification.count({
    where: {
      userId,
      isRead: false
    }
  });
};

// Mark notification as read
const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    where: {
      id: notificationId,
      userId
    }
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  notification.isRead = true;
  await notification.save();
  return notification;
};

// Mark all notifications as read
const markAllAsRead = async (userId) => {
  await Notification.update(
    { isRead: true },
    {
      where: {
        userId,
        isRead: false
      }
    }
  );
};

// Delete notification
const deleteNotification = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    where: {
      id: notificationId,
      userId
    }
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  await notification.destroy();
  return { message: 'Notification deleted successfully' };
};

module.exports = {
  createNotification,
  createNotificationForAdmins,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};



