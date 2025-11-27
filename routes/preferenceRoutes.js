const express = require('express');
const router = express.Router();
const preferenceController = require('../controllers/preferenceController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.use(authMiddleware);

// Get preferences (students only)
router.get('/', roleMiddleware('student'), preferenceController.getPreferences);

// Update preferences (students only)
router.put('/', roleMiddleware('student'), preferenceController.updatePreferences);

module.exports = router;

