let ME;

(async () => {
  ME = await HMS.requireUser();
  if (!ME) return;
  document.getElementById('userChip').textContent = `${ME.full_name} · ${ME.role}`;
  render(ME);
  await loadActivity();
})();

function render(u) {
  const initial = HMS.initials(u.full_name);
  const av = document.getElementById('avatarDisplay');
  if (u.photo_url) {
    av.style.backgroundImage = `url('${u.photo_url}')`;
    av.textContent = '';
  } else {
    av.textContent = initial;
  }
  document.getElementById('idLabel').textContent = u.patient_no ? 'Patient No' : 'Staff No';
  document.getElementById('idValue').textContent = u.patient_no || u.staff_no || '—';
  document.getElementById('roleBadge').textContent = u.role;
  document.getElementById('joinedAt').textContent = HMS.fmtDate(u.created_at);
  document.getElementById('lastLogin').textContent = u.last_login ? new Date(u.last_login).toLocaleString() : 'First login';

  document.getElementById('pFullName').value = u.full_name || '';
  document.getElementById('pPhone').value = u.phone || '';
  document.getElementById('pDob').value = u.date_of_birth || '';
  document.getElementById('pGender').value = u.gender || '';
  document.getElementById('pAddress').value = u.address || '';
}

document.getElementById('changePhotoBtn').onclick = () => document.getElementById('photoInput').click();
document.getElementById('photoInput').onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const fd = new FormData();
  fd.append('photo', f);
  try {
    const res = await HMS.apiForm('/profile/photo', fd);
    HMS.toast('Photo updated', 'success');
    const av = document.getElementById('avatarDisplay');
    av.style.backgroundImage = `url('${res.photo_url}?t=${Date.now()}')`;
    av.textContent = '';
  } catch (err) { HMS.toast(err.message, 'error'); }
};

document.getElementById('profileForm').onsubmit = async (e) => {
  e.preventDefault();
  try {
    await HMS.api('/profile', {
      method: 'PUT',
      body: JSON.stringify({
        full_name: document.getElementById('pFullName').value,
        phone: document.getElementById('pPhone').value,
        date_of_birth: document.getElementById('pDob').value,
        gender: document.getElementById('pGender').value,
        address: document.getElementById('pAddress').value
      })
    });
    HMS.toast('Profile updated', 'success');
    ME = await HMS.api('/auth/me');
    render(ME);
  } catch (err) { HMS.toast(err.message, 'error'); }
};

document.getElementById('emailForm').onsubmit = async (e) => {
  e.preventDefault();
  try {
    await HMS.api('/profile/email', {
      method: 'POST',
      body: JSON.stringify({
        new_email: document.getElementById('newEmail').value,
        password: document.getElementById('emailPwd').value
      })
    });
    HMS.toast('Email updated. Please re-login.', 'success');
    setTimeout(() => location.href = '/pages/login.html', 1500);
  } catch (err) { HMS.toast(err.message, 'error'); }
};

document.getElementById('pwdForm').onsubmit = async (e) => {
  e.preventDefault();
  try {
    await HMS.api('/profile/password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: document.getElementById('curPwd').value,
        new_password: document.getElementById('newPwd').value
      })
    });
    HMS.toast('Password changed', 'success');
    document.getElementById('pwdForm').reset();
  } catch (err) { HMS.toast(err.message, 'error'); }
};

async function loadActivity() {
  const tb = document.querySelector('#activityTable tbody');
  try {
    const rows = await HMS.api('/profile/activity');
    tb.innerHTML = rows.length
      ? rows.map(r => `<tr><td>${r.action}</td><td>${r.description||'—'}</td><td>${r.ip_address||'—'}</td><td>${new Date(r.created_at).toLocaleString()}</td></tr>`).join('')
      : '<tr><td colspan="4" class="empty">No activity</td></tr>';
  } catch { tb.innerHTML = '<tr><td colspan="4" class="empty">Unable to load</td></tr>'; }
}