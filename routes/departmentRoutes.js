const router = require('express').Router();
const c = require('../controllers/departmentController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
router.get('/', requireAuth, c.list);
router.post('/', requireAuth, requireRole('admin'), c.create);
router.put('/:id', requireAuth, requireRole('admin'), c.update);
router.delete('/:id', requireAuth, requireRole('admin'), c.remove);
module.exports = router;