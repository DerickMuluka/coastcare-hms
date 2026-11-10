const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
let ME;

(async () => {
  ME = await HMS.requireUser();
  if (!ME) return;
  document.getElementById('userChip').textContent = `${ME.full_name} · ${ME.role}`;
  const deps = await HMS.api('/departments');
  document.getElementById('deptFilter').innerHTML = '<option value="">All departments</option>' +
    deps.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  document.getElementById('deptFilter').onchange = load;
  await load();
})();

async function load() {
  const dept = document.getElementById('deptFilter').value;
  const grid = document.getElementById('doctorGrid');
  grid.innerHTML = '<div class="loader-inline">Loading…</div>';
  try {
    const docs = await HMS.api('/doctors' + (dept ? `?department_id=${dept}` : ''));
    grid.innerHTML = docs.length ? docs.map(d => `
      <div class="doc-tile">
        <div class="doc-photo" style="background-image:url('${d.photo_url || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80'}')"></div>
        <div class="doc-body">
          <h3>${d.full_name}</h3>
          <div class="spec">${d.specialization || 'General Practice'}</div>
          <div class="meta">${d.department || '—'} · ${d.experience_years || 0} yrs</div>
          <div class="fee">KES ${Number(d.consultation_fee || 0).toLocaleString()}</div>
          <button class="btn btn-outline btn-sm" style="margin-top:.75rem" onclick="showSched(${d.id})">View Schedule</button>
          <div class="schedule-box" id="sched-${d.id}"></div>
        </div>
      </div>
    `).join('') : '<div class="empty">No doctors found</div>';
  } catch (e) { grid.innerHTML = `<div class="empty">${e.message}</div>`; }
}

async function showSched(id) {
  const box = document.getElementById('sched-' + id);
  box.innerHTML = 'Loading…';
  try {
    const d = await HMS.api('/doctors/' + id);
    box.innerHTML = d.schedules?.length
      ? d.schedules.map(s => `<div><span class="day">${DAYS[s.day_of_week]}</span> ${s.start_time.slice(0,5)}–${s.end_time.slice(0,5)}</div>`).join('')
      : '<div class="meta">No schedule</div>';
  } catch { box.innerHTML = '<div class="meta">Error</div>'; }
}
window.showSched = showSched;