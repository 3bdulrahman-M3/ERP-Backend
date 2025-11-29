const chatService = require('../services/chatService');
const { Student, User } = require('../models');

// Get or create conversation
const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { studentId } = req.body;

    if (userRole === 'admin' && studentId) {
      const conversation = await chatService.getOrCreateConversation(studentId, userId);
      await conversation.reload({
        include: [
          {
            model: Student,
            as: 'student',
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email']
            }]
          }
        ]
      });
      res.json({
        success: true,
        data: conversation
      });
    } else if (userRole === 'student') {
      const student = await Student.findOne({ where: { userId } });
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }
      const conversation = await chatService.getOrCreateConversation(student.id);
      await conversation.reload({
        include: [
          {
            model: Student,
            as: 'student',
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email']
            }]
          }
        ]
      });
      res.json({
        success: true,
        data: conversation
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get conversation by ID
const getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const conversation = await chatService.getConversationById(id, userId, userRole);
    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

// Get all conversations
const getAllConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const conversations = await chatService.getAllConversations(userId, userRole);
    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get messages
const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const page = req.query.page || 1;
    const limit = req.query.limit || 50;

    const result = await chatService.getMessages(id, userId, userRole, page, limit);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Send message
const sendMessage = async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required'
      });
    }

    // Check if file is uploaded
    let attachmentUrl = null;
    let attachmentType = null;
    let attachmentName = null;

    if (req.file) {
      const fileUrl = `/uploads/chat/${req.file.filename}`;
      const fullUrl = `${req.protocol}://${req.get('host')}${fileUrl}`;
      attachmentUrl = fullUrl;
      attachmentName = req.file.originalname;
      
      // Determine attachment type
      const imageTypes = /jpeg|jpg|png|gif|webp/;
      const ext = req.file.originalname.split('.').pop().toLowerCase();
      attachmentType = imageTypes.test(ext) ? 'image' : 'file';
    }

    // Normalize content: if empty string, convert to null
    const normalizedContent = (content && content.trim()) ? content.trim() : null;
    
    const message = await chatService.sendMessage(
      conversationId, 
      userId, 
      userRole, 
      normalizedContent, 
      attachmentUrl, 
      attachmentType, 
      attachmentName
    );
    
    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get unread count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const count = await chatService.getUnreadCount(userId, userRole);
    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
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

