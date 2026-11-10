const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const PHOTOS = {
  f1: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&q=80',
  f2: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
  f3: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
  f4: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&q=80',
  f5: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80',
  m1: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80',
  m2: 'https://images.unsplash.com/photo-1614289371518-722f2615943d?w=400&q=80',
  m3: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80',
  m4: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80',
  m5: 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=400&q=80'
};

const newRef = () => 'BK-' + crypto.randomUUID().slice(0, 8).toUpperCase();

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'coastcare_db',
    multipleStatements: true
  });

  console.log('🔐 Generating bcrypt hash for "Password123!"');
  const hash = await bcrypt.hash('Password123!', 10);

  console.log('🧹 Clearing data...');
  await conn.query('SET FOREIGN_KEY_CHECKS=0');
  for (const t of ['activity_log','notifications','invoice_items','invoices','lab_tests','prescriptions','medical_records','appointments','doctor_schedules','patients','doctors','users','departments']) {
    await conn.query(`TRUNCATE TABLE ${t}`);
  }
  await conn.query('SET FOREIGN_KEY_CHECKS=1');

  console.log('🏥 Departments...');
  const depts = [
    ['Cardiology','Heart and cardiovascular care','Block A, Floor 2'],
    ['Neurology','Brain and nervous system','Block B, Floor 1'],
    ['Pediatrics','Child healthcare','Block C, Ground'],
    ['Orthopedics','Bone and joint care','Block A, Floor 3'],
    ['General Medicine','Primary consultation','Block D, Ground'],
    ['Dermatology','Skin conditions','Block B, Floor 2'],
    ['Radiology','Imaging diagnostics','Block E, Basement'],
    ['Emergency','24/7 emergency','Main Building'],
    ['Gynecology','Women\'s health','Block C, Floor 1'],
    ['ENT','Ear, Nose & Throat','Block A, Ground']
  ];
  for (const d of depts) await conn.query('INSERT INTO departments (name,description,location) VALUES (?,?,?)', d);

  console.log('👑 Admin...');
  await conn.query(
    'INSERT INTO users (staff_no,full_name,email,phone,password_hash,role,status,photo_url,address,gender) VALUES (?,?,?,?,?,?,?,?,?,?)',
    ['ADM-0001','System Administrator','admin@coastcare.co.ke','+254700000001',hash,'admin','active',PHOTOS.m1,'Treasury Square, Mombasa','male']
  );

  console.log('👨‍⚕️ Doctors...');
  const docDefs = [
    ['Dr. Amina Mwinyi','amina.mwinyi@coastcare.co.ke','+254700000101',PHOTOS.f1,1,'Interventional Cardiology','MBBS, MD (Cardiology)','KMPDC-11201',12,3500,'Specialist in heart disease with 12 years experience.'],
    ['Dr. Baraka Juma','baraka.juma@coastcare.co.ke','+254700000102',PHOTOS.f2,2,'Clinical Neurology','MBBS, MMED (Neuro)','KMPDC-11202',9,3000,'Neurologist focused on epilepsy and stroke.'],
    ['Dr. Zawadi Achieng','zawadi.achieng@coastcare.co.ke','+254700000103',PHOTOS.f3,3,'Pediatric Care','MBBS, DCH','KMPDC-11203',7,2500,'Pediatrician with neonatal expertise.'],
    ['Dr. Jabari Mwakwere','jabari.mwakwere@coastcare.co.ke','+254700000104',PHOTOS.m2,4,'Orthopedic Surgery','MBBS, MMed (Ortho)','KMPDC-11204',15,4000,'Joint replacement and sports injuries.'],
    ['Dr. Nia Kalume','nia.kalume@coastcare.co.ke','+254700000105',PHOTOS.f4,5,'Internal Medicine','MBBS, MMed','KMPDC-11205',6,2000,'General internal medicine expert.']
  ];
  let dcounter = 0;
  for (const d of docDefs) {
    const staffNo = 'DR-' + String(++dcounter).padStart(4,'0');
    const [u] = await conn.query(
      'INSERT INTO users (staff_no,full_name,email,phone,password_hash,role,status,photo_url,gender) VALUES (?,?,?,?,?,?,?,?,?)',
      [staffNo, d[0], d[1], d[2], hash, 'doctor', 'active', d[3], 'female']
    );
    await conn.query(
      'INSERT INTO doctors (user_id,department_id,specialization,qualification,license_number,experience_years,consultation_fee,bio) VALUES (?,?,?,?,?,?,?,?)',
      [u.insertId, d[4], d[5], d[6], d[7], d[8], d[9], d[10]]
    );
  }

  console.log('📅 Schedules...');
  const scheds = [
    [1,1,'08:00','12:00',30],[1,3,'08:00','12:00',30],[1,5,'14:00','17:00',30],
    [2,2,'09:00','13:00',30],[2,4,'09:00','13:00',30],
    [3,1,'10:00','16:00',30],[3,3,'10:00','16:00',30],[3,5,'10:00','14:00',30],
    [4,2,'08:00','12:00',30],[4,4,'14:00','18:00',30],
    [5,1,'08:00','17:00',20],[5,2,'08:00','17:00',20],[5,3,'08:00','17:00',20],[5,4,'08:00','17:00',20],[5,5,'08:00','17:00',20]
  ];
  for (const s of scheds) await conn.query('INSERT INTO doctor_schedules (doctor_id,day_of_week,start_time,end_time,slot_minutes) VALUES (?,?,?,?,?)', s);

  console.log('🧑 Patients (active)...');
  const patDefs = [
    ['Juma Hassan','juma.hassan@example.com','+254711000201',PHOTOS.m3,'1985-03-14','male','O+','Nyali, Mombasa','+254722111001','Penicillin','AAR','AAR-88213'],
    ['Asha Kombo','asha.kombo@example.com','+254711000202',PHOTOS.f5,'1992-07-22','female','A-','Bamburi, Mombasa','+254722111002','None','Jubilee','JUB-99124'],
    ['Omar Said','omar.said@example.com','+254711000203',PHOTOS.m4,'1978-11-05','male','B+','Likoni, Mombasa','+254722111003','Sulfa','NHIF','NHIF-33421'],
    ['Fatuma Ali','fatuma.ali@example.com','+254711000204',PHOTOS.f1,'2000-01-19','female','AB+','Tudor, Mombasa','+254722111004','Dust','Britam','BRI-77623']
  ];
  let pcounter = 0;
  for (const p of patDefs) {
    const patientNo = 'PAT-' + String(++pcounter).padStart(5,'0');
    const [u] = await conn.query(
      'INSERT INTO users (patient_no,full_name,email,phone,password_hash,role,status,photo_url,address,date_of_birth,gender) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [patientNo, p[0], p[1], p[2], hash, 'patient', 'active', p[3], p[7], p[4], p[5]]
    );
    await conn.query(
      'INSERT INTO patients (user_id,blood_group,allergies,emergency_contact,insurance_provider,insurance_number) VALUES (?,?,?,?,?,?)',
      [u.insertId, p[6], p[9], p[8], p[10], p[11]]
    );
  }

  // 🔶 Pending patient for demo
  console.log('⏳ Pending patient (for approval demo)...');
  const pendingPatientNo = 'PAT-' + String(++pcounter).padStart(5,'0');
  const [pu] = await conn.query(
    'INSERT INTO users (patient_no,full_name,email,phone,password_hash,role,status,address,date_of_birth,gender) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [pendingPatientNo, 'Pending Applicant','pending.patient@example.com','+254711000999', hash, 'patient', 'pending','Mtwapa, Mombasa','1995-05-12','male']
  );
  await conn.query('INSERT INTO patients (user_id,blood_group) VALUES (?,?)', [pu.insertId, 'O+']);

  console.log('👤 Staff...');
  await conn.query('INSERT INTO users (staff_no,full_name,email,phone,password_hash,role,status,photo_url,gender) VALUES (?,?,?,?,?,?,?,?,?)',
    ['RC-0001','Rehema Mwinyi','rehema.mwinyi@coastcare.co.ke','+254700000301',hash,'receptionist','active',PHOTOS.f3,'female']);
  await conn.query('INSERT INTO users (staff_no,full_name,email,phone,password_hash,role,status,photo_url,gender) VALUES (?,?,?,?,?,?,?,?,?)',
    ['LAB-0001','Tumaini Wekesa','tumaini.wekesa@coastcare.co.ke','+254700000302',hash,'lab','active',PHOTOS.m5,'male']);
  await conn.query('INSERT INTO users (staff_no,full_name,email,phone,password_hash,role,status,photo_url,gender) VALUES (?,?,?,?,?,?,?,?,?)',
    ['PHM-0001','Bahati Nyongesa','bahati.nyongesa@coastcare.co.ke','+254700000303',hash,'pharmacist','active',PHOTOS.f4,'female']);

  console.log('📋 Appointments...');
  const t1 = new Date(Date.now()+86400000).toISOString().slice(0,10);
  const t2 = new Date(Date.now()+172800000).toISOString().slice(0,10);
  const t3 = new Date(Date.now()+259200000).toISOString().slice(0,10);
  await conn.query(
    `INSERT INTO appointments (booking_ref,patient_id,doctor_id,department_id,appointment_date,start_time,end_time,reason,status) VALUES
    (?,1,1,1,?,'09:00:00','09:30:00','Chest pain follow-up','confirmed'),
    (?,2,3,3,?,'10:00:00','10:30:00','Child vaccination','pending'),
    (?,3,2,2,?,'11:00:00','11:30:00','Recurring migraines','confirmed')`,
    [newRef(), t1, newRef(), t2, newRef(), t3]
  );

  console.log('🧪 Lab tests...');
  await conn.query(`INSERT INTO lab_tests (patient_id,doctor_id,test_name,status) VALUES
    (1,1,'Full Blood Count','processing'),
    (3,2,'MRI Brain','requested')`);

  console.log('💰 Invoices...');
  const [inv1] = await conn.query(
    'INSERT INTO invoices (patient_id,invoice_number,total_amount,paid_amount,status,payment_method) VALUES (?,?,?,?,?,?)',
    [1,'INV-2024-0001',5000,2000,'partial','M-Pesa']);
  await conn.query('INSERT INTO invoice_items (invoice_id,description,amount) VALUES (?,?,?)', [inv1.insertId,'Cardiology Consultation',3500]);
  await conn.query('INSERT INTO invoice_items (invoice_id,description,amount) VALUES (?,?,?)', [inv1.insertId,'Full Blood Count',1500]);

  const [[cnt]] = await conn.query('SELECT COUNT(*) AS c FROM users');
  const [[pend]] = await conn.query("SELECT COUNT(*) AS c FROM users WHERE status='pending'");
  console.log('');
  console.log('✅ SEED COMPLETE —', cnt.c, 'users total,', pend.c, 'pending approval');
  console.log('═══════════════════════════════════════════════');
  console.log('  LOGIN: password for all is  Password123!');
  console.log('═══════════════════════════════════════════════');
  console.log('👑 Admin:          admin@coastcare.co.ke');
  console.log('👨‍⚕️ Doctor:         amina.mwinyi@coastcare.co.ke');
  console.log('🧑 Patient:        juma.hassan@example.com');
  console.log('⏳ Pending (blocked): pending.patient@example.com');
  console.log('💼 Receptionist:   rehema.mwinyi@coastcare.co.ke');
  console.log('🧪 Lab Tech:       tumaini.wekesa@coastcare.co.ke');
  console.log('💊 Pharmacist:     bahati.nyongesa@coastcare.co.ke');
  console.log('═══════════════════════════════════════════════');

  await conn.end();
}

seed().catch(e => { console.error('❌ SEED FAILED:', e); process.exit(1); });