const db = require('../config/db');
const { hashPassword } = require('../utils/password');
const { nextPatientNo } = require('../utils/ids');

exports.list = async (req, res) => {
  const { q } = req.query;
  let sql = `
    SELECT p.id, u.id AS user_id, u.patient_no, u.full_name, u.email, u.phone, u.photo_url,
           u.date_of_birth, u.gender, u.address, p.blood_group, p.allergies,
           p.emergency_contact, p.insurance_provider, p.insurance_number, u.created_at
    FROM patients p JOIN users u ON u.id=p.user_id WHERE u.is_active=1`;
  const params = [];
  if (q) { sql += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.patient_no LIKE ?)';
    params.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`); }
  sql += ' ORDER BY u.full_name LIMIT 500';
  const [rows] = await db.query(sql, params);
  res.json(rows);
};

exports.me = async (req, res) => {
  const [rows] = await db.query(`
    SELECT p.*, u.full_name, u.patient_no, u.email, u.phone, u.photo_url, u.address, u.date_of_birth, u.gender
    FROM patients p JOIN users u ON u.id=p.user_id WHERE p.user_id=?`, [req.user.id]);
  if (!rows.length) return res.status(404).json({ error: 'Patient profile not found' });
  res.json(rows[0]);
};

exports.get = async (req, res) => {
  const [rows] = await db.query(`
    SELECT p.*, u.full_name, u.patient_no, u.email, u.phone, u.photo_url, u.address, u.date_of_birth, u.gender, u.created_at
    FROM patients p JOIN users u ON u.id=p.user_id WHERE p.id=?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });

  const [appts] = await db.query(`
    SELECT a.*, du.full_name AS doctor_name FROM appointments a
    JOIN doctors dr ON dr.id=a.doctor_id JOIN users du ON du.id=dr.user_id
    WHERE a.patient_id=? ORDER BY appointment_date DESC LIMIT 20`, [req.params.id]);

  const [records] = await db.query(`
    SELECT mr.*, du.full_name AS doctor_name FROM medical_records mr
    LEFT JOIN doctors dr ON dr.id=mr.doctor_id LEFT JOIN users du ON du.id=dr.user_id
    WHERE mr.patient_id=? ORDER BY visit_date DESC`, [req.params.id]);

  const [labs] = await db.query('SELECT * FROM lab_tests WHERE patient_id=? ORDER BY requested_at DESC', [req.params.id]);
  const [invoices] = await db.query('SELECT * FROM invoices WHERE patient_id=? ORDER BY created_at DESC', [req.params.id]);

  res.json({ ...rows[0], appointments: appts, records, labs, invoices });
};

exports.create = async (req, res) => {
  try {
    const { full_name, email, phone, password, date_of_birth, gender, blood_group, address, emergency_contact, allergies, insurance_provider, insurance_number } = req.body;
    if (!full_name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    const [exists] = await db.query('SELECT id FROM users WHERE email=?', [email]);
    if (exists.length) return res.status(409).json({ error: 'Email exists' });
    const hash = await hashPassword(password);
    const patientNo = await nextPatientNo();
    const [u] = await db.query(
      `INSERT INTO users (patient_no,full_name,email,phone,password_hash,role,address,date_of_birth,gender)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [patientNo, full_name, email, phone || null, hash, 'patient', address || null, date_of_birth || null, gender || null]
    );
    const [p] = await db.query(
      `INSERT INTO patients (user_id,blood_group,allergies,emergency_contact,insurance_provider,insurance_number)
       VALUES (?,?,?,?,?,?)`,
      [u.insertId, blood_group || null, allergies || null, emergency_contact || null, insurance_provider || null, insurance_number || null]
    );
    res.status(201).json({ id: p.insertId, patient_no: patientNo });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Create failed' }); }
};

exports.updatePatient = async (req, res) => {
  const { blood_group, allergies, emergency_contact, insurance_provider, insurance_number } = req.body;
  await db.query(
    'UPDATE patients SET blood_group=?,allergies=?,emergency_contact=?,insurance_provider=?,insurance_number=? WHERE id=?',
    [blood_group, allergies, emergency_contact, insurance_provider, insurance_number, req.params.id]
  );
  res.json({ message: 'Updated' });
};

exports.remove = async (req, res) => {
  try {
    const [p] = await db.query('SELECT user_id FROM patients WHERE id=?', [req.params.id]);
    if (!p.length) return res.status(404).json({ error: 'Not found' });
    await db.query('DELETE FROM users WHERE id=?', [p[0].user_id]);
    res.json({ message: 'Patient deleted' });
  } catch { res.status(500).json({ error: 'Delete failed' }); }
};