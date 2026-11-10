let ME;
(async () => {
  ME = await HMS.requireUser();
  if (!ME) return;
  document.getElementById('userChip').textContent = `${ME.full_name} · ${ME.role}`;
  if (['doctor','admin'].includes(ME.role)) {
    document.getElementById('labActions').hidden = false;
    const ps = await HMS.api('/patients');
    document.getElementById('labPatient').innerHTML = '<option value="">Select patient</option>' +
      ps.map(p => `<option value="${p.id}">${p.patient_no} · ${p.full_name}</option>`).join('');
    document.getElementById('requestLab').onclick = request;
  }
  await load();
})();

async function request() {
  const patient_id = document.getElementById('labPatient').value;
  const test_name = document.getElementById('labTest').value.trim();
  if (!patient_id || !test_name) { HMS.toast('Fill fields', 'error'); return; }
  try {
    await HMS.api('/lab', { method: 'POST', body: JSON.stringify({ patient_id, test_name }) });
    HMS.toast('Requested', 'success');
    document.getElementById('labTest').value = '';
    load();
  } catch (e) { HMS.toast(e.message, 'error'); }
}

async function load() {
  const tb = document.querySelector('#labTable tbody');
  tb.innerHTML = '<tr><td colspan="6" class="empty">Loading…</td></tr>';
  try {
    const rows = await HMS.api('/lab');
    tb.innerHTML = rows.length ? rows.map(l => `
      <tr>
        <td>${l.patient_name}</td><td>${l.test_name}</td><td>${l.doctor_name||'—'}</td>
        <td><span class="badge ${l.status==='completed'?'completed':l.status==='cancelled'?'cancelled':'pending'}">${l.status}</span></td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis">${l.result_text||'—'}</td>
        <td class="actions-cell">
          ${['lab','admin','doctor'].includes(ME.role) && l.status !== 'completed' ? `<button class="confirm" onclick="done(${l.id})">Complete</button>` : ''}
          ${ME.role === 'admin' ? `<button class="danger" onclick="del(${l.id})">Delete</button>` : ''}
        </td>
      </tr>`).join('') : '<tr><td colspan="6" class="empty">No lab tests</td></tr>';
  } catch (e) { tb.innerHTML = `<tr><td colspan="6" class="empty">${e.message}</td></tr>`; }
}

async function done(id) {
  const result = prompt('Enter result summary:');
  try {
    await HMS.api('/lab/' + id, { method: 'PATCH', body: JSON.stringify({ status: 'completed', result_text: result }) });
    HMS.toast('Completed', 'success'); load();
  } catch (e) { HMS.toast(e.message, 'error'); }
}
window.done = done;

async function del(id) {
  if (!confirm('Delete lab test?')) return;
  try { await HMS.api('/lab/' + id, { method: 'DELETE' }); HMS.toast('Deleted', 'success'); load(); }
  catch (e) { HMS.toast(e.message, 'error'); }
}
window.del = del;