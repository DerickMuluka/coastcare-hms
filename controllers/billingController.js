const db = require('../config/db');
const { nextInvoiceNo } = require('../utils/ids');

exports.listInvoices = async (req, res) => {
  const role = req.user.role;
  let sql = `SELECT i.*, u.full_name AS patient_name FROM invoices i
             JOIN patients p ON p.id=i.patient_id JOIN users u ON u.id=p.user_id WHERE 1=1`;
  const params = [];
  if (role === 'patient') { sql += ' AND p.user_id=?'; params.push(req.user.id); }
  sql += ' ORDER BY i.created_at DESC LIMIT 200';
  const [rows] = await db.query(sql, params);
  res.json(rows);
};

exports.createInvoice = async (req, res) => {
  try {
    const { patient_id, appointment_id, items, payment_method } = req.body;
    if (!patient_id || !Array.isArray(items) || !items.length) return res.status(400).json({ error: 'patient_id and items required' });
    const total = items.reduce((s,it) => s + Number(it.amount), 0);
    const number = nextInvoiceNo();
    const [inv] = await db.query(
      `INSERT INTO invoices (patient_id,appointment_id,invoice_number,total_amount,status,payment_method)
       VALUES (?,?,?,?, 'unpaid', ?)`,
      [patient_id, appointment_id || null, number, total, payment_method || null]);
    for (const it of items) {
      await db.query('INSERT INTO invoice_items (invoice_id,description,amount) VALUES (?,?,?)',
        [inv.insertId, it.description, it.amount]);
    }
    res.status(201).json({ id: inv.insertId, invoice_number: number, total });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Create failed' }); }
};

exports.pay = async (req, res) => {
  const { amount, method } = req.body;
  const [rows] = await db.query('SELECT * FROM invoices WHERE id=?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const inv = rows[0];
  const newPaid = Number(inv.paid_amount) + Number(amount);
  const status = newPaid >= Number(inv.total_amount) ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
  await db.query('UPDATE invoices SET paid_amount=?, status=?, payment_method=? WHERE id=?',
    [newPaid, status, method || inv.payment_method, req.params.id]);
  res.json({ message: 'Payment recorded', paid: newPaid, status });
};

exports.getInvoice = async (req, res) => {
  const [rows] = await db.query(`
    SELECT i.*, u.full_name AS patient_name, u.email FROM invoices i
    JOIN patients p ON p.id=i.patient_id JOIN users u ON u.id=p.user_id WHERE i.id=?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const [items] = await db.query('SELECT * FROM invoice_items WHERE invoice_id=?', [req.params.id]);
  res.json({ ...rows[0], items });
};

exports.remove = async (req, res) => {
  await db.query('DELETE FROM invoices WHERE id=?', [req.params.id]);
  res.json({ message: 'Deleted' });
};