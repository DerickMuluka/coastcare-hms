const db = require('../config/db');
const { hashPassword } = require('../utils/password');
const { nextPatientNo, nextStaffNo } = require('../utils/ids');

exports.list = async (req, res) => {
  const { role, q, status } = req.query;
  let sql = `SELECT id, patient_no, staff_no, full_name, email, phone, role, status, photo_url, address, date_of_birth, gender, is_active, last_login, created_at FROM users WHERE 1=1`;
  const params = [];
  if (role) { sql += ' AND role=?'; params.push(role); }
  if (status) { sql += ' AND status=?'; params.push(status); }
  if (q) { sql += ' AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR patient_no LIKE ? OR staff_no LIKE ?)';
    params.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`); }
  sql += ' ORDER BY (status="pending") DESC, id DESC LIMIT 500';
  const [rows] = await db.query(sql, params);
  res.json(rows);
};

exports.pending = async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, patient_no, full_name, email, phone, role, status, photo_url, address, date_of_birth, gender, created_at
     FROM users WHERE status='pending' ORDER BY created_at DESC`);
  res.json(rows);
};

exports.approve = async (req, res) => {
  try {
    const [u] = await db.query('SELECT id, full_name, role FROM users WHERE id=?', [req.params.id]);
    if (!u.length) return res.status(404).json({ error: 'User not found' });
    await db.query("UPDATE users SET status='active' WHERE id=?", [req.params.id]);
    await db.query('INSERT INTO activity_log (user_id,action,description,ip_address) VALUES (?,?,?,?)',
      [req.user.id, 'approve_user', `Approved ${u[0].role} "${u[0].full_name}" (#${u[0].id})`, req.ip]);
    res.json({ message: 'User approved' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Approve failed' }); }
};

exports.reject = async (req, res) => {
  try {
    const [u] = await db.query('SELECT id, full_name, role FROM users WHERE id=?', [req.params.id]);
    if (!u.length) return res.status(404).json({ error: 'User not found' });
    await db.query("UPDATE users SET status='rejected' WHERE id=?", [req.params.id]);
    await db.query('INSERT INTO activity_log (user_id,action,description,ip_address) VALUES (?,?,?,?)',
      [req.user.id, 'reject_user', `Rejected ${u[0].role} "${u[0].full_name}" (#${u[0].id})`, req.ip]);
    res.json({ message: 'User rejected' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Reject failed' }); }
};

exports.get = async (req, res) => {
  const [rows] = await db.query(
    'SELECT id, patient_no, staff_no, full_name, email, phone, role, status, photo_url, address, date_of_birth, gender, is_active, last_login, created_at FROM users WHERE id=?',
    [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
};

exports.create = async (req, res) => {
  try {
    const { full_name, email, phone, password, role, address, date_of_birth, gender,
            department_id, specialization, qualification, license_number, experience_years, consultation_fee, bio } = req.body;
    if (!full_name || !email || !password || !role) return res.status(400).json({ error: 'Missing fields' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be 8+ chars' });

    const [exists] = await db.query('SELECT id FROM users WHERE email=?', [email]);
    if (exists.length) return res.status(409).json({ error: 'Email exists' });

    const hash = await hashPassword(password);
    let patient_no = null, staff_no = null;
    if (role === 'patient') patient_no = await nextPatientNo();
    else if (role === 'admin') staff_no = await nextStaffNo('ADM');
    else if (role === 'doctor') staff_no = await nextStaffNo('DR');
    else if (role === 'receptionist') staff_no = await nextStaffNo('RC');
    else if (role === 'lab') staff_no = await nextStaffNo('LAB');
    else if (role === 'pharmacist') staff_no = await nextStaffNo('PHM');
    else staff_no = await nextStaffNo('STF');

    const [u] = await db.query(
      `INSERT INTO users (patient_no,staff_no,full_name,email,phone,password_hash,role,status,address,date_of_birth,gender)
       VALUES (?,?,?,?,?,?,?, 'active', ?,?,?)`,
      [patient_no, staff_no, full_name, email, phone || null, hash, role, address || null, date_of_birth || null, gender || null]
    );

    if (role === 'doctor') {
      await db.query(
        `INSERT INTO doctors (user_id,department_id,specialization,qualification,license_number,experience_years,consultation_fee,bio)
         VALUES (?,?,?,?,?,?,?,?)`,
        [u.insertId, department_id || null, specialization || null, qualification || null, license_number || null,
         experience_years || 0, consultation_fee || 0, bio || null]
      );
    } else if (role === 'patient') {
      await db.query('INSERT INTO patients (user_id) VALUES (?)', [u.insertId]);
    }

    await db.query('INSERT INTO activity_log (user_id,action,description,ip_address) VALUES (?,?,?,?)',
      [req.user.id, 'create_user', `Created ${role} "${full_name}" (${patient_no || staff_no}) with admin-set password`, req.ip]);

    res.status(201).json({ id: u.insertId, patient_no, staff_no, message: 'User created with password' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Create failed' }); }
};

exports.update = async (req, res) => {
  try {
    const { full_name, phone, email, role, address, date_of_birth, gender, is_active } = req.body;
    const fields = [], values = [];
    if (full_name !== undefined) { fields.push('full_name=?'); values.push(full_name); }
    if (phone !== undefined) { fields.push('phone=?'); values.push(phone); }
    if (email !== undefined) { fields.push('email=?'); values.push(email); }
    if (role !== undefined) { fields.push('role=?'); values.push(role); }
    if (address !== undefined) { fields.push('address=?'); values.push(address); }
    if (date_of_birth !== undefined) { fields.push('date_of_birth=?'); values.push(date_of_birth); }
    if (gender !== undefined) { fields.push('gender=?'); values.push(gender); }
    if (is_active !== undefined) { fields.push('is_active=?'); values.push(is_active ? 1 : 0); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    values.push(req.params.id);
    await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id=?`, values);
    await db.query('INSERT INTO activity_log (user_id,action,description,ip_address) VALUES (?,?,?,?)',
      [req.user.id, 'update_user', `Updated user #${req.params.id}`, req.ip]);
    res.json({ message: 'Updated' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Update failed' }); }
};

exports.resetPassword = async (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 8) return res.status(400).json({ error: 'Password must be 8+ chars' });
    const hash = await hashPassword(new_password);
    await db.query('UPDATE users SET password_hash=? WHERE id=?', [hash, req.params.id]);
    await db.query('INSERT INTO activity_log (user_id,action,description,ip_address) VALUES (?,?,?,?)',
      [req.user.id, 'reset_password', `Reset password for user #${req.params.id}`, req.ip]);
    res.json({ message: 'Password reset' });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
};

exports.remove = async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    await db.query('DELETE FROM users WHERE id=?', [req.params.id]);
    await db.query('INSERT INTO activity_log (user_id,action,description,ip_address) VALUES (?,?,?,?)',
      [req.user.id, 'delete_user', `Deleted user #${req.params.id}`, req.ip]);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: 'Delete failed' }); }
};

exports.toggleActive = async (req, res) => {
  try {
    await db.query('UPDATE users SET is_active = 1 - is_active WHERE id=? AND id!=?', [req.params.id, req.user.id]);
    res.json({ message: 'Toggled' });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
};