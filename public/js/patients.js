let ME;
(async () => {
  ME = await HMS.requireUser();
  if (!ME) return;
  if (!['admin','doctor','receptionist','lab'].includes(ME.role)) {
    location.href = '/pages/dashboard.html'; return;
  }
  document.getElementById('userChip').textContent = `${ME.full_name} · ${ME.role}`;
  let timer;
  document.getElementById('search').oninput = () => { clearTimeout(timer); timer = setTimeout(load, 300); };
  await load();
})();

async function load() {
  const q = document.getElementById('search').value.trim();
  const tb = document.querySelector('#patientsTable tbody');
  tb.innerHTML = '<tr><td colspan="7" class="empty">Loading…</td></tr>';
  try {
    const rows = await HMS.api('/patients' + (q ? `?q=${encodeURIComponent(q)}` : ''));
    tb.innerHTML = rows.length ? rows.map(p => `
      <tr>
        <td><code>${p.patient_no}</code></td>
        <td>${p.full_name}</td>
        <td>${p.email}</td>
        <td>${p.phone||'—'}</td>
        <td>${p.gender||'—'}</td>
        <td>${p.blood_group||'—'}</td>
        <td class="actions-cell">
          <button onclick="viewPatient(${p.id})">View</button>
          ${ME.role === 'admin' ? `<button class="danger" onclick="delPatient(${p.id},'${p.full_name.replace(/'/g,'')}')">Delete</button>` : ''}
        </td>
      </tr>`).join('') : '<tr><td colspan="7" class="empty">No patients</td></tr>';
  } catch (e) { tb.innerHTML = `<tr><td colspan="7" class="empty">${e.message}</td></tr>`; }
}

async function viewPatient(id) {
  const panel = document.getElementById('detailPanel');
  panel.hidden = false;
  panel.innerHTML = '<div class="loader-inline">Loading…</div>';
  try {
    const p = await HMS.api('/patients/' + id);
    panel.innerHTML = `
      <div class="page-header" style="margin-bottom:1rem">
        <div>
          <h1 style="font-size:1.4rem">${p.full_name} · <code>${p.patient_no}</code></h1>
          <p class="page-sub">${p.email} · ${p.phone||''} · ${p.gender||''} · ${p.blood_group||''}</p>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('detailPanel').hidden=true">Close</button>
      </div>
      <div class="grid grid-2">
        <div class="panel"><h2>Appointments (${p.appointments?.length||0})</h2>
          <table class="table"><thead><tr><th>Date</th><th>Doctor</th><th>Status</th></tr></thead>
          <tbody>${(p.appointments||[]).map(a => `<tr><td>${HMS.fmtDate(a.appointment_date)}</td><td>${a.doctor_name}</td><td><span class="badge ${a.status}">${a.status}</span></td></tr>`).join('') || '<tr><td colspan="3" class="empty">None</td></tr>'}</tbody></table></div>
        <div class="panel"><h2>Records (${p.records?.length||0})</h2>
          <table class="table"><thead><tr><th>Date</th><th>Diagnosis</th><th>Doctor</th></tr></thead>
          <tbody>${(p.records||[]).map(r => `<tr><td>${HMS.fmtDate(r.visit_date)}</td><td>${r.diagnosis||'—'}</td><td>${r.doctor_name||'—'}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">None</td></tr>'}</tbody></table></div>
        <div class="panel"><h2>Lab Tests (${p.labs?.length||0})</h2>
          <table class="table"><thead><tr><th>Test</th><th>Status</th></tr></thead>
          <tbody>${(p.labs||[]).map(l => `<tr><td>${l.test_name}</td><td>${l.status}</td></tr>`).join('') || '<tr><td colspan="2" class="empty">None</td></tr>'}</tbody></table></div>
        <div class="panel"><h2>Invoices (${p.invoices?.length||0})</h2>
          <table class="table"><thead><tr><th>#</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>${(p.invoices||[]).map(i => `<tr><td>${i.invoice_number}</td><td>KES ${Number(i.total_amount).toLocaleString()}</td><td><span class="badge ${i.status}">${i.status}</span></td></tr>`).join('') || '<tr><td colspan="3" class="empty">None</td></tr>'}</tbody></table></div>
      </div>`;
  } catch (e) { panel.innerHTML = `<div class="empty">${e.message}</div>`; }
}
window.viewPatient = viewPatient;

async function delPatient(id, name) {
  if (!confirm(`Delete patient ${name}?`)) return;
  try {
    await HMS.api('/patients/' + id, { method: 'DELETE' });
    HMS.toast('Deleted', 'success'); load();
  } catch (e) { HMS.toast(e.message, 'error'); }
}
window.delPatient = delPatient;