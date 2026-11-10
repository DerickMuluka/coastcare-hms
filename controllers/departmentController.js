const db = require('../config/db');

exports.list = async (req, res) => {
  const [rows] = await db.query(`
    SELECT d.*, u.full_name AS head_name
    FROM departments d LEFT JOIN doctors dr ON dr.id=d.head_doctor_id
    LEFT JOIN users u ON u.id=dr.user_id ORDER BY d.name`);
  res.json(rows);
};

exports.create = async (req, res) => { 
  try {
    const { name, description, location } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const [r] = await db.query('INSERT INTO departments (name,description,location) VALUES (?,?,?)',
      [name, description || null, location || null]);
    res.status(201).json({ id: r.insertId });
  } catch { res.status(500).json({ error: 'Create failed' }); }
};

exports.update = async (req, res) => {
  const { name, description, location } = req.body;
  await db.query('UPDATE departments SET name=?,description=?,location=? WHERE id=?',
    [name, description, location, req.params.id]);
  res.json({ message: 'Updated' });
};

exports.remove = async (req, res) => {
  await db.query('DELETE FROM departments WHERE id=?', [req.params.id]);
  res.json({ message: 'Deleted' });
};