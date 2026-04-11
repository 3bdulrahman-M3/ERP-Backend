const prisma = require('../config/prisma');
const notificationService = require('./notificationService');

// Get or create conversation for a student
const getOrCreateConversation = async (studentId, adminId = null) => {
  const sId = parseInt(studentId);
  const aId = adminId ? parseInt(adminId) : null;

  let conversation = await prisma.conversation.findUnique({
    where: { studentId: sId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          profileImage: true,
          user: { select: { id: true, name: true, email: true, profileImage: true } }
        }
      },
      admin: { select: { id: true, name: true, email: true, profileImage: true } }
    }
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        studentId: sId,
        adminId: aId
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            user: { select: { id: true, name: true, email: true, profileImage: true } }
          }
        },
        admin: { select: { id: true, name: true, email: true, profileImage: true } }
      }
    });
  } else if (aId && !conversation.adminId) {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { adminId: aId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            user: { select: { id: true, name: true, email: true, profileImage: true } }
          }
        },
        admin: { select: { id: true, name: true, email: true, profileImage: true } }
      }
    });
  }

  return conversation;
};

// Get conversation by ID
const getConversationById = async (conversationId, userId, userRole) => {
  const cId = parseInt(conversationId);
  const uId = parseInt(userId);

  const conversation = await prisma.conversation.findUnique({
    where: { id: cId },
    include: {
      student: {
        include: { user: { select: { id: true, name: true, email: true, profileImage: true } } }
      },
      admin: { select: { id: true, name: true, email: true, profileImage: true } }
    }
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Check permissions
  if (userRole === 'student') {
    const student = await prisma.student.findUnique({ where: { userId: uId } });
    if (!student || conversation.studentId !== student.id) {
      throw new Error('Unauthorized access to conversation');
    }
  }

  return conversation;
};

// Get all conversations
const getAllConversations = async (userId, userRole) => {
  const uId = parseInt(userId);
  let conversations;
  
  if (userRole === 'admin') {
    conversations = await prisma.conversation.findMany({
      include: {
        student: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            user: { select: { id: true, name: true, email: true, profileImage: true } }
          }
        },
        admin: { select: { id: true, name: true, email: true, profileImage: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    });
  } else {
    const student = await prisma.student.findUnique({ where: { userId: uId } });
    if (!student) return [];

    conversations = await prisma.conversation.findMany({
      where: { studentId: student.id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            user: { select: { id: true, name: true, email: true, profileImage: true } }
          }
        },
        admin: { select: { id: true, name: true, email: true, profileImage: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    });
  }

  return conversations.map(conv => {
    const data = { ...conv };
    data.lastMessage = conv.messages && conv.messages.length > 0 ? conv.messages[0].content : null;
    delete data.messages;
    return data;
  });
};

// Get messages
const getMessages = async (conversationId, userId, userRole, page = 1, limit = 50) => {
  const cId = parseInt(conversationId);
  const uId = parseInt(userId);
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const conversation = await prisma.conversation.findUnique({
    where: { id: cId },
    include: {
      student: { select: { id: true, name: true, profileImage: true, userId: true } }
    }
  });

  if (!conversation) throw new Error('Conversation not found');

  if (userRole === 'student') {
    const student = await prisma.student.findUnique({ where: { userId: uId } });
    if (!student || conversation.studentId !== student.id) {
      throw new Error('Unauthorized access to conversation');
    }
  }

  const [messages, count] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId: cId },
      include: {
        sender: { select: { id: true, name: true, email: true, profileImage: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    prisma.message.count({ where: { conversationId: cId } })
  ]);

  // Adjust profile image for student messages
  const processedMessages = messages.map(msg => {
    const data = { ...msg };
    if (data.senderRole === 'student' && data.senderId === conversation.student.userId) {
      data.sender = { ...data.sender, profileImage: conversation.student.profileImage };
    }
    return data;
  });

  // Mark messages as read
  const unreadMessageIds = processedMessages
    .filter(msg => msg.senderId !== uId && !msg.isRead)
    .map(msg => msg.id);

  if (unreadMessageIds.length > 0) {
    await prisma.message.updateMany({
      where: { id: { in: unreadMessageIds } },
      data: { isRead: true }
    });
  }

  return {
    messages: processedMessages.reverse(),
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  };
};

// Send a message
const sendMessage = async (conversationId, senderId, senderRole, content, attachmentUrl = null, attachmentType = null, attachmentName = null) => {
  const cId = parseInt(conversationId);
  const sId = parseInt(senderId);
  const hasContent = content && content.trim();

  if (!hasContent && !attachmentUrl) {
    throw new Error('Message content or attachment is required');
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: cId }
  });

  if (!conversation) throw new Error('Conversation not found');

  if (senderRole === 'student') {
    const student = await prisma.student.findUnique({ where: { userId: sId } });
    if (!student || conversation.studentId !== student.id) {
      throw new Error('Unauthorized access to conversation');
    }
  }

  const message = await prisma.$transaction(async (tx) => {
    const newMessage = await tx.message.create({
      data: {
        conversationId: cId,
        senderId: sId,
        senderRole,
        content: hasContent ? content.trim() : null,
        attachmentUrl,
        attachmentType,
        attachmentName,
        isRead: false
      },
      include: {
        sender: { select: { id: true, name: true, email: true, profileImage: true } }
      }
    });

    await tx.conversation.update({
      where: { id: cId },
      data: { lastMessageAt: new Date() }
    });

    return newMessage;
  });

  // Handle student profile image
  if (senderRole === 'student') {
    const student = await prisma.student.findUnique({ where: { userId: sId } });
    if (student && student.profileImage) {
      message.sender.profileImage = student.profileImage;
    }
  }

  // Handle notifications
  try {
    if (senderRole === 'admin') {
      const student = await prisma.student.findUnique({
        where: { id: conversation.studentId },
        select: { userId: true }
      });
      if (student && student.userId) {
        await notificationService.createNotification(student.userId, 'new_message', 'New Message', 'You have a new message from the administration', conversation.id, 'conversation');
      }
    } else if (senderRole === 'student') {
      if (conversation.adminId) {
        await notificationService.createNotification(conversation.adminId, 'new_message', 'New Message from Student', `You have a new message from ${message.sender.name}`, conversation.id, 'conversation');
      } else {
        await notificationService.createNotificationForAdmins('new_message', 'New Message from Student', 'You have a new message from a student', conversation.id, 'conversation');
      }
    }
  } catch (err) {
    console.error('Error sending message notification:', err);
  }

  return message;
};

// Get unread message count
const getUnreadCount = async (userId, userRole) => {
  const uId = parseInt(userId);
  if (userRole === 'admin') {
    return await prisma.message.count({
      where: {
        senderRole: 'student',
        isRead: false
      }
    });
  } else {
    const student = await prisma.student.findUnique({ where: { userId: uId } });
    if (!student) return 0;

    const conversation = await prisma.conversation.findUnique({
      where: { studentId: student.id }
    });

    if (!conversation) return 0;

    return await prisma.message.count({
      where: {
        conversationId: conversation.id,
        senderRole: 'admin',
        isRead: false
      }
    });
  }
};

module.exports = {
  getOrCreateConversation,
  getConversationById,
  getAllConversations,
  getMessages,
  sendMessage,
  getUnreadCount
};
