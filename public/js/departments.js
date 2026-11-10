let ME;
(async () => {
  ME = await HMS.requireUser();
  if (!ME) return;
  document.getElementById('userChip').textContent = `${ME.full_name} · ${ME.role}`;
  if (ME.role === 'admin') {
    document.getElementById('addDept').hidden = false;
    document.getElementById('addDept').onclick = () => document.getElementById('deptForm').hidden = false;
    document.getElementById('saveDept').onclick = save;
  }
  await load();
})();

async function load() {
  const tb = document.querySelector('#deptTable tbody');
  tb.innerHTML = '<tr><td colspan="4" class="empty">Loading…</td></tr>';
  try {
    const rows = await HMS.api('/departments');
    tb.innerHTML = rows.map(d => `
      <tr>
        <td>${d.name}</td>
        <td>${d.description||'—'}</td>
        <td>${d.location||'—'}</td>
        <td class="actions-cell">${ME.role === 'admin' ? `<button class="danger" onclick="del(${d.id})">Delete</button>` : '—'}</td>
      </tr>`).join('') || '<tr><td colspan="4" class="empty">No departments</td></tr>';
  } catch (e) { tb.innerHTML = `<tr><td colspan="4" class="empty">${e.message}</td></tr>`; }
}

async function save() {
  const name = document.getElementById('dName').value.trim();
  if (!name) { HMS.toast('Name required', 'error'); return; }
  try {
    await HMS.api('/departments', {
      method: 'POST',
      body: JSON.stringify({
        name, description: document.getElementById('dDesc').value,
        location: document.getElementById('dLoc').value
      })
    });
    HMS.toast('Created', 'success');
    document.getElementById('deptForm').hidden = true;
    load();
  } catch (e) { HMS.toast(e.message, 'error'); }
}

async function del(id) {
  if (!confirm('Delete department?')) return;
  try { await HMS.api('/departments/' + id, { method: 'DELETE' }); HMS.toast('Deleted', 'success'); load(); }
  catch (e) { HMS.toast(e.message, 'error'); }
}
window.del = del;