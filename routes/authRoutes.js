const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /auth/login - تسجيل الدخول
router.post('/login', authController.login.bind(authController));

module.exports = router;

