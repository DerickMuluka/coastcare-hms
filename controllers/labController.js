const db = require('../config/db');

exports.list = async (req, res) => {
  const [rows] = await db.query(`
    SELECT lt.*, pu.full_name AS patient_name, du.full_name AS doctor_name
    FROM lab_tests lt
    JOIN patients p ON p.id=lt.patient_id JOIN users pu ON pu.id=p.user_id
    LEFT JOIN doctors dr ON dr.id=lt.doctor_id LEFT JOIN users du ON du.id=dr.user_id
    ORDER BY lt.requested_at DESC LIMIT 300`);
  res.json(rows);
};

exports.create = async (req, res) => {
  const { patient_id, test_name } = req.body;
  const [doc] = await db.query('SELECT id FROM doctors WHERE user_id=?', [req.user.id]);
  const [r] = await db.query('INSERT INTO lab_tests (patient_id,doctor_id,test_name) VALUES (?,?,?)',
    [patient_id, doc[0]?.id || null, test_name]);
  res.status(201).json({ id: r.insertId });
};

exports.update = async (req, res) => {
  const { status, result_text } = req.body;
  await db.query(
    `UPDATE lab_tests SET status=?, result_text=?, completed_at=IF(?='completed', NOW(), completed_at) WHERE id=?`,
    [status, result_text || null, status, req.params.id]);
  res.json({ message: 'Updated' });
};

exports.remove = async (req, res) => {
  await db.query('DELETE FROM lab_tests WHERE id=?', [req.params.id]);
  res.json({ message: 'Deleted' });
};