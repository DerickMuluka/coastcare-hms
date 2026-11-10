const router = require('express').Router();
const c = require('../controllers/activityController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
router.get('/', requireAuth, requireRole('admin'), c.list);
module.exports = router;