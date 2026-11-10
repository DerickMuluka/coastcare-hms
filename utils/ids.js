const db = require('../config/db');

exports.nextPatientNo = async () => {
  const [rows] = await db.query("SELECT patient_no FROM users WHERE patient_no IS NOT NULL ORDER BY id DESC LIMIT 1");
  const last = rows[0]?.patient_no || 'PAT-00000';
  const num = parseInt(last.split('-')[1], 10) + 1;
  return 'PAT-' + String(num).padStart(5, '0');
};

exports.nextStaffNo = async (prefix = 'STF') => {
  const [rows] = await db.query("SELECT staff_no FROM users WHERE staff_no LIKE ? ORDER BY id DESC LIMIT 1", [prefix + '-%']);
  const last = rows[0]?.staff_no || `${prefix}-0000`;
  const num = parseInt(last.split('-')[1], 10) + 1;
  return prefix + '-' + String(num).padStart(4, '0');
};

exports.nextBookingRef = () => 'BK-' + Math.random().toString(36).slice(2, 10).toUpperCase();
exports.nextInvoiceNo = () => 'INV-' + Date.now();