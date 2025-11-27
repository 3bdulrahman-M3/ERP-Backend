const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Get or create conversation
router.post('/conversations', chatController.getOrCreateConversation);

// Get all conversations
router.get('/conversations', chatController.getAllConversations);

// Get conversation by ID
router.get('/conversations/:id', chatController.getConversationById);

// Get messages for a conversation
router.get('/conversations/:id/messages', chatController.getMessages);

// Send a message
router.post('/messages', chatController.sendMessage);

// Get unread message count
router.get('/unread-count', chatController.getUnreadCount);

module.exports = router;

