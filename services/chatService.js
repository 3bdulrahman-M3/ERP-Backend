const { Conversation, Message, Student, User } = require('../models');
const { Op } = require('sequelize');
const notificationService = require('./notificationService');

// Get or create conversation for a student
const getOrCreateConversation = async (studentId, adminId = null) => {
  let conversation = await Conversation.findOne({
    where: { studentId },
    include: [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'name', 'profileImage'],
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'profileImage']
        }]
      },
      {
        model: User,
        as: 'admin',
        attributes: ['id', 'name', 'email', 'profileImage']
      }
    ]
  });

  if (!conversation) {
    conversation = await Conversation.create({
      studentId,
      adminId
    });
    await conversation.reload({
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'profileImage'],
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'profileImage']
          }]
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name', 'email', 'profileImage']
        }
      ]
    });
  } else if (adminId && !conversation.adminId) {
    conversation.adminId = adminId;
    await conversation.save();
    await conversation.reload({
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'profileImage'],
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'profileImage']
          }]
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name', 'email', 'profileImage']
        }
      ]
    });
  }

  return conversation;
};

// Get conversation by ID
const getConversationById = async (conversationId, userId, userRole) => {
  const conversation = await Conversation.findByPk(conversationId, {
    include: [
      {
        model: Student,
        as: 'student',
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'profileImage']
        }]
      },
      {
        model: User,
        as: 'admin',
        attributes: ['id', 'name', 'email', 'profileImage']
      }
    ]
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Check permissions
  if (userRole === 'student' && conversation.studentId !== userId) {
    throw new Error('Unauthorized access to conversation');
  }

  return conversation;
};

// Get all conversations (for admin) or student's conversation
const getAllConversations = async (userId, userRole) => {
  let conversations;
  
  if (userRole === 'admin') {
    conversations = await Conversation.findAll({
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'profileImage'],
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'profileImage']
          }]
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name', 'email', 'profileImage']
        }
      ],
      order: [['lastMessageAt', 'DESC NULLS LAST'], ['createdAt', 'DESC']]
    });
  } else {
    // Student can only see their own conversation
    const student = await Student.findOne({ where: { userId } });
    if (!student) {
      return [];
    }

    conversations = await Conversation.findAll({
      where: { studentId: student.id },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'profileImage'],
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'profileImage']
          }]
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name', 'email', 'profileImage']
        }
      ],
      order: [['lastMessageAt', 'DESC NULLS LAST'], ['createdAt', 'DESC']]
    });
  }

  // Get last message for each conversation
  const conversationsWithLastMessage = await Promise.all(
    conversations.map(async (conversation) => {
      const lastMessage = await Message.findOne({
        where: { conversationId: conversation.id },
        order: [['createdAt', 'DESC']],
        attributes: ['content']
      });

      const conversationData = conversation.toJSON();
      if (lastMessage) {
        conversationData.lastMessage = lastMessage.content;
      } else {
        conversationData.lastMessage = null;
      }

      return conversationData;
    })
  );

  return conversationsWithLastMessage;
};

// Get messages for a conversation
const getMessages = async (conversationId, userId, userRole, page = 1, limit = 50) => {
  const offset = (page - 1) * limit;

  // Get conversation with student info
  const conversation = await Conversation.findByPk(conversationId, {
    include: [{
      model: Student,
      as: 'student',
      attributes: ['id', 'name', 'profileImage', 'userId']
    }]
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Verify access
  if (userRole === 'student') {
    const student = await Student.findOne({ where: { userId } });
    if (!student || conversation.studentId !== student.id) {
      throw new Error('Unauthorized access to conversation');
    }
  }

  const { count, rows } = await Message.findAndCountAll({
    where: { conversationId },
    include: [{
      model: User,
      as: 'sender',
      attributes: ['id', 'name', 'email', 'profileImage']
    }],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  // Add student profile image to messages from students
  if (conversation && conversation.student) {
    rows.forEach(message => {
      if (message.senderRole === 'student' && message.senderId === conversation.student.userId) {
        message.sender.profileImage = conversation.student.profileImage;
      }
    });
  }

  // Mark messages as read if user is not the sender
  const unreadMessageIds = rows
    .filter(msg => msg.senderId !== userId && !msg.isRead)
    .map(msg => msg.id);

  if (unreadMessageIds.length > 0) {
    await Message.update(
      { isRead: true },
      { where: { id: { [Op.in]: unreadMessageIds } } }
    );
  }

  return {
    messages: rows.reverse(), // Reverse to show oldest first
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
  // Validate: must have content or attachment
  const hasContent = content && content.trim();
  const hasAttachment = attachmentUrl;
  
  if (!hasContent && !hasAttachment) {
    throw new Error('Message content or attachment is required');
  }

  const conversation = await Conversation.findByPk(conversationId);
  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Verify access
  if (senderRole === 'student') {
    const student = await Student.findOne({ where: { userId: senderId } });
    if (!student || conversation.studentId !== student.id) {
      throw new Error('Unauthorized access to conversation');
    }
  }

  const message = await Message.create({
    conversationId,
    senderId,
    senderRole,
    content: hasContent ? content.trim() : null,
    attachmentUrl,
    attachmentType,
    attachmentName,
    isRead: false
  });

  // Update conversation last message time
  conversation.lastMessageAt = new Date();
  await conversation.save();

  // Load sender info
  await message.reload({
    include: [{
      model: User,
      as: 'sender',
      attributes: ['id', 'name', 'email', 'profileImage']
    }]
  });

  // Add student profile image if sender is a student
  if (senderRole === 'student') {
    const student = await Student.findOne({ where: { userId: senderId } });
    if (student && student.profileImage) {
      message.sender.profileImage = student.profileImage;
    }
  }

  // Send notification to the other party in the conversation
  try {
    if (senderRole === 'admin') {
      // Admin sent message, notify student
      const student = await Student.findByPk(conversation.studentId, {
        include: [{ model: User, as: 'user', attributes: ['id'] }]
      });
      if (student && student.user) {
        await notificationService.createNotification(
          student.user.id,
          'new_message',
          'رسالة جديدة',
          `لديك رسالة جديدة من الإدارة`,
          conversation.id,
          'conversation'
        );
      }
    } else if (senderRole === 'student') {
      // Student sent message, notify admin
      if (conversation.adminId) {
        await notificationService.createNotification(
          conversation.adminId,
          'new_message',
          'رسالة جديدة من طالب',
          `لديك رسالة جديدة من ${message.sender.name}`,
          conversation.id,
          'conversation'
        );
      } else {
        // No admin assigned, notify all admins
        await notificationService.createNotificationForAdmins(
          'new_message',
          'رسالة جديدة من طالب',
          `لديك رسالة جديدة من طالب`,
          conversation.id,
          'conversation'
        );
      }
    }
  } catch (error) {
    console.error('Error creating message notification:', error);
  }

  return message;
};

// Get unread message count
const getUnreadCount = async (userId, userRole) => {
  if (userRole === 'admin') {
    // Count unread messages in all conversations where admin is not the sender
    const conversations = await Conversation.findAll({
      include: [{
        model: Message,
        as: 'messages',
        where: {
          isRead: false,
          senderRole: 'student'
        },
        required: false
      }]
    });

    let count = 0;
    for (const conv of conversations) {
      const unread = await Message.count({
        where: {
          conversationId: conv.id,
          isRead: false,
          senderRole: 'student'
        }
      });
      count += unread;
    }
    return count;
  } else {
    // Count unread messages for student
    const student = await Student.findOne({ where: { userId } });
    if (!student) return 0;

    const conversation = await Conversation.findOne({
      where: { studentId: student.id }
    });

    if (!conversation) return 0;

    return await Message.count({
      where: {
        conversationId: conversation.id,
        isRead: false,
        senderRole: 'admin'
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

