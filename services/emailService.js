const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;
try {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
      secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
} catch { transporter = null; }

exports.sendEmail = async ({ to, subject, text }) => {
  if (!transporter) { console.log('[EMAIL-DEV] →', to, '|', subject); return { skipped: true }; }
  return transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, text });
};