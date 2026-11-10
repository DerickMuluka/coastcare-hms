const db = require('../config/db');
const jwt = require('jsonwebtoken');
const { hashPassword, comparePassword } = require('../utils/password');
const { isEmail, isPhone, strongPassword } = require('../utils/validators');
const { nextPatientNo } = require('../utils/ids');
require('dotenv').config();

const signToken = (u) => jwt.sign(
  { id: u.id, email: u.email, role: u.role, name: u.full_name },
  process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' }
);

exports.register = async (req, res) => {
  try {
    const { full_name, email, phone, password, dob, gender, blood_group, address, emergency_contact } = req.body;
    if (!full_name || !email || !password) return res.status(400).json({ error: 'Missing required fields' });
    if (!isEmail(email)) return res.status(400).json({ error: 'Invalid email' });
    if (!strongPassword(password)) return res.status(400).json({ error: 'Password must be 8+ chars with uppercase and number' });
    if (phone && !isPhone(phone)) return res.status(400).json({ error: 'Invalid phone' });

    const [exists] = await db.query('SELECT id FROM users WHERE email=?', [email]);
    if (exists.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await hashPassword(password);
    const patientNo = await nextPatientNo();

    const [result] = await db.query(
      `INSERT INTO users (patient_no,full_name,email,phone,password_hash,role,status,address,date_of_birth,gender)
       VALUES (?,?,?,?,?, 'patient', 'pending', ?,?,?)`,
      [patientNo, full_name, email, phone || null, hash, address || null, dob || null, gender || null]
    );

    await db.query(
      'INSERT INTO patients (user_id,blood_group,emergency_contact) VALUES (?,?,?)',
      [result.insertId, blood_group || null, emergency_contact || null]
    );

    await db.query('INSERT INTO activity_log (user_id,action,description,ip_address) VALUES (?,?,?,?)',
      [result.insertId, 'register', 'Patient self-registered, awaiting approval', req.ip]);

    res.status(201).json({
      message: 'Registration submitted. Your account is pending admin approval.',
      patient_no: patientNo,
      pending_approval: true
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const [rows] = await db.query('SELECT * FROM users WHERE email=?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Your account is pending admin approval. Please wait.' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({ error: 'Your registration was rejected. Contact reception.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been disabled.' });
    }

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    await db.query('UPDATE users SET last_login=NOW() WHERE id=?', [user.id]);
    await db.query('INSERT INTO activity_log (user_id,action,description,ip_address) VALUES (?,?,?,?)',
      [user.id, 'login', 'User logged in', req.ip]);

    const token = signToken(user);
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7*24*60*60*1000 });
    res.json({
      message: 'Login successful', token,
      user: { id: user.id, name: user.full_name, email: user.email, role: user.role, photo_url: user.photo_url }
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Login failed' }); }
};

exports.logout = (req, res) => { res.clearCookie('token'); res.json({ message: 'Logged out' }); };

exports.me = async (req, res) => {
  const [rows] = await db.query(
    'SELECT id, patient_no, staff_no, full_name, email, phone, role, status, photo_url, address, date_of_birth, gender, last_login, created_at FROM users WHERE id=?',
    [req.user.id]);
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
};