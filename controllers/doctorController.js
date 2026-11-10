const db = require('../config/db');
const { hashPassword } = require('../utils/password');
const { nextStaffNo } = require('../utils/ids');

exports.list = async (req, res) => {
  const { department_id } = req.query;
  let sql = `SELECT dr.id, u.id AS user_id, u.full_name, u.email, u.phone, u.photo_url, dr.specialization, dr.qualification,
             dr.license_number, dr.experience_years, dr.consultation_fee, dr.bio, dr.is_available, dr.department_id, d.name AS department
             FROM doctors dr JOIN users u ON u.id=dr.user_id
             LEFT JOIN departments d ON d.id=dr.department_id WHERE u.is_active=1`;
  const params = [];
  if (department_id) { sql += ' AND dr.department_id=?'; params.push(department_id); }
  sql += ' ORDER BY u.full_name';
  const [rows] = await db.query(sql, params);
  res.json(rows);
};

exports.get = async (req, res) => {
  const [rows] = await db.query(`
    SELECT dr.*, u.full_name, u.email, u.phone, u.photo_url, d.name AS department
    FROM doctors dr JOIN users u ON u.id=dr.user_id
    LEFT JOIN departments d ON d.id=dr.department_id WHERE dr.id=?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const [schedules] = await db.query('SELECT * FROM doctor_schedules WHERE doctor_id=? ORDER BY day_of_week, start_time', [req.params.id]);
  res.json({ ...rows[0], schedules });
};

exports.create = async (req, res) => {
  try {
    const { full_name, email, phone, password, department_id, specialization, qualification, license_number, experience_years, consultation_fee, bio } = req.body;
    if (!full_name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    const [exists] = await db.query('SELECT id FROM users WHERE email=?', [email]);
    if (exists.length) return res.status(409).json({ error: 'Email exists' });

    const hash = await hashPassword(password);
    const staffNo = await nextStaffNo('DR');
    const [u] = await db.query(
      'INSERT INTO users (staff_no,full_name,email,phone,password_hash,role) VALUES (?,?,?,?,?,?)',
      [staffNo, full_name, email, phone || null, hash, 'doctor']
    );
    const [d] = await db.query(
      `INSERT INTO doctors (user_id,department_id,specialization,qualification,license_number,experience_years,consultation_fee,bio)
       VALUES (?,?,?,?,?,?,?,?)`,
      [u.insertId, department_id || null, specialization || null, qualification || null, license_number || null,
       experience_years || 0, consultation_fee || 0, bio || null]
    );
    res.status(201).json({ id: d.insertId, staff_no: staffNo });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Create failed' }); }
};

exports.setSchedule = async (req, res) => {
  const { id } = req.params;
  const { schedules } = req.body;
  await db.query('DELETE FROM doctor_schedules WHERE doctor_id=?', [id]);
  for (const s of schedules || []) {
    await db.query('INSERT INTO doctor_schedules (doctor_id,day_of_week,start_time,end_time,slot_minutes) VALUES (?,?,?,?,?)',
      [id, s.day_of_week, s.start_time, s.end_time, s.slot_minutes || 30]);
  }
  res.json({ message: 'Schedule updated' });
};

exports.remove = async (req, res) => {
  try {
    const [doc] = await db.query('SELECT user_id FROM doctors WHERE id=?', [req.params.id]);
    if (!doc.length) return res.status(404).json({ error: 'Not found' });
    await db.query('DELETE FROM users WHERE id=?', [doc[0].user_id]);
    res.json({ message: 'Doctor deleted' });
  } catch { res.status(500).json({ error: 'Delete failed' }); }
};