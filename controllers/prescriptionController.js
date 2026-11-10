const db = require('../config/db');

exports.createRecordWithPrescription = async (req, res) => {
  try {
    const { patient_id, appointment_id, diagnosis, symptoms, notes, prescriptions } = req.body;
    const [doc] = await db.query('SELECT id FROM doctors WHERE user_id=?', [req.user.id]);
    if (!doc.length) return res.status(403).json({ error: 'Only doctors' });

    const [rec] = await db.query(
      `INSERT INTO medical_records (patient_id,doctor_id,appointment_id,diagnosis,symptoms,notes) VALUES (?,?,?,?,?,?)`,
      [patient_id, doc[0].id, appointment_id || null, diagnosis || null, symptoms || null, notes || null]);
    for (const p of prescriptions || []) {
      await db.query(
        `INSERT INTO prescriptions (record_id,patient_id,doctor_id,medication,dosage,frequency,duration_days,instructions)
         VALUES (?,?,?,?,?,?,?,?)`,
        [rec.insertId, patient_id, doc[0].id, p.medication, p.dosage || null, p.frequency || null,
         p.duration_days || null, p.instructions || null]);
    }
    if (appointment_id) await db.query('UPDATE appointments SET status=? WHERE id=?', ['completed', appointment_id]);
    res.status(201).json({ record_id: rec.insertId });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
};

exports.byPatient = async (req, res) => {
  const [rows] = await db.query(`
    SELECT pr.*, u.full_name AS doctor_name, mr.diagnosis, mr.visit_date
    FROM prescriptions pr JOIN doctors dr ON dr.id=pr.doctor_id
    JOIN users u ON u.id=dr.user_id JOIN medical_records mr ON mr.id=pr.record_id
    WHERE pr.patient_id=? ORDER BY pr.created_at DESC`, [req.params.patientId]);
  res.json(rows);
};

exports.remove = async (req, res) => {
  await db.query('DELETE FROM prescriptions WHERE id=?', [req.params.id]);
  res.json({ message: 'Deleted' });
};