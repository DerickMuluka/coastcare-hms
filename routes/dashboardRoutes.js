const router = require('express').Router();
const c = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/authMiddleware');
router.get('/summary', requireAuth, c.summary);
module.exports = router;