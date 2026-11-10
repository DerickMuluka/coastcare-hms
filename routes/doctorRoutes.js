const router = require('express').Router();
const c = require('../controllers/doctorController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
router.get('/', requireAuth, c.list);
router.get('/:id', requireAuth, c.get);
router.post('/', requireAuth, requireRole('admin'), c.create);
router.put('/:id/schedule', requireAuth, requireRole('admin'), c.setSchedule);
router.delete('/:id', requireAuth, requireRole('admin'), c.remove);
module.exports = router;