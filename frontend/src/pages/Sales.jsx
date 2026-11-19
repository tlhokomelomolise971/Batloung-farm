import { useState } from 'react';
import { api, SIZES, money, day } from '../api.js';
import { useLoad, Loading, Message, Table, Card, Badge } from '../ui.jsx';

const blank = () => ({ fruit_id: '', packaging_size: 'SMALL', quantity: '' });

export default function Sales() {
  const vendors = useLoad(() => api('/vendors'));
  const fruits = useLoad(() => api('/fruits'));
  const history = useLoad(() => api('/sales'));
  const [vendorId, setVendorId] = useState('');
  const [items, setItems] = useState([blank()]);
  const [method, setMethod] = useState('CASH');
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState(null);
  const [paying, setPaying] = useState(null); // { sale, method, amount }

  const fruitList = fruits.data?.data || [];
  const priceOf = (it) => fruitList.find((f) => String(f.fruit_id) === String(it.fruit_id))?.prices?.[it.packaging_size] || 0;
  const setItem = (i, k, v) => setItems(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  const total = items.reduce((a, it) => a + (Number(it.quantity) || 0) * priceOf(it), 0);

  async function submit(e) {
    e.preventDefault();
    const payment = { method };
    if (method !== 'CREDIT' && amount !== '') payment.amount = Number(amount);
    try {
      const res = await api('/sales', {
        method: 'POST',
        body: {
          vendor_id: Number(vendorId),
          items: items.map((it) => ({ fruit_id: Number(it.fruit_id), packaging_size: it.packaging_size, quantity: Number(it.quantity) })),
          payment,
        },
      });
      const s = res.data;
      setMsg({ type: 'ok', text: `Sale #${s.sale_id} recorded: ${money(s.total_amount)} (${s.payment_status.replace('_', ' ')}).` });
      setItems([blank()]); setVendorId(''); setAmount(''); setMethod('CASH'); history.reload();
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  }

  async function pay(e) {
    e.preventDefault();
    try {
      await api(`/sales/${paying.sale.sale_id}/payments`, { method: 'POST', body: { method: paying.method, amount: Number(paying.amount) } });
      setMsg({ type: 'ok', text: `Payment recorded for sale #${paying.sale.sale_id}.` });
      setPaying(null); history.reload();
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  }

  return (
    <>
      <h2>Sales to vendors</h2>
      <Message msg={msg} />
      <Card title="Record sale">
        <form onSubmit={submit}>
          <label className="block">Vendor
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
              <option value="">Select vendor…</option>
              {(vendors.data?.data || []).map((v) => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name} ({v.location})</option>)}
            </select>
          </label>
          {items.map((it, i) => (
            <div className="item-row" key={i}>
              <select value={it.fruit_id} onChange={(e) => setItem(i, 'fruit_id', e.target.value)} required>
                <option value="">Fruit…</option>
                {fruitList.map((f) => <option key={f.fruit_id} value={f.fruit_id}>{f.fruit_name}</option>)}
              </select>
              <select value={it.packaging_size} onChange={(e) => setItem(i, 'packaging_size', e.target.value)}>
                {SIZES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <input type="number" min="1" step="1" placeholder="Boxes" value={it.quantity} onChange={(e) => setItem(i, 'quantity', e.target.value)} required />
              <span className="muted">{priceOf(it) ? `${money(priceOf(it))} / box` : ''}</span>
              {items.length > 1 && <button type="button" className="danger" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>✕</button>}
            </div>
          ))}
          <div className="item-row">
            <label>Payment
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="MOBILE_MONEY">Mobile money</option>
                <option value="CREDIT">Credit (pay later)</option>
              </select>
            </label>
            {method !== 'CREDIT' && (
              <label>Amount paid now (blank = full)
                <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
            )}
          </div>
          <div className="actions">
            <button type="button" onClick={() => setItems([...items, blank()])}>+ Add fruit</button>
            <strong>Total: {money(total)}</strong>
            <button className="primary">Record sale</button>
          </div>
        </form>
      </Card>

      {paying && (
        <Card title={`Add payment: sale #${paying.sale.sale_id} (owes ${money(paying.sale.outstanding_balance)})`}>
          <form onSubmit={pay} className="grid">
            <label>Method
              <select value={paying.method} onChange={(e) => setPaying({ ...paying, method: e.target.value })}>
                <option value="CASH">Cash</option><option value="MOBILE_MONEY">Mobile money</option>
              </select>
            </label>
            <label>Amount
              <input type="number" min="0.01" step="0.01" value={paying.amount} onChange={(e) => setPaying({ ...paying, amount: e.target.value })} required />
            </label>
            <div className="actions"><button className="primary">Save payment</button><button type="button" onClick={() => setPaying(null)}>Cancel</button></div>
          </form>
        </Card>
      )}

      <Card title="Sales history">
        <Loading loading={history.loading} error={history.error} />
        <Table
          rows={history.data?.data}
          columns={[
            { label: '#', key: 'sale_id' }, { label: 'Date', render: (s) => day(s.sale_date) }, { label: 'Vendor', key: 'vendor_name' },
            { label: 'Total', render: (s) => money(s.total_amount) }, { label: 'Paid', render: (s) => money(s.amount_paid) },
            { label: 'Balance', render: (s) => money(s.outstanding_balance) }, { label: 'Status', render: (s) => <Badge status={s.payment_status} /> },
            { label: '', render: (s) => s.outstanding_balance > 0 && <button onClick={() => setPaying({ sale: s, method: 'CASH', amount: '' })}>Add payment</button> },
          ]}
        />
      </Card>
    </>
  );
}
