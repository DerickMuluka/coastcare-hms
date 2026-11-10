const router = require('express').Router();
const c = require('../controllers/billingController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
router.get('/', requireAuth, c.listInvoices);
router.get('/:id', requireAuth, c.getInvoice);
router.post('/', requireAuth, requireRole('admin','receptionist'), c.createInvoice);
router.post('/:id/pay', requireAuth, requireRole('admin','receptionist'), c.pay);
router.delete('/:id', requireAuth, requireRole('admin'), c.remove);
module.exports = router;