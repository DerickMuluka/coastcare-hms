let ME;
(async () => {
  ME = await HMS.requireUser();
  if (!ME) return;
  document.getElementById('userChip').textContent = `${ME.full_name} · ${ME.role}`;
  if (['admin','receptionist'].includes(ME.role)) {
    document.getElementById('newInvoiceBtn').hidden = false;
    document.getElementById('newInvoiceBtn').onclick = async () => {
      document.getElementById('invoiceCreator').hidden = false;
      if (!document.getElementById('invPatient').options.length) {
        const ps = await HMS.api('/patients');
        document.getElementById('invPatient').innerHTML = '<option value="">Select patient</option>' +
          ps.map(p => `<option value="${p.id}">${p.patient_no} · ${p.full_name}</option>`).join('');
        addItem(); addItem();
      }
    };
    document.getElementById('addItem').onclick = addItem;
    document.getElementById('createInvoice').onclick = create;
  }
  await load();
})();

function addItem() {
  const r = document.createElement('div');
  r.className = 'grid grid-3';
  r.style.marginBottom = '.5rem';
  r.innerHTML = `<input placeholder="Description" data-name="description" /><input type="number" placeholder="Amount KES" data-name="amount" /><div></div>`;
  document.getElementById('invItems').appendChild(r);
}

async function create() {
  const patient_id = document.getElementById('invPatient').value;
  const payment_method = document.getElementById('invMethod').value;
  const items = [...document.querySelectorAll('#invItems > div')].map(r => {
    const o = {};
    r.querySelectorAll('[data-name]').forEach(el => o[el.dataset.name] = el.value);
    return o;
  }).filter(i => i.description && i.amount).map(i => ({ description: i.description, amount: Number(i.amount) }));
  if (!patient_id || !items.length) { HMS.toast('Fill patient + 1 item', 'error'); return; }
  try {
    const res = await HMS.api('/billing', { method: 'POST', body: JSON.stringify({ patient_id, items, payment_method }) });
    HMS.toast(`Invoice ${res.invoice_number}`, 'success');
    document.getElementById('invoiceCreator').hidden = true;
    document.getElementById('invItems').innerHTML = '';
    load();
  } catch (e) { HMS.toast(e.message, 'error'); }
}

async function load() {
  const tb = document.querySelector('#invoicesTable tbody');
  tb.innerHTML = '<tr><td colspan="7" class="empty">Loading…</td></tr>';
  try {
    const rows = await HMS.api('/billing');
    tb.innerHTML = rows.length ? rows.map(i => `
      <tr>
        <td><code>${i.invoice_number}</code></td><td>${i.patient_name}</td>
        <td>KES ${Number(i.total_amount).toLocaleString()}</td>
        <td>KES ${Number(i.paid_amount).toLocaleString()}</td>
        <td><span class="badge ${i.status}">${i.status}</span></td>
        <td>${i.payment_method||'—'}</td>
        <td class="actions-cell">
          ${['admin','receptionist'].includes(ME.role) && i.status !== 'paid' ? `<button class="confirm" onclick="pay(${i.id})">Pay</button>` : ''}
          ${ME.role === 'admin' ? `<button class="danger" onclick="del(${i.id})">Delete</button>` : ''}
        </td>
      </tr>`).join('') : '<tr><td colspan="7" class="empty">No invoices</td></tr>';
  } catch (e) { tb.innerHTML = `<tr><td colspan="7" class="empty">${e.message}</td></tr>`; }
}

async function pay(id) {
  const amount = prompt('Amount (KES):');
  if (!amount) return;
  const method = prompt('Method (Cash/M-Pesa/Card):', 'Cash') || 'Cash';
  try {
    await HMS.api(`/billing/${id}/pay`, { method: 'POST', body: JSON.stringify({ amount: Number(amount), method }) });
    HMS.toast('Payment recorded', 'success'); load();
  } catch (e) { HMS.toast(e.message, 'error'); }
}
window.pay = pay;

async function del(id) {
  if (!confirm('Delete invoice?')) return;
  try { await HMS.api('/billing/' + id, { method: 'DELETE' }); HMS.toast('Deleted', 'success'); load(); }
  catch (e) { HMS.toast(e.message, 'error'); }
}
window.del = del;