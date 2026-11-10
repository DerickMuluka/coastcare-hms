require('dotenv').config();
exports.sendSms = async ({ to, message }) => {
  if (!process.env.SMS_API_KEY) { console.log('[SMS-DEV] →', to, '|', message); return { skipped: true }; }
  return { sent: true };
};