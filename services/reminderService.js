const cron = require('node-cron');
const db = require('../config/db');
const { sendEmail } = require('./emailService');
const { sendSms } = require('./smsService');

cron.schedule('0 8 * * *', async () => {
  try {
    const [rows] = await db.query(`
      SELECT a.id, a.start_time, u.email, u.phone, du.full_name AS doctor_name, d.name AS dept
      FROM appointments a
      JOIN patients p ON p.id=a.patient_id JOIN users u ON u.id=p.user_id
      JOIN doctors dr ON dr.id=a.doctor_id JOIN users du ON du.id=dr.user_id
      LEFT JOIN departments d ON d.id=a.department_id
      WHERE a.appointment_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        AND a.status IN ('pending','confirmed') AND a.reminder_sent=0`);
    for (const r of rows) {
      const msg = `Reminder: Your appointment with ${r.doctor_name} (${r.dept || ''}) is tomorrow at ${r.start_time.slice(0,5)}.`;
      await sendEmail({ to: r.email, subject: 'Appointment Reminder', text: msg });
      if (r.phone) await sendSms({ to: r.phone, message: msg });
      await db.query('UPDATE appointments SET reminder_sent=1 WHERE id=?', [r.id]);
    }
    if (rows.length) console.log(`[REMINDERS] sent ${rows.length}`);
  } catch (e) { console.error('[REMINDERS]', e.message); }
});
console.log('[CRON] Reminder scheduled (08:00 daily).');