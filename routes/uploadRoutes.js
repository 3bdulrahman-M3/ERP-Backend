const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const upload = require('../middlewares/uploadMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

// Upload a single image
router.post('/image', authMiddleware, upload.single('image'), uploadController.uploadImage);

// Delete an image
router.delete('/image/:filename', authMiddleware, uploadController.deleteImage);

module.exports = router;

