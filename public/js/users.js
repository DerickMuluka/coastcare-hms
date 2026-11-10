let currentUser, departments = [], editingId = null, resettingId = null;
let currentTab = 'all';

(async () => {
  currentUser = await HMS.requireUser();
  if (!currentUser || currentUser.role !== 'admin') {
    HMS.toast('Admin only', 'error');
    setTimeout(() => location.href = '/pages/dashboard.html', 800);
    return;
  }
  document.getElementById('userChip').textContent = `${currentUser.full_name} · admin`;
  departments = await HMS.api('/departments');
  document.getElementById('ufDept').innerHTML = '<option value="">Select department</option>' +
    departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  wire();
  await refreshPendingCount();
  if (location.hash === '#pending') switchTab('pending');
  await load();
})();

function wire() {
  document.getElementById('addUserBtn').onclick = () => openModal();
  document.getElementById('modalClose').onclick = closeModal;
  document.getElementById('modalCancel').onclick = closeModal;
  document.getElementById('userForm').onsubmit = saveUser;
  document.getElementById('ufRole').onchange = e => {
    document.getElementById('doctorFields').style.display = e.target.value === 'doctor' ? '' : 'none';
  };
  document.getElementById('roleFilter').onchange = load;
  let timer;
  document.getElementById('userSearch').oninput = () => { clearTimeout(timer); timer = setTimeout(load, 300); };
  document.getElementById('resetClose').onclick = () => document.getElementById('resetModal').hidden = true;
  document.getElementById('resetCancel').onclick = () => document.getElementById('resetModal').hidden = true;
  document.getElementById('resetForm').onsubmit = doReset;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.onclick = () => switchTab(b.dataset.tab);
  });
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  load();
}

async function refreshPendingCount() {
  try {
    const pending = await HMS.api('/users/pending');
    const c = pending.length;
    const badge = document.getElementById('tabPendingCount');
    badge.textContent = c;
    badge.style.display = c > 0 ? 'inline-block' : 'none';
  } catch {}
}

async function load() {
  const role = document.getElementById('roleFilter').value;
  const q = document.getElementById('userSearch').value.trim();
  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (q) params.set('q', q);
  if (currentTab === 'pending') params.set('status', 'pending');
  const tb = document.querySelector('#usersTable tbody');
  tb.innerHTML = '<tr><td colspan="7" class="empty">Loading…</td></tr>';
  try {
    const rows = await HMS.api('/users?' + params.toString());
    tb.innerHTML = rows.length ? rows.map(u => {
      const statusClass = u.status === 'pending' ? 'pending' : u.status === 'rejected' ? 'cancelled' : (u.is_active ? 'active' : 'inactive');
      const statusLabel = u.status === 'pending' ? 'pending' : u.status === 'rejected' ? 'rejected' : (u.is_active ? 'active' : 'disabled');
      const approveBtns = u.status === 'pending'
        ? `<button class="confirm" onclick="approveUser(${u.id})">Approve</button><button class="cancel" onclick="rejectUser(${u.id})">Reject</button>`
        : '';
      return `
      <tr>
        <td><code>${u.patient_no || u.staff_no || '—'}</code></td>
        <td>${u.full_name}</td>
        <td>${u.email}</td>
        <td>${u.role}</td>
        <td><span class="badge ${statusClass}">${statusLabel}</span></td>
        <td>${HMS.fmtDate(u.created_at)}</td>
        <td class="actions-cell">
          ${approveBtns}
          <button onclick="editUser(${u.id})">Edit</button>
          <button onclick="openReset(${u.id})">Reset Pwd</button>
          ${u.status === 'active' ? `<button onclick="toggleActive(${u.id})">${u.is_active ? 'Disable' : 'Enable'}</button>` : ''}
          <button class="danger" onclick="delUser(${u.id},'${u.full_name.replace(/'/g,'')}')">Delete</button>
        </td>
      </tr>`;
    }).join('') : '<tr><td colspan="7" class="empty">No users</td></tr>';
  } catch (e) { tb.innerHTML = `<tr><td colspan="7" class="empty">${e.message}</td></tr>`; }
}

function openModal(user = null) {
  editingId = user?.id || null;
  document.getElementById('modalTitle').textContent = user ? 'Edit User' : 'New User';
  document.getElementById('userForm').reset();
  document.getElementById('passwordField').style.display = user ? 'none' : '';
  document.getElementById('doctorFields').style.display = 'none';
  if (user) {
    document.getElementById('ufName').value = user.full_name || '';
    document.getElementById('ufEmail').value = user.email || '';
    document.getElementById('ufPhone').value = user.phone || '';
    document.getElementById('ufRole').value = user.role || '';
    document.getElementById('ufDob').value = user.date_of_birth || '';
    document.getElementById('ufGender').value = user.gender || '';
    document.getElementById('ufAddress').value = user.address || '';
    if (user.role === 'doctor') document.getElementById('doctorFields').style.display = '';
  }
  document.getElementById('userModal').hidden = false;
}

function closeModal() { document.getElementById('userModal').hidden = true; editingId = null; }

async function saveUser(e) {
  e.preventDefault();
  const btn = document.getElementById('userSaveBtn');
  btn.disabled = true;
  const payload = {
    full_name: document.getElementById('ufName').value,
    email: document.getElementById('ufEmail').value,
    phone: document.getElementById('ufPhone').value,
    role: document.getElementById('ufRole').value,
    date_of_birth: document.getElementById('ufDob').value,
    gender: document.getElementById('ufGender').value,
    address: document.getElementById('ufAddress').value
  };
  try {
    if (editingId) {
      await HMS.api('/users/' + editingId, { method: 'PUT', body: JSON.stringify(payload) });
      HMS.toast('User updated', 'success');
    } else {
      payload.password = document.getElementById('ufPassword').value;
      if (payload.password.length < 8) { HMS.toast('Password must be 8+ chars', 'error'); btn.disabled = false; return; }
      if (payload.role === 'doctor') {
        payload.department_id = document.getElementById('ufDept').value;
        payload.specialization = document.getElementById('ufSpec').value;
        payload.qualification = document.getElementById('ufQual').value;
        payload.license_number = document.getElementById('ufLic').value;
        payload.experience_years = document.getElementById('ufExp').value;
        payload.consultation_fee = document.getElementById('ufFee').value;
        payload.bio = document.getElementById('ufBio').value;
      }
      const res = await HMS.api('/users', { method: 'POST', body: JSON.stringify(payload) });
      HMS.toast(`Created ${res.patient_no || res.staff_no} · Password shared with user`, 'success');
    }
    closeModal();
    await refreshPendingCount();
    await load();
  } catch (err) { HMS.toast(err.message, 'error'); }
  btn.disabled = false;
}

async function editUser(id) {
  try {
    const u = await HMS.api('/users/' + id);
    openModal(u);
  } catch (e) { HMS.toast(e.message, 'error'); }
}
window.editUser = editUser;

function openReset(id) {
  resettingId = id;
  document.getElementById('resetForm').reset();
  document.getElementById('resetModal').hidden = false;
}
window.openReset = openReset;

async function doReset(e) {
  e.preventDefault();
  try {
    await HMS.api(`/users/${resettingId}/reset-password`, {
      method: 'POST', body: JSON.stringify({ new_password: document.getElementById('resetPassword').value })
    });
    HMS.toast('Password reset — share with user', 'success');
    document.getElementById('resetModal').hidden = true;
  } catch (err) { HMS.toast(err.message, 'error'); }
}

async function approveUser(id) {
  try {
    await HMS.api(`/users/${id}/approve`, { method: 'POST' });
    HMS.toast('User approved & activated', 'success');
    await refreshPendingCount();
    await load();
  } catch (e) { HMS.toast(e.message, 'error'); }
}
window.approveUser = approveUser;

async function rejectUser(id) {
  if (!confirm('Reject this registration?')) return;
  try {
    await HMS.api(`/users/${id}/reject`, { method: 'POST' });
    HMS.toast('User rejected', 'error');
    await refreshPendingCount();
    await load();
  } catch (e) { HMS.toast(e.message, 'error'); }
}
window.rejectUser = rejectUser;

async function toggleActive(id) {
  try {
    await HMS.api(`/users/${id}/toggle`, { method: 'PATCH' });
    load();
  } catch (e) { HMS.toast(e.message, 'error'); }
}
window.toggleActive = toggleActive;

async function delUser(id, name) {
  if (!confirm(`Delete user ${name}? This cannot be undone.`)) return;
  try {
    await HMS.api('/users/' + id, { method: 'DELETE' });
    HMS.toast('User deleted', 'success');
    await refreshPendingCount();
    load();
  } catch (e) { HMS.toast(e.message, 'error'); }
}
window.delUser = delUser;