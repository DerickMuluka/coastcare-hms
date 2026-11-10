const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api', rateLimit({ windowMs: 60_000, max: 400 }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/activity', require('./routes/activityRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/doctors', require('./routes/doctorRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/prescriptions', require('./routes/prescriptionRoutes'));
app.use('/api/lab', require('./routes/labRoutes'));
app.use('/api/billing', require('./routes/billingRoutes'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/pages', express.static(path.join(__dirname, 'public/pages')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views/index.html')));

require('./services/reminderService');

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🏥 CoastCare HMS → http://localhost:${PORT}`));