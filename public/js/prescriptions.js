let ME, patientId = null;

(async () => {
  ME = await HMS.requireUser();
  if (!ME) return;
  document.getElementById('userChip').textContent = `${ME.full_name} · ${ME.role}`;

  if (ME.role === 'doctor') {
    document.getElementById('doctorPanel').hidden = false;
    const patients = await HMS.api('/patients');
    document.getElementById('pPatient').innerHTML = '<option value="">Select patient</option>' +
      patients.map(p => `<option value="${p.id}">${p.patient_no} · ${p.full_name}</option>`).join('');
    addRow();
    document.getElementById('addPresc').onclick = addRow;
    document.getElementById('saveRecord').onclick = save;
  } else if (ME.role === 'patient') {
    try { const m = await HMS.api('/patients/me'); patientId = m.id; } catch {}
  }
  await load();
})();

function addRow() {
  const r = document.createElement('div');
  r.className = 'grid grid-4';
  r.style.marginBottom = '.5rem';
  r.innerHTML = `
    <input placeholder="Medication" data-name="medication" />
    <input placeholder="Dosage" data-name="dosage" />
    <input placeholder="Frequency" data-name="frequency" />
    <input placeholder="Days" type="number" min="1" data-name="duration_days" />`;
  document.getElementById('prescRows').appendChild(r);
}

async function save() {
  const patient_id = document.getElementById('pPatient').value;
  if (!patient_id) { HMS.toast('Select patient', 'error'); return; }
  const prescriptions = [...document.querySelectorAll('#prescRows > div')].map(row => {
    const o = {};
    row.querySelectorAll('[data-name]').forEach(el => o[el.dataset.name] = el.value);
    return o;
  }).filter(p => p.medication);
  try {
    await HMS.api('/prescriptions/records', {
      method: 'POST',
      body: JSON.stringify({
        patient_id, diagnosis: document.getElementById('pDiag').value,
        symptoms: document.getElementById('pSymp').value,
        notes: document.getElementById('pNotes').value, prescriptions
      })
    });
    HMS.toast('Record saved', 'success');
    document.getElementById('pDiag').value = '';
    document.getElementById('pSymp').value = '';
    document.getElementById('pNotes').value = '';
    document.getElementById('prescRows').innerHTML = '';
    addRow();
    load();
  } catch (e) { HMS.toast(e.message, 'error'); }
}

async function load() {
  const tb = document.querySelector('#prescTable tbody');
  tb.innerHTML = '<tr><td colspan="7" class="empty">Loading…</td></tr>';
  try {
    if (ME.role === 'patient' && !patientId) { tb.innerHTML = '<tr><td colspan="7" class="empty">No profile linked</td></tr>'; return; }
    if (ME.role !== 'patient') { tb.innerHTML = '<tr><td colspan="7" class="empty">View patient profile for history</td></tr>'; return; }
    const rows = await HMS.api('/prescriptions/patient/' + patientId);
    tb.innerHTML = rows.length ? rows.map(p => `
      <tr><td>${HMS.fmtDate(p.created_at)}</td><td>${p.diagnosis||'—'}</td><td>${p.medication}</td>
      <td>${p.dosage||'—'}</td><td>${p.frequency||'—'}</td><td>${p.duration_days||'—'}</td><td>${p.doctor_name}</td></tr>
    `).join('') : '<tr><td colspan="7" class="empty">No prescriptions</td></tr>';
  } catch (e) { tb.innerHTML = `<tr><td colspan="7" class="empty">${e.message}</td></tr>`; }
}