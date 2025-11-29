const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.use(authMiddleware);
router.use(roleMiddleware('admin'));

router.get('/', paymentController.getPayments);
router.post('/', paymentController.createPayment);
router.put('/:id', paymentController.updatePayment);
router.post('/:id/add', paymentController.addPayment);
router.get('/report/financial', paymentController.getFinancialReport);

module.exports = router;

