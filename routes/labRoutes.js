const router = require('express').Router();
const c = require('../controllers/labController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
router.get('/', requireAuth, requireRole('admin','doctor','lab','receptionist'), c.list);
router.post('/', requireAuth, requireRole('doctor','admin'), c.create);
router.patch('/:id', requireAuth, requireRole('lab','admin','doctor'), c.update);
router.delete('/:id', requireAuth, requireRole('admin','lab'), c.remove);
module.exports = router;