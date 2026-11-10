const router = require('express').Router();
const c = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.get('/', requireAuth, requireRole('admin'), c.list);
router.get('/pending', requireAuth, requireRole('admin'), c.pending);
router.get('/:id', requireAuth, requireRole('admin'), c.get);
router.post('/', requireAuth, requireRole('admin'), c.create);
router.put('/:id', requireAuth, requireRole('admin'), c.update);
router.post('/:id/approve', requireAuth, requireRole('admin'), c.approve);
router.post('/:id/reject', requireAuth, requireRole('admin'), c.reject);
router.post('/:id/reset-password', requireAuth, requireRole('admin'), c.resetPassword);
router.patch('/:id/toggle', requireAuth, requireRole('admin'), c.toggleActive);
router.delete('/:id', requireAuth, requireRole('admin'), c.remove);
module.exports = router;