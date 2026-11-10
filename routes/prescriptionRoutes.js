const router = require('express').Router();
const c = require('../controllers/prescriptionController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
router.post('/records', requireAuth, requireRole('doctor'), c.createRecordWithPrescription);
router.get('/patient/:patientId', requireAuth, c.byPatient);
router.delete('/:id', requireAuth, requireRole('admin','doctor'), c.remove);
module.exports = router;