const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const upload = require('../middlewares/uploadMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

// رفع صورة واحدة
router.post('/image', authMiddleware, upload.single('image'), uploadController.uploadImage);

// حذف صورة
router.delete('/image/:filename', authMiddleware, uploadController.deleteImage);

module.exports = router;

