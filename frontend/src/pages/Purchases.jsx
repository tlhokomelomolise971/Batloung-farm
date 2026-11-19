import { useState } from 'react';
import { api, SIZES, money, day } from '../api.js';
import { useLoad, Loading, Message, Table, Card } from '../ui.jsx';

const MAX_LARGE_PURCHASE_BOXES = 8;
const blank = () => ({ fruit_id: '', packaging_size: 'SMALL', quantity: '', unit_cost: '' });

export default function Purchases() {
  const suppliers = useLoad(() => api('/suppliers'));
  const fruits = useLoad(() => api('/fruits'));
  const history = useLoad(() => api('/purchases'));
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState([blank()]);
  const [msg, setMsg] = useState(null);

  const setItem = (i, k, v) => setItems((current) => current.map((item, index) => (
    index === i ? { ...item, [k]: v } : item
  )));
  const quantityLimit = (i) => {
    const item = items[i];
    if (item.packaging_size !== 'LARGE') return undefined;
    if (!item.fruit_id) return MAX_LARGE_PURCHASE_BOXES;
    const alreadyAdded = items.reduce((sum, other, otherIndex) => (
      otherIndex !== i && other.fruit_id === item.fruit_id && other.packaging_size === 'LARGE'
        ? sum + (Number(other.quantity) || 0)
        : sum
    ), 0);
    return Math.max(0, MAX_LARGE_PURCHASE_BOXES - alreadyAdded);
  };
  const setQuantity = (i, value) => setItem(i, 'quantity', value);
  const total = items.reduce((a, it) => a + (Number(it.quantity) || 0) * (Number(it.unit_cost) || 0), 0);

  async function submit(e) {
    e.preventDefault();
    try {
      await api('/purchases', {
        method: 'POST',
        body: {
          supplier_id: Number(supplierId),
          items: items.map((it) => ({ ...it, fruit_id: Number(it.fruit_id), quantity: Number(it.quantity), unit_cost: Number(it.unit_cost) })),
        },
      });
      setMsg({ type: 'ok', text: 'Purchase recorded. Stock increased.' });
      setItems([blank()]); setSupplierId(''); history.reload();
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  }

  return (
    <>
      <h2>Purchases from suppliers</h2>
      <Message msg={msg} />
      <Card title="Record purchase">
        <form onSubmit={submit}>
          <label className="block">Supplier
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
              <option value="">Select supplier…</option>
              {(suppliers.data?.data || []).map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.business_name} ({s.province})</option>)}
            </select>
          </label>
          {items.map((it, i) => (
            <div className="purchase-line" key={i}>
              <div className="item-row">
                <select value={it.fruit_id} onChange={(e) => setItem(i, 'fruit_id', e.target.value)} required>
                  <option value="">Fruit…</option>
                  {(fruits.data?.data || []).map((f) => <option key={f.fruit_id} value={f.fruit_id}>{f.fruit_name}</option>)}
                </select>
                <select value={it.packaging_size} onChange={(e) => setItem(i, 'packaging_size', e.target.value)}>
                  {SIZES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <input type="number" min="1" max={quantityLimit(i)} step="1" placeholder="Boxes" value={it.quantity} onChange={(e) => setQuantity(i, e.target.value)} required />
                <input type="number" min="0.01" step="0.01" placeholder="Cost per box" value={it.unit_cost} onChange={(e) => setItem(i, 'unit_cost', e.target.value)} required />
                {items.length > 1 && <button type="button" className="danger" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>✕</button>}
              </div>
              {it.packaging_size === 'LARGE' && Number(it.quantity) > quantityLimit(i) && (
                <p className="purchase-quantity-warning" role="alert">
                  LARGE boxes are limited to {MAX_LARGE_PURCHASE_BOXES} per fruit per purchase.
                </p>
              )}
            </div>
          ))}
          <div className="actions">
            <button type="button" onClick={() => setItems([...items, blank()])}>+ Add fruit</button>
            <strong>Total: {money(total)}</strong>
            <button className="primary">Record purchase</button>
          </div>
        </form>
      </Card>
      <Card title="Purchase history">
        <Loading loading={history.loading} error={history.error} />
        <Table
          rows={history.data?.data}
          columns={[
            { label: '#', key: 'purchase_id' }, { label: 'Date', render: (p) => day(p.purchase_date) },
            { label: 'Supplier', key: 'business_name' }, { label: 'Total', render: (p) => money(p.total_amount) },
          ]}
        />
      </Card>
    </>
  );
}
