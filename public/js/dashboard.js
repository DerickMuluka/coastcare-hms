(async () => {
  const u = await HMS.requireUser();
  if (!u) return;
  document.getElementById('userChip').textContent = `${u.full_name} · ${u.role}`;
  document.querySelectorAll('[data-role]').forEach(el => {
    if (el.dataset.role !== 'staff' && el.dataset.role !== u.role) el.style.display = 'none';
    if (el.dataset.role === 'staff' && !['admin','doctor','receptionist','lab'].includes(u.role)) el.style.display = 'none';
  });
  try {
    const d = await HMS.api('/dashboard/summary');
    render(u, d);
  } catch (e) { HMS.toast(e.message, 'error'); }
})();

function render(u, d) {
  const sg = document.getElementById('statsGrid');
  const ca = document.getElementById('contentArea');
  document.getElementById('welcomeSub').textContent = `Signed in as ${u.role} · ${u.patient_no || u.staff_no || ''}`;
  const card = (l, v, h='') => `<div class="stat-card"><div class="label">${l}</div><div class="value">${v}</div><div class="hint">${h}</div></div>`;

  if (u.role === 'admin' || u.role === 'receptionist') {
    const s = d.stats || {};
    if (s.pendingApprovals > 0) {
      const alert = document.getElementById('pendingAlert');
      alert.style.display = 'flex';
      document.getElementById('pendingAlertCount').textContent = s.pendingApprovals;
      const badge = document.getElementById('pendingBadge');
      if (badge) { badge.style.display = 'inline-block'; badge.textContent = s.pendingApprovals; }
    }
    sg.innerHTML = card('Patients', s.patients, 'Registered') +
      card('Doctors', s.doctors, 'Active specialists') +
      card("Today's Appointments", s.todayAppointments, `${s.confirmedToday} confirmed`) +
      card('Pending Approvals', s.pendingApprovals || 0, 'Awaiting admin review');

    const pendingHtml = (d.pendingUsers||[]).length ? `
      <div class="panel full" style="border:2px solid rgba(255,184,0,0.5);">
        <h2>⏳ Pending User Approvals</h2>
        <table class="table">
          <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Requested</th><th>Actions</th></tr></thead>
          <tbody>${d.pendingUsers.map(p => `
            <tr>
              <td><code>${p.patient_no || p.staff_no || '—'}</code></td>
              <td>${p.full_name}</td>
              <td>${p.email}</td>
              <td>${p.role}</td>
              <td>${new Date(p.created_at).toLocaleDateString()}</td>
              <td class="actions-cell">
                <button class="confirm" onclick="quickApprove(${p.id})">Approve</button>
                <button class="cancel" onclick="quickReject(${p.id})">Reject</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div style="margin-top:1rem"><a href="/pages/users.html#pending" class="btn btn-outline btn-sm">View All Pending →</a></div>
      </div>` : '';

    const recent = (d.recent||[]).map(r => `<tr><td>${r.booking_ref}</td><td>${r.patient_name}</td><td>${r.doctor_name}</td><td>${HMS.fmtDate(r.appointment_date)} ${r.start_time?.slice(0,5)}</td><td><span class="badge ${r.status}">${r.status}</span></td></tr>`).join('') || '<tr><td colspan="5" class="empty">No appointments</td></tr>';
    const depts = (d.byDepartment||[]).map(x => `<tr><td>${x.name}</td><td>${x.count}</td></tr>`).join('') || '<tr><td colspan="2" class="empty">No data</td></tr>';

    ca.innerHTML = pendingHtml + `
      <div class="panel full"><h2>Recent Appointments</h2>
        <table class="table"><thead><tr><th>Ref</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Status</th></tr></thead><tbody>${recent}</tbody></table></div>
      <div class="panel full"><h2>Appointments by Department</h2>
        <table class="table"><thead><tr><th>Department</th><th>Total</th></tr></thead><tbody>${depts}</tbody></table></div>`;
  } else if (u.role === 'doctor') {
    const s = d.stats || {};
    sg.innerHTML = card("Today's Appointments", s.todayAppointments, 'Scheduled') +
      card('Total Patients', s.totalPatients, 'In system') +
      card('Medical Records', s.records, 'Authored');
    const today = (d.today||[]).map(t => `<tr><td>${t.start_time?.slice(0,5)}</td><td>${t.patient_name}</td><td>${t.reason||'—'}</td><td><span class="badge ${t.status}">${t.status}</span></td></tr>`).join('') || '<tr><td colspan="4" class="empty">No appointments today</td></tr>';
    ca.innerHTML = `<div class="panel full"><h2>Today's Schedule</h2>
      <table class="table"><thead><tr><th>Time</th><th>Patient</th><th>Reason</th><th>Status</th></tr></thead><tbody>${today}</tbody></table></div>`;
  } else if (u.role === 'patient') {
    sg.innerHTML = card('Upcoming Visits', (d.upcoming||[]).length, 'Next 30 days') +
      card('Outstanding Balance', `KES ${Number(d.outstandingBalance||0).toLocaleString()}`, 'Total due') +
      card('Prescriptions', (d.prescriptions||[]).length, 'Active records');
    const up = (d.upcoming||[]).map(x => `<tr><td>${HMS.fmtDate(x.appointment_date)} ${x.start_time?.slice(0,5)}</td><td>${x.doctor_name}</td><td>${x.department||'—'}</td><td><span class="badge ${x.status}">${x.status}</span></td></tr>`).join('') || '<tr><td colspan="4" class="empty">No upcoming. <a href="/pages/appointments.html">Book now</a></td></tr>';
    const presc = (d.prescriptions||[]).map(p => `<tr><td>${p.medication}</td><td>${p.dosage||'—'}</td><td>${p.doctor_name}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">No prescriptions</td></tr>';
    ca.innerHTML = `<div class="panel full"><h2>Upcoming Appointments</h2>
      <table class="table"><thead><tr><th>Date</th><th>Doctor</th><th>Department</th><th>Status</th></tr></thead><tbody>${up}</tbody></table></div>
      <div class="panel full"><h2>Recent Prescriptions</h2>
      <table class="table"><thead><tr><th>Medication</th><th>Dosage</th><th>Doctor</th></tr></thead><tbody>${presc}</tbody></table></div>`;
  } else {
    sg.innerHTML = card('Access', 'Limited', `Role: ${u.role}`);
    ca.innerHTML = `<div class="panel full"><h2>Use the navigation above.</h2></div>`;
  }
}

async function quickApprove(id) {
  try {
    await HMS.api(`/users/${id}/approve`, { method: 'POST' });
    HMS.toast('User approved', 'success');
    setTimeout(() => location.reload(), 700);
  } catch (e) { HMS.toast(e.message, 'error'); }
}
async function quickReject(id) {
  if (!confirm('Reject this registration?')) return;
  try {
    await HMS.api(`/users/${id}/reject`, { method: 'POST' });
    HMS.toast('User rejected', 'error');
    setTimeout(() => location.reload(), 700);
  } catch (e) { HMS.toast(e.message, 'error'); }
}
window.quickApprove = quickApprove;
window.quickReject = quickReject;