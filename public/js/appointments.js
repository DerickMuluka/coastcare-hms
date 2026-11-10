let ME, selectedSlot = null, allDoctors = [];

(async () => {
  ME = await HMS.requireUser();
  if (!ME) return;
  document.getElementById('userChip').textContent = `${ME.full_name} · ${ME.role}`;

  await loadDepartments();
  await loadDoctors();
  await loadAppointments();

  if (['admin','receptionist'].includes(ME.role)) {
    document.getElementById('patientPickerField').style.display = '';
    const ps = await HMS.api('/patients');
    document.getElementById('patientSelect').innerHTML = '<option value="">Select patient</option>' +
      ps.map(p => `<option value="${p.id}">${p.patient_no} · ${p.full_name}</option>`).join('');
  } else if (ME.role !== 'patient') {
    document.getElementById('openBooking').style.display = 'none';
  }

  document.getElementById('openBooking').onclick = () => document.getElementById('bookingPanel').hidden = false;
  document.getElementById('cancelBook').onclick = () => document.getElementById('bookingPanel').hidden = true;
  document.getElementById('deptSelect').onchange = filterDoctors;
  document.getElementById('docSelect').onchange = loadSlots;
  document.getElementById('dateInput').onchange = loadSlots;
  document.getElementById('confirmBook').onclick = book;
  document.getElementById('statusFilter').onchange = loadAppointments;
})();

async function loadDepartments() {
  try {
    const deps = await HMS.api('/departments');
    document.getElementById('deptSelect').innerHTML = '<option value="">All departments</option>' +
      deps.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  } catch {}
}

async function loadDoctors() {
  try { allDoctors = await HMS.api('/doctors'); filterDoctors(); } catch {}
}

function filterDoctors() {
  const dept = document.getElementById('deptSelect').value;
  const list = dept ? allDoctors.filter(d => String(d.department_id) === dept) : allDoctors;
  document.getElementById('docSelect').innerHTML = '<option value="">Select doctor</option>' +
    list.map(d => `<option value="${d.id}">${d.full_name} — ${d.specialization || d.department || ''}</option>`).join('');
}

async function loadSlots() {
  const doctor_id = document.getElementById('docSelect').value;
  const date = document.getElementById('dateInput').value;
  const box = document.getElementById('slots');
  selectedSlot = null;
  if (!doctor_id || !date) { box.innerHTML = '<span class="empty">Select doctor and date</span>'; return; }
  box.innerHTML = '<span class="empty">Loading…</span>';
  try {
    const res = await HMS.api(`/appointments/slots?doctor_id=${doctor_id}&date=${date}`);
    if (!res.slots?.length) { box.innerHTML = '<span class="empty">No slots available.</span>'; return; }
    box.innerHTML = res.slots.map(s => `<button type="button" class="slot-btn" data-start="${s.start}">${s.start}</button>`).join('');
    box.querySelectorAll('.slot-btn').forEach(b => b.onclick = () => {
      box.querySelectorAll('.slot-btn').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      selectedSlot = b.dataset.start;
    });
  } catch (e) { box.innerHTML = `<span class="empty">${e.message}</span>`; }
}

async function book() {
  const doctor_id = document.getElementById('docSelect').value;
  const appointment_date = document.getElementById('dateInput').value;
  if (!doctor_id || !appointment_date || !selectedSlot) { HMS.toast('Select doctor, date and slot', 'error'); return; }
  const payload = { doctor_id, appointment_date, start_time: selectedSlot, reason: document.getElementById('reasonInput').value };
  if (['admin','receptionist'].includes(ME.role)) {
    const pid = document.getElementById('patientSelect').value;
    if (!pid) { HMS.toast('Select patient', 'error'); return; }
    payload.patient_id = pid;
  }
  try {
    const res = await HMS.api('/appointments', { method: 'POST', body: JSON.stringify(payload) });
    HMS.toast(`Booked · ${res.booking_ref}`, 'success');
    document.getElementById('bookingPanel').hidden = true;
    selectedSlot = null;
    loadAppointments();
  } catch (e) { HMS.toast(e.message, 'error'); }
}

async function loadAppointments() {
  const status = document.getElementById('statusFilter').value;
  const tb = document.querySelector('#apptTable tbody');
  tb.innerHTML = '<tr><td colspan="8" class="empty">Loading…</td></tr>';
  try {
    const rows = await HMS.api('/appointments' + (status ? `?status=${status}` : ''));
    tb.innerHTML = rows.length ? rows.map(r => `
      <tr>
        <td><code>${r.booking_ref}</code></td>
        <td>${HMS.fmtDate(r.appointment_date)}</td>
        <td>${r.start_time?.slice(0,5)}</td>
        <td>${r.patient_name}</td>
        <td>${r.doctor_name}</td>
        <td>${r.department || '—'}</td>
        <td><span class="badge ${r.status}">${r.status}</span></td>
        <td class="actions-cell">${actionsFor(r)}</td>
      </tr>`).join('') : '<tr><td colspan="8" class="empty">No appointments</td></tr>';
  } catch (e) { tb.innerHTML = `<tr><td colspan="8" class="empty">${e.message}</td></tr>`; }
}

function actionsFor(r) {
  const btns = [];
  if (ME.role === 'patient') {
    if (['pending','confirmed'].includes(r.status)) btns.push(`<button class="cancel" onclick="setStatus(${r.id},'cancelled')">Cancel</button>`);
  } else if (['admin','receptionist','doctor'].includes(ME.role)) {
    if (r.status === 'pending') btns.push(`<button class="confirm" onclick="setStatus(${r.id},'confirmed')">Confirm</button>`);
    if (r.status === 'confirmed') btns.push(`<button class="complete" onclick="setStatus(${r.id},'completed')">Complete</button>`);
    if (['pending','confirmed'].includes(r.status)) btns.push(`<button class="cancel" onclick="setStatus(${r.id},'cancelled')">Cancel</button>`);
    if (ME.role === 'admin') btns.push(`<button class="danger" onclick="delAppt(${r.id})">Delete</button>`);
  }
  return btns.join('') || '—';
}

async function setStatus(id, status) {
  try {
    await HMS.api(`/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    HMS.toast(`→ ${status}`, 'success'); loadAppointments();
  } catch (e) { HMS.toast(e.message, 'error'); }
}
window.setStatus = setStatus;

async function delAppt(id) {
  if (!confirm('Delete this appointment?')) return;
  try { await HMS.api('/appointments/' + id, { method: 'DELETE' }); HMS.toast('Deleted', 'success'); loadAppointments(); }
  catch (e) { HMS.toast(e.message, 'error'); }
}
window.delAppt = delAppt;