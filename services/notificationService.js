const prisma = require('../config/prisma');

// Create notification
const createNotification = async (userId, type, title, message, relatedId = null, relatedType = null) => {
  return await prisma.notification.create({
    data: {
      userId: parseInt(userId),
      type,
      title,
      message,
      relatedId: relatedId ? parseInt(relatedId) : null,
      relatedType,
      isRead: false
    }
  });
};

// Create notification for all admins
const createNotificationForAdmins = async (type, title, message, relatedId = null, relatedType = null) => {
  const admins = await prisma.user.findMany({
    where: {
      role: 'admin',
      isActive: true
    }
  });

  const notifications = await Promise.all(
    admins.map(admin =>
      prisma.notification.create({
        data: {
          userId: admin.id,
          type,
          title,
          message,
          relatedId: relatedId ? parseInt(relatedId) : null,
          relatedType,
          isRead: false
        }
      })
    )
  );

  return notifications;
};

// Get all notifications for a user
const getUserNotifications = async (userId, page = 1, limit = 20) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [notifications, count] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: parseInt(userId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take
    }),
    prisma.notification.count({
      where: { userId: parseInt(userId) }
    })
  ]);

  return {
    notifications,
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
  return await prisma.notification.count({
    where: {
      userId: parseInt(userId),
      isRead: false
    }
  });
};

// Mark notification as read
const markAsRead = async (notificationId, userId) => {
  const id = parseInt(notificationId);
  const uId = parseInt(userId);

  const notification = await prisma.notification.findFirst({
    where: {
      id,
      userId: uId
    }
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  return await prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });
};

// Mark all notifications as read
const markAllAsRead = async (userId) => {
  await prisma.notification.updateMany({
    where: {
      userId: parseInt(userId),
      isRead: false
    },
    data: { isRead: true }
  });
};

// Delete notification
const deleteNotification = async (notificationId, userId) => {
  const id = parseInt(notificationId);
  const uId = parseInt(userId);

  const notification = await prisma.notification.findFirst({
    where: {
      id,
      userId: uId
    }
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  await prisma.notification.delete({
    where: { id }
  });
  
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
