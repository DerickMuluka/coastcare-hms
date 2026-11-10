# 🏥 CoastCare Hospital Management System

> A modern, full-stack hospital management platform built for Mombasa's healthcare needs — appointments, digital records, lab tracking, billing, and complete admin control.

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![Status](https://img.shields.io/badge/Status-Production--Ready-brightgreen)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Screenshots](#-screenshots)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Running the App](#-running-the-app)
- [Default Credentials](#-default-credentials)
- [User Roles & Permissions](#-user-roles--permissions)
- [Workflow](#-workflow)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Registration Approval Flow](#-registration-approval-flow)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

---

## 🎯 Overview

**CoastCare HMS** is a comprehensive Hospital Management System designed to digitize the daily operations of a modern Kenyan hospital. It replaces paper-based workflows with a secure, role-based web platform — from patient self-registration through admin approval, to appointment booking, doctor consultations, lab results, and final billing.

Built with **Node.js + Express + MySQL** on the backend and **vanilla JS + CSS Grid** on the frontend, it delivers a fast, framework-free experience with a warm, culturally relevant design.

### Why CoastCare?

- **Patient-first** — patients self-register, book appointments, and view their records from any device
- **Admin-controlled** — every registration is reviewed before granting access
- **End-to-end** — one system handles appointments, prescriptions, lab results, invoices, and messaging
- **Locally relevant** — Mombasa-based contacts, KES currency, M-Pesa integration placeholder, African medical staff photos
- **Auditable** — every action is logged with user, IP address, and timestamp

---

## ✨ Features

### 👑 Admin Console
- ✅ **Approve/reject patient registrations** (self-registered users stay `pending` until approved)
- ✅ **Create any user** — admin, doctor, patient, receptionist, lab, pharmacist
- ✅ **Set user passwords** during creation; users change them after first login
- ✅ **Reset any user's password** at any time
- ✅ **Enable/disable accounts** without deleting data
- ✅ **Full CRUD** on users, departments, doctors, patients, appointments, labs, billing
- ✅ **System-wide activity log** — who did what, when, from which IP
- ✅ **Revenue & operational dashboard** — pending approvals, today's appointments, monthly revenue

### 👨‍⚕️ Doctors
- View today's schedule and patient list
- Confirm, complete, or cancel appointments
- Issue medical records with diagnoses, symptoms, and multi-drug prescriptions
- Request lab tests for patients
- View full patient history

### 🧑 Patients
- Register (awaiting admin approval)
- Book appointments with real-time slot availability
- View upcoming visits, prescriptions, lab results, invoices
- Update profile, upload photo, change password/email
- Receive SMS & email reminders 24h before visits

### 💼 Receptionists
- Create patient accounts
- Book appointments on behalf of patients
- Issue invoices and record payments (Cash, M-Pesa, Card, Insurance)
- View all appointments across doctors

### 🧪 Lab Technicians
- View all lab test requests
- Mark tests as completed with result text
- Filter by status (requested, processing, completed)

### 💊 Pharmacists
- View prescriptions tied to patients and doctors
- (Extensible for inventory management)

### 🔐 Security
- JWT authentication via httpOnly cookies
- bcrypt password hashing (cost factor 10)
- Role-based middleware on every protected route
- Rate limiting (400 req/min per IP)
- Helmet.js security headers
- SQL injection protection via parameterized queries
- Activity audit trail

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js 20.x, Express 4.x |
| **Database** | MySQL 8.x (via `mysql2` promise pool) |
| **Auth** | JWT (`jsonwebtoken`), bcryptjs |
| **File Uploads** | Multer (images: JPG/PNG/WEBP, max 3MB) |
| **Email** | Nodemailer (SMTP) |
| **SMS** | Provider-agnostic stub (Africa's Talking / Twilio ready) |
| **Scheduling** | node-cron (daily 08:00 reminder job) |
| **Frontend** | Vanilla JS (ES6), HTML5, CSS Grid/Flexbox |
| **Fonts** | Bricolage Grotesque + Manrope (Google Fonts) |
| **Icons** | Inline SVG |
| **Images** | Unsplash (African healthcare professionals) |
| **Dev Server** | nodemon |

---

## 📸 Screenshots

> Add your screenshots after first run to `docs/screenshots/`:
> - `landing.png` — Landing page hero
> - `dashboard-admin.png` — Admin dashboard with pending approvals
> - `login.png` — Login form
> - `register.png` — Registration form
> - `users.png` — User management + approval tab
> - `appointments.png` — Booking flow

---

## 📁 Project Structure
coastcare-hms/
│
├── config/
│ └── db.js # MySQL connection pool
│
├── controllers/
│ ├── authController.js # Login, register (pending), me, logout
│ ├── userController.js # Admin CRUD + approve/reject/pending
│ ├── profileController.js # Update profile, photo, password, email
│ ├── departmentController.js # Department CRUD
│ ├── doctorController.js # Doctor list/create/schedule/delete
│ ├── patientController.js # Patient list/get/me/create/delete
│ ├── appointmentController.js # Slots, book, list, update status
│ ├── prescriptionController.js # Medical records + prescriptions
│ ├── labController.js # Lab test workflow
│ ├── billingController.js # Invoices & payments
│ ├── activityController.js # System-wide audit log
│ └── dashboardController.js # Role-aware summary + pending users
│
├── middleware/
│ ├── authMiddleware.js # requireAuth, requireRole
│ └── uploadMiddleware.js # Multer photo upload
│
├── routes/
│ ├── authRoutes.js
│ ├── userRoutes.js
│ ├── profileRoutes.js
│ ├── departmentRoutes.js
│ ├── doctorRoutes.js
│ ├── patientRoutes.js
│ ├── appointmentRoutes.js
│ ├── prescriptionRoutes.js
│ ├── labRoutes.js
│ ├── billingRoutes.js
│ ├── activityRoutes.js
│ └── dashboardRoutes.js
│
├── services/
│ ├── emailService.js # Nodemailer wrapper
│ ├── smsService.js # SMS wrapper (dev logs to console)
│ └── reminderService.js # Cron: reminders at 08:00 daily
│
├── utils/
│ ├── ids.js # PAT/DR/RC/LAB/PHM/ADM/BK/INV generators
│ ├── password.js # bcrypt wrapper
│ └── validators.js # Email, phone, password validators
│
├── database/
│ ├── coastcare_db.sql # Full schema
│ ├── reset.js # Drops & recreates DB from SQL
│ └── seed.js # Seeds 14 users, 10 depts, demo data
│
├── public/
│ ├── css/
│ │ ├── global.css # Variables, buttons, forms, navbar
│ │ ├── landing.css # Hero, sections, animations
│ │ ├── auth.css # Login/register layout
│ │ ├── dashboard.css # App shell, tables, badges
│ │ ├── users.css # User management + tabs + modals
│ │ ├── doctors.css # Doctor cards
│ │ ├── appointments.css # Slot grid
│ │ └── profile.css # Profile layout
│ ├── js/
│ │ ├── common.js # HMS.api, toast, requireUser, password toggle
│ │ ├── landing.js # Scroll animations
│ │ ├── auth.js # Login/register handlers
│ │ ├── dashboard.js # Role-based rendering + pending widget
│ │ ├── users.js # Admin user management
│ │ ├── doctors.js # Doctor listing + schedule
│ │ ├── appointments.js # Booking flow
│ │ ├── patients.js # Patient directory
│ │ ├── prescriptions.js # Doctor records + patient view
│ │ ├── lab.js # Lab test workflow
│ │ ├── billing.js # Invoice creation + payment
│ │ ├── departments.js # Dept CRUD
│ │ └── profile.js # Profile + photo upload
│ ├── pages/
│ │ ├── login.html
│ │ ├── register.html
│ │ ├── dashboard.html
│ │ ├── users.html # Admin: user mgmt + pending tab
│ │ ├── activity.html # Admin: audit log
│ │ ├── departments.html
│ │ ├── doctors.html
│ │ ├── patients.html
│ │ ├── appointments.html
│ │ ├── prescriptions.html
│ │ ├── lab.html
│ │ ├── billing.html
│ │ └── profile.html
│ └── uploads/ # User photo uploads (auto-created)
│
├── views/
│ └── index.html # Landing page (served at /)
│
├── .env # Local env vars (not committed)
├── .env.example # Template (committed)
├── .gitignore
├── package.json
├── package-lock.json
├── server.js # Express entry point
└── README.md


---

## 🚀 Installation

### Prerequisites
- **Node.js** ≥ 18 (tested on 20 & 24)
- **MySQL** ≥ 8 (XAMPP works — start MySQL, not Apache)
- **Git**

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/coastcare-hms.git
cd coastcare-hms

# 2. Install dependencies
npm install

# 3. Create .env from template
cp .env.example .env
# (Edit .env with your DB credentials)

# 4. Create database & seed demo data
npm run fresh

# 5. Start the server
npm run dev

Environment Variables
Create a .env file in the project root:
# Server
PORT=3000

# Database (XAMPP defaults shown)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=coastcare_db

# Auth
JWT_SECRET=change_this_to_a_long_random_secret_in_production
JWT_EXPIRES=7d

# Uploads
UPLOAD_DIR=public/uploads

# Email (optional — leave blank to log to console)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=CoastCare Hospital <noreply@coastcare.co.ke>

# SMS (optional — leave blank to log to console)
SMS_API_KEY=

▶️ Running the App
Command	What it does
npm install	Install dependencies
npm run fresh	Drop, recreate, and seed the database (safe for dev)
npm run seed	Re-seed data without dropping schema
npm run dev	Start with nodemon (auto-reload)
npm start	Production start

🔑 Default Credentials
Password for every seeded account: Password123!

Role	Email	Notes
👑 Admin	admin@coastcare.co.ke	Full system control
👨‍⚕️ Doctor	amina.mwinyi@coastcare.co.ke	Cardiology
👨‍⚕️ Doctor	baraka.juma@coastcare.co.ke	Neurology
👨‍⚕️ Doctor	zawadi.achieng@coastcare.co.ke	Pediatrics
👨‍⚕️ Doctor	jabari.mwakwere@coastcare.co.ke	Orthopedics
👨‍⚕️ Doctor	nia.kalume@coastcare.co.ke	General Medicine
🧑 Patient	juma.hassan@example.com	Active
🧑 Patient	asha.kombo@example.com	Active
🧑 Patient	omar.said@example.com	Active
🧑 Patient	fatuma.ali@example.com	Active
⏳ Pending	pending.patient@example.com	Blocked — demo approval flow
💼 Receptionist	rehema.mwinyi@coastcare.co.ke	Book/verify
🧪 Lab Tech	tumaini.wekesa@coastcare.co.ke	Lab workflow
💊 Pharmacist	bahati.nyongesa@coastcare.co.ke	Prescriptions
👥 User Roles & Permissions
Capability	Admin	Doctor	Patient	Receptionist	Lab	Pharmacist
Approve registrations	✅	—	—	—	—	—
Create any user	✅	—	—	—	—	—
Delete users	✅	—	—	—	—	—
Reset passwords	✅	—	—	—	—	—
Manage departments	✅	—	—	—	—	—
View activity log	✅	—	—	—	—	—
Create doctors	✅	—	—	—	—	—
Book appointment	✅	—	✅	✅	—	—
Confirm/complete appointment	✅	✅	—	✅	—	—
Cancel own appointment	—	—	✅	—	—	—
Issue prescriptions	—	✅	—	—	—	—
Request lab tests	✅	✅	—	—	—	—
Complete lab tests	✅	✅	—	—	✅	—
Create invoices	✅	—	—	✅	—	—
Record payments	✅	—	—	✅	—	—
View own profile	✅	✅	✅	✅	✅	✅
Upload profile photo	✅	✅	✅	✅	✅	✅
Change password/email	✅	✅	✅	✅	✅	✅
🔄 Workflow
1. Patient Self-Registration → Admin Approval
text
Patient visits /pages/register.html
    ↓
Submits form → User created with status='pending'
    ↓
Patient tries to login → "Pending admin approval"
    ↓
Admin logs in → sees pending badge + dashboard alert
    ↓
Admin approves → status='active'
    ↓
Patient logs in → full access
2. Appointment Lifecycle
text
Patient/Receptionist books → status='pending'
    ↓
Receptionist/Doctor confirms → status='confirmed'
    ↓
Reminder cron fires at 08:00 → SMS/email sent
    ↓
Doctor completes → status='completed' (or cancelled/no_show)
3. Consultation Flow
text
Doctor views today's schedule
    ↓
Opens patient → adds diagnosis, symptoms, prescriptions
    ↓
Requests lab tests if needed
    ↓
Receptionist generates invoice
    ↓
Patient pays (Cash/M-Pesa/Card/Insurance)
📡 API Reference
Auth
Method	Endpoint	Description
POST	/api/auth/register	Register patient (creates pending account)
POST	/api/auth/login	Login (blocks pending/rejected)
POST	/api/auth/logout	Clear token cookie
GET	/api/auth/me	Current user profile
Profile
Method	Endpoint	Description
PUT	/api/profile	Update personal info
POST	/api/profile/photo	Upload photo (multipart)
POST	/api/profile/password	Change password
POST	/api/profile/email	Change email
GET	/api/profile/activity	Own activity log
Users (admin only)
Method	Endpoint	Description
GET	/api/users	List all (filter by role/status)
GET	/api/users/pending	Pending registrations
POST	/api/users	Create user with password
PUT	/api/users/:id	Update user
POST	/api/users/:id/approve	Approve pending
POST	/api/users/:id/reject	Reject pending
POST	/api/users/:id/reset-password	Reset password
PATCH	/api/users/:id/toggle	Enable/disable
DELETE	/api/users/:id	Delete user
Appointments
Method	Endpoint	Description
GET	/api/appointments/slots?doctor_id=&date=	Available slots
GET	/api/appointments	List (role-aware)
POST	/api/appointments	Book
PATCH	/api/appointments/:id/status	Update status
DELETE	/api/appointments/:id	Delete (admin)
Others
GET/POST /api/departments — department CRUD

GET/POST /api/doctors — doctor listing & creation

GET/POST /api/patients — patient directory

GET/POST /api/prescriptions/records — medical records

GET/POST /api/lab — lab tests

GET/POST /api/billing — invoices

GET /api/activity — audit log (admin only)

GET /api/dashboard/summary — role-aware dashboard data

🗄 Database Schema
13 tables, fully normalized:

Table	Purpose
users	All system users (patients, doctors, staff) with status field
departments	Hospital departments
doctors	Extends users with specialization, fees
patients	Extends users with blood group, insurance
doctor_schedules	Weekly availability slots
appointments	Bookings with booking_ref
medical_records	Diagnoses, symptoms, notes
prescriptions	Multi-drug prescriptions
lab_tests	Test workflow (requested → completed)
invoices	Billing header
invoice_items	Billing line items
notifications	SMS/email log
activity_log	Full audit trail
To recreate schema:

bash
npm run fresh   # Runs reset.js then seed.js


⏳ Registration Approval Flow
Why? Prevents spam/fake accounts. Only real patients get access — admin verifies each request.

How it works technically:

POST /api/auth/register inserts with status='pending'

POST /api/auth/login returns 403 if status='pending':

json
{ "error": "Your account is pending admin approval. Please wait." }
Admin dashboard shows count + list of pending

POST /api/users/:id/approve flips status='active'

User logs in normally

Admin-created accounts skip approval — the admin is the verifier, so status='active' by default.

🧪 Testing the Flow
bash
# 1. Register a new patient at /pages/register.html
# 2. Try logging in → expect "pending admin approval"
# 3. Login as admin → approve the new user
# 4. Login as the new patient → access granted
# 5. Book an appointment → verify slot shows as booked
# 6. Login as receptionist → confirm appointment
# 7. Login as doctor → add prescription
# 8. Login as receptionist → create invoice
# 9. Verify all in activity log
🤝 Contributing
Fork the repo

Create a feature branch: git checkout -b feature/your-feature

Commit with conventional messages (see below)

Push and open a PR

Commit Convention
This project follows Conventional Commits:

text
type(scope): subject

[optional body]
Types: feat, fix, docs, style, refactor, test, chore

Examples:

feat(auth): add pending approval check on login

fix(ui): register page scroll on mobile

docs(readme): add workflow diagrams

📄 License
MIT © 2024 CoastCare HMS Contributors



