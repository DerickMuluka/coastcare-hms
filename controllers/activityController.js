const db = require('../config/db');

exports.list = async (req, res) => {
  const [rows] = await db.query(`
    SELECT al.*, u.full_name, u.role
    FROM activity_log al LEFT JOIN users u ON u.id=al.user_id
    ORDER BY al.created_at DESC LIMIT 200`);
  res.json(rows);
};