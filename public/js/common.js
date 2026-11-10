window.HMS = {
  async api(path, opts = {}) {
    const res = await fetch('/api' + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
    });
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data?.error || 'Request failed');
    return data;
  },

  async apiForm(path, formData) {
    const res = await fetch('/api' + path, { credentials: 'include', method: 'POST', body: formData });
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data?.error || 'Upload failed');
    return data;
  },

  toast(msg, type = 'info') {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = 'toast show ' + (type === 'error' ? 'error' : type === 'success' ? 'success' : '');
    clearTimeout(t._tm);
    t._tm = setTimeout(() => t.classList.remove('show'), 3500);
  },

  logout() {
    this.api('/auth/logout', { method: 'POST' }).finally(() => location.href = '/pages/login.html');
  },

  async requireUser() {
    try { return await this.api('/auth/me'); }
    catch { location.href = '/pages/login.html'; return null; }
  },

  initials(name) {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).slice(0,2).join('').toUpperCase();
  },

  fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }
};

const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 20));
  const tg = document.getElementById('navToggle');
  if (tg) tg.addEventListener('click', () => navbar.classList.toggle('open'));
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.password-toggle');
  if (!btn) return;
  const input = document.getElementById(btn.dataset.target);
  if (!input) return;
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  const eye = btn.querySelector('.eye'), eyeOff = btn.querySelector('.eye-off');
  if (eye) eye.style.display = showing ? '' : 'none';
  if (eyeOff) eyeOff.style.display = showing ? 'none' : '';
});