const db = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');
const { strongPassword } = require('../utils/validators');

exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone, address, date_of_birth, gender } = req.body;
    const fields = [];
    const values = [];
    if (full_name) { fields.push('full_name=?'); values.push(full_name); }
    if (phone !== undefined) { fields.push('phone=?'); values.push(phone || null); }
    if (address !== undefined) { fields.push('address=?'); values.push(address || null); }
    if (date_of_birth !== undefined) { fields.push('date_of_birth=?'); values.push(date_of_birth || null); }
    if (gender !== undefined) { fields.push('gender=?'); values.push(gender || null); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    values.push(req.user.id);
    await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id=?`, values);
    await db.query('INSERT INTO activity_log (user_id,action,description,ip_address) VALUES (?,?,?,?)',
      [req.user.id, 'profile_update', 'Updated own profile', req.ip]);
    res.json({ message: 'Profile updated' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Update failed' }); }
};

exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = '/uploads/' + req.file.filename;
    await db.query('UPDATE users SET photo_url=? WHERE id=?', [url, req.user.id]);
    await db.query('INSERT INTO activity_log (user_id,action,description,ip_address) VALUES (?,?,?,?)',
      [req.user.id, 'photo_update', 'Updated profile photo', req.ip]);
    res.json({ message: 'Photo updated', photo_url: url });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Upload failed' }); }
};

exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
    if (!strongPassword(new_password)) return res.status(400).json({ error: 'New password must be 8+ chars with uppercase and number' });

    const [rows] = await db.query('SELECT password_hash FROM users WHERE id=?', [req.user.id]);
    const ok = await comparePassword(current_password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await hashPassword(new_password);
    await db.query('UPDATE users SET password_hash=? WHERE id=?', [hash, req.user.id]);
    await db.query('INSERT INTO activity_log (user_id,action,description,ip_address) VALUES (?,?,?,?)',
      [req.user.id, 'password_change', 'Changed own password', req.ip]);
    res.json({ message: 'Password changed' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Change failed' }); }
};

exports.updateEmail = async (req, res) => {
  try {
    const { new_email, password } = req.body;
    if (!new_email || !password) return res.status(400).json({ error: 'Email and password required' });
    const [rows] = await db.query('SELECT password_hash FROM users WHERE id=?', [req.user.id]);
    const ok = await comparePassword(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Password is incorrect' });
    const [exists] = await db.query('SELECT id FROM users WHERE email=? AND id!=?', [new_email, req.user.id]);
    if (exists.length) return res.status(409).json({ error: 'Email in use' });
    await db.query('UPDATE users SET email=? WHERE id=?', [new_email, req.user.id]);
    res.json({ message: 'Email updated. Please re-login.' });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
};

exports.getActivity = async (req, res) => {
  const [rows] = await db.query('SELECT action, description, ip_address, created_at FROM activity_log WHERE user_id=? ORDER BY created_at DESC LIMIT 30', [req.user.id]);
  res.json(rows);
};