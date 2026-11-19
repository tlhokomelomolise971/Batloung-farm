import { useState } from 'react';
import { api, SIZES, money } from '../api.js';
import { useLoad, Loading, Message, Table, Card, Badge } from '../ui.jsx';

export default function Fruits() {
  const { data, loading, error, reload } = useLoad(() => api('/fruits?status=ALL'));
  const [form, setForm] = useState({ fruit_name: '', description: '' });
  const [msg, setMsg] = useState(null);
  const [pricing, setPricing] = useState(null); // { fruit, values }

  async function add(e) {
    e.preventDefault();
    try {
      await api('/fruits', { method: 'POST', body: form });
      setMsg({ type: 'ok', text: 'Fruit registered. Now set its prices.' });
      setForm({ fruit_name: '', description: '' }); reload();
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  }
  async function toggle(f) {
    try {
      await api(`/fruits/${f.fruit_id}`, { method: 'PUT', body: { status: f.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } });
      reload();
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  }
  function openPricing(f) {
    setPricing({ fruit: f, values: Object.fromEntries(SIZES.map((s) => [s, f.prices?.[s] ?? ''])) });
  }
  async function savePrices(e) {
    e.preventDefault();
    const prices = SIZES.filter((s) => pricing.values[s] !== '').map((s) => ({ packaging_size: s, price: Number(pricing.values[s]) }));
    try {
      await api(`/fruits/${pricing.fruit.fruit_id}/prices`, { method: 'PUT', body: { prices } });
      setMsg({ type: 'ok', text: `Prices saved for ${pricing.fruit.fruit_name}.` });
      setPricing(null); reload();
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  }

  return (
    <>
      <h2>Fruits &amp; prices</h2>
      <Message msg={msg} />
      <Card title="Register new fruit">
        <form onSubmit={add} className="grid">
          <label>Fruit name<input value={form.fruit_name} onChange={(e) => setForm({ ...form, fruit_name: e.target.value })} required /></label>
          <label>Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <div className="actions"><button className="primary">Register</button></div>
        </form>
      </Card>

      {pricing && (
        <Card title={`Selling price per box: ${pricing.fruit.fruit_name}`}>
          <form onSubmit={savePrices} className="grid">
            {SIZES.map((s) => (
              <label key={s}>{s}
                <input type="number" min="0.01" step="0.01" value={pricing.values[s]}
                  onChange={(e) => setPricing({ ...pricing, values: { ...pricing.values, [s]: e.target.value } })} />
              </label>
            ))}
            <div className="actions">
              <button className="primary">Save prices</button>
              <button type="button" onClick={() => setPricing(null)}>Cancel</button>
            </div>
          </form>
        </Card>
      )}

      <Card title="All fruits">
        <Loading loading={loading} error={error} />
        <Table
          rows={data?.data}
          columns={[
            { label: 'ID', key: 'fruit_id' }, { label: 'Fruit', key: 'fruit_name' }, { label: 'Description', key: 'description' },
            ...SIZES.map((s) => ({ label: s, render: (f) => (f.prices?.[s] ? money(f.prices[s]) : '—') })),
            { label: 'Status', render: (f) => <Badge status={f.status} /> },
            { label: '', render: (f) => (<><button onClick={() => openPricing(f)}>Prices</button> <button onClick={() => toggle(f)}>{f.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button></>) },
          ]}
        />
      </Card>
    </>
  );
}
