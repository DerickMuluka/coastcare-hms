const db = require('../config/db');
const { sendEmail } = require('../services/emailService');
const { sendSms } = require('../services/smsService');
const { nextBookingRef } = require('../utils/ids');

const toMin = (t) => { const [h,m] = t.split(':').map(Number); return h*60+m; };

exports.availableSlots = async (req, res) => {
  const { doctor_id, date } = req.query;
  if (!doctor_id || !date) return res.status(400).json({ error: 'doctor_id and date required' });
  const dow = new Date(date).getDay();
  const [scheds] = await db.query(
    'SELECT start_time,end_time,slot_minutes FROM doctor_schedules WHERE doctor_id=? AND day_of_week=? ORDER BY start_time',
    [doctor_id, dow]);
  if (!scheds.length) return res.json({ slots: [] });
  const [booked] = await db.query(
    `SELECT start_time FROM appointments WHERE doctor_id=? AND appointment_date=? AND status NOT IN ('cancelled','no_show')`,
    [doctor_id, date]);
  const bookedSet = new Set(booked.map(b => b.start_time.slice(0,5)));
  const slots = [];
  for (const s of scheds) {
    const startMin = toMin(s.start_time), endMin = toMin(s.end_time);
    for (let m = startMin; m + s.slot_minutes <= endMin; m += s.slot_minutes) {
      const hh = String(Math.floor(m/60)).padStart(2,'0');
      const mm = String(m%60).padStart(2,'0');
      const hhEnd = String(Math.floor((m+s.slot_minutes)/60)).padStart(2,'0');
      const mmEnd = String((m+s.slot_minutes)%60).padStart(2,'0');
      if (!bookedSet.has(`${hh}:${mm}`)) slots.push({ start: `${hh}:${mm}`, end: `${hhEnd}:${mmEnd}` });
    }
  }
  res.json({ slots });
};

exports.create = async (req, res) => {
  try {
    const { doctor_id, appointment_date, start_time, reason, patient_id: pidInput } = req.body;
    let patient_id;
    if (req.user.role === 'patient') {
      const [prows] = await db.query('SELECT id FROM patients WHERE user_id=?', [req.user.id]);
      if (!prows.length) return res.status(403).json({ error: 'Only patients can book' });
      patient_id = prows[0].id;
    } else {
      if (!pidInput) return res.status(400).json({ error: 'patient_id required for staff booking' });
      patient_id = pidInput;
    }

    const [doc] = await db.query('SELECT department_id FROM doctors WHERE id=?', [doctor_id]);
    if (!doc.length) return res.status(404).json({ error: 'Doctor not found' });

    const [sched] = await db.query(
      `SELECT slot_minutes FROM doctor_schedules
       WHERE doctor_id=? AND day_of_week=? AND start_time<=? AND end_time>?`,
      [doctor_id, new Date(appointment_date).getDay(), start_time, start_time]);
    if (!sched.length) return res.status(400).json({ error: 'Doctor not available' });
    const slotMin = sched[0].slot_minutes;

    const [dupe] = await db.query(
      `SELECT id FROM appointments WHERE doctor_id=? AND appointment_date=? AND start_time=? AND status NOT IN ('cancelled','no_show')`,
      [doctor_id, appointment_date, start_time]);
    if (dupe.length) return res.status(409).json({ error: 'Slot already booked' });

    const [h,m] = start_time.split(':').map(Number);
    const endTotal = h*60+m+slotMin;
    const end_time = `${String(Math.floor(endTotal/60)).padStart(2,'0')}:${String(endTotal%60).padStart(2,'0')}`;
    const booking_ref = nextBookingRef();

    const [r] = await db.query(
      `INSERT INTO appointments (booking_ref,patient_id,doctor_id,department_id,appointment_date,start_time,end_time,reason,status)
       VALUES (?,?,?,?,?,?,?,?, 'pending')`,
      [booking_ref, patient_id, doctor_id, doc[0].department_id, appointment_date, start_time, end_time, reason || null]);

    const [pu] = await db.query(
      `SELECT u.email, u.phone FROM users u JOIN patients p ON p.user_id=u.id WHERE p.id=?`, [patient_id]);
    if (pu.length) {
      const msg = `Appointment ${booking_ref} confirmed for ${appointment_date} at ${start_time}. Status: pending.`;
      await sendEmail({ to: pu[0].email, subject: 'Appointment Booked', text: msg });
      if (pu[0].phone) await sendSms({ to: pu[0].phone, message: msg });
    }

    res.status(201).json({ id: r.insertId, booking_ref, message: 'Appointment booked' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Booking failed' }); }
};

exports.list = async (req, res) => {
  const role = req.user.role;
  let sql = `
    SELECT a.*, pu.full_name AS patient_name, pu.patient_no, du.full_name AS doctor_name, d.name AS department
    FROM appointments a
    JOIN patients p ON p.id=a.patient_id JOIN users pu ON pu.id=p.user_id
    JOIN doctors dr ON dr.id=a.doctor_id JOIN users du ON du.id=dr.user_id
    LEFT JOIN departments d ON d.id=a.department_id WHERE 1=1`;
  const params = [];
  if (role === 'patient') { sql += ' AND p.user_id=?'; params.push(req.user.id); }
  else if (role === 'doctor') { sql += ' AND dr.user_id=?'; params.push(req.user.id); }
  if (req.query.status) { sql += ' AND a.status=?'; params.push(req.query.status); }
  if (req.query.date) { sql += ' AND a.appointment_date=?'; params.push(req.query.date); }
  sql += ' ORDER BY a.appointment_date DESC, a.start_time DESC LIMIT 300';
  const [rows] = await db.query(sql, params);
  res.json(rows);
};

exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['pending','confirmed','completed','cancelled','no_show'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  const [rows] = await db.query(`
    SELECT a.*, u.email, u.phone, du.full_name AS doctor_name
    FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN users u ON u.id=p.user_id
    JOIN doctors dr ON dr.id=a.doctor_id JOIN users du ON du.id=dr.user_id WHERE a.id=?`, [id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  await db.query('UPDATE appointments SET status=? WHERE id=?', [status, id]);
  const a = rows[0];
  const msg = `Appointment ${a.booking_ref} with ${a.doctor_name} on ${a.appointment_date} at ${a.start_time.slice(0,5)} is now ${status}.`;
  await sendEmail({ to: a.email, subject: 'Appointment Update', text: msg });
  if (a.phone) await sendSms({ to: a.phone, message: msg });
  res.json({ message: 'Status updated' });
};

exports.cancel = (req, res) => { req.body.status = 'cancelled'; return exports.updateStatus(req, res); };

exports.remove = async (req, res) => {
  await db.query('DELETE FROM appointments WHERE id=?', [req.params.id]);
  res.json({ message: 'Deleted' });
};