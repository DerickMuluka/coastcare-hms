const db = require('../config/db');

exports.summary = async (req, res) => {
  const role = req.user.role;
  const out = { role };
  if (['admin','receptionist'].includes(role)) {
    const [[p]] = await db.query('SELECT COUNT(*) c FROM patients');
    const [[d]] = await db.query('SELECT COUNT(*) c FROM doctors');
    const [[a]] = await db.query("SELECT COUNT(*) c FROM appointments WHERE appointment_date=CURDATE()");
    const [[t]] = await db.query("SELECT COUNT(*) c FROM appointments WHERE appointment_date=CURDATE() AND status='confirmed'");
    const [[rev]] = await db.query("SELECT COALESCE(SUM(paid_amount),0) s FROM invoices WHERE MONTH(created_at)=MONTH(CURDATE())");
    const [[pending]] = await db.query("SELECT COUNT(*) c FROM users WHERE status='pending'");
    out.stats = { patients: p.c, doctors: d.c, todayAppointments: a.c, confirmedToday: t.c, revenueThisMonth: Number(rev.s), pendingApprovals: pending.c };
    const [recent] = await db.query(`
      SELECT a.id, a.booking_ref, a.appointment_date, a.start_time, a.status, pu.full_name AS patient_name, du.full_name AS doctor_name
      FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN users pu ON pu.id=p.user_id
      JOIN doctors dr ON dr.id=a.doctor_id JOIN users du ON du.id=dr.user_id
      ORDER BY a.created_at DESC LIMIT 6`);
    out.recent = recent;
    const [byDept] = await db.query(`
      SELECT d.name, COUNT(a.id) AS count FROM departments d
      LEFT JOIN appointments a ON a.department_id=d.id GROUP BY d.id ORDER BY count DESC LIMIT 6`);
    out.byDepartment = byDept;
    const [pendingUsers] = await db.query(`
      SELECT id, patient_no, staff_no, full_name, email, role, created_at FROM users
      WHERE status='pending' ORDER BY created_at DESC LIMIT 5`);
    out.pendingUsers = pendingUsers;
  } else if (role === 'doctor') {
    const [doc] = await db.query('SELECT id FROM doctors WHERE user_id=?', [req.user.id]);
    const did = doc[0]?.id;
    const [[a]] = await db.query("SELECT COUNT(*) c FROM appointments WHERE doctor_id=? AND appointment_date=CURDATE() AND status NOT IN ('cancelled','no_show')", [did]);
    const [[pr]] = await db.query('SELECT COUNT(*) c FROM patients');
    const [[rec]] = await db.query("SELECT COUNT(*) c FROM medical_records WHERE doctor_id=?", [did]);
    out.stats = { todayAppointments: a.c, totalPatients: pr.c, records: rec.c };
    const [today] = await db.query(`
      SELECT a.id, a.start_time, a.status, pu.full_name AS patient_name, a.reason
      FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN users pu ON pu.id=p.user_id
      WHERE a.doctor_id=? AND a.appointment_date=CURDATE() ORDER BY a.start_time`, [did]);
    out.today = today;
  } else if (role === 'patient') {
    const [pat] = await db.query('SELECT id FROM patients WHERE user_id=?', [req.user.id]);
    const pid = pat[0]?.id;
    const [upcoming] = await db.query(`
      SELECT a.*, du.full_name AS doctor_name, d.name AS department
      FROM appointments a JOIN doctors dr ON dr.id=a.doctor_id JOIN users du ON du.id=dr.user_id
      LEFT JOIN departments d ON d.id=a.department_id
      WHERE a.patient_id=? AND a.appointment_date >= CURDATE() AND a.status IN ('pending','confirmed')
      ORDER BY a.appointment_date, a.start_time LIMIT 10`, [pid]);
    const [prescriptions] = await db.query(`
      SELECT pr.*, u.full_name AS doctor_name FROM prescriptions pr
      JOIN doctors dr ON dr.id=pr.doctor_id JOIN users u ON u.id=dr.user_id
      WHERE pr.patient_id=? ORDER BY pr.created_at DESC LIMIT 5`, [pid]);
    const [[inv]] = await db.query(
      "SELECT COALESCE(SUM(total_amount-paid_amount),0) due FROM invoices WHERE patient_id=? AND status!='cancelled'", [pid]);
    out.upcoming = upcoming; out.prescriptions = prescriptions;
    out.outstandingBalance = Number(inv.due);
  }
  res.json(out);
};