const lf = document.getElementById('loginForm');
if (lf) {
  lf.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    try {
      const email = lf.email.value.trim();
      const password = lf.password.value;
      await HMS.api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      HMS.toast('Signed in. Redirecting…', 'success');
      setTimeout(() => location.href = '/pages/dashboard.html', 500);
    } catch (err) {
      HMS.toast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Sign In';
    }
  });
}

const rf = document.getElementById('registerForm');
if (rf) {
  rf.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwd = rf.password.value;
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd) || pwd.length < 8) {
      HMS.toast('Password must be 8+ chars with uppercase and number', 'error');
      return;
    }
    const btn = document.getElementById('submitBtn');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    try {
      const payload = {
        full_name: rf.full_name.value.trim(),
        email: rf.email.value.trim(),
        phone: rf.phone.value.trim(),
        password: pwd,
        dob: rf.dob.value,
        gender: rf.gender.value,
        blood_group: rf.blood_group.value,
        address: rf.address.value.trim(),
        emergency_contact: rf.emergency_contact.value.trim()
      };
      const res = await HMS.api('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
      HMS.toast(`Registered! Patient No: ${res.patient_no}. Awaiting admin approval.`, 'success');
      setTimeout(() => location.href = '/pages/login.html', 2000);
    } catch (err) {
      HMS.toast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Create Account';
    }
  });
}