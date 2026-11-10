const router = require('express').Router();
const c = require('../controllers/profileController');
const { requireAuth } = require('../middleware/authMiddleware');
const { uploadPhoto } = require('../middleware/uploadMiddleware');

router.put('/', requireAuth, c.updateProfile);
router.post('/photo', requireAuth, uploadPhoto, c.uploadPhoto);
router.post('/password', requireAuth, c.changePassword);
router.post('/email', requireAuth, c.updateEmail);
router.get('/activity', requireAuth, c.getActivity);
module.exports = router;