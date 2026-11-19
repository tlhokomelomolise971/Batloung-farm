import { useRef, useState } from 'react';
import { api, PROVINCES } from '../api.js';
import { useLoad, Loading, Message, Table, Card } from '../ui.jsx';
import PlacePicker from '../PlacePicker.jsx';

const empty = {
  business_name: '', contact_person: '', phone: '', province: PROVINCES[0],
  address: '', latitude: null, longitude: null,
};

export default function Suppliers() {
  const { data, loading, error, reload } = useLoad(() => api('/suppliers'));
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [mapFocus, setMapFocus] = useState(null);
  const mapPanelRef = useRef(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    try {
      if (editId) await api(`/suppliers/${editId}`, { method: 'PUT', body: form });
      else await api('/suppliers', { method: 'POST', body: form });
      setMsg({ type: 'ok', text: editId ? 'Supplier updated.' : 'Supplier registered.' });
      setForm(empty); setEditId(null); reload();
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  }
  async function remove(s) {
    if (!window.confirm(`Delete ${s.business_name}?`)) return;
    try { await api(`/suppliers/${s.supplier_id}`, { method: 'DELETE' }); setMsg({ type: 'ok', text: 'Supplier deleted.' }); reload(); }
    catch (err) { setMsg({ type: 'err', text: err.message }); }
  }
  function edit(s) {
    setEditId(s.supplier_id);
    setMapFocus({
      address: s.address || '',
      province: s.province,
      latitude: s.latitude,
      longitude: s.longitude,
    });
    setForm({
      business_name: s.business_name,
      contact_person: s.contact_person,
      phone: s.phone,
      province: s.province,
      address: s.address || '',
      latitude: s.latitude,
      longitude: s.longitude,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function showOnMap(s) {
    setMapFocus({
      address: s.address || '',
      province: s.province,
      latitude: s.latitude,
      longitude: s.longitude,
    });
    mapPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <>
      <h2>Suppliers</h2>
      <Message msg={msg} />
      <Card title={editId ? `Edit supplier #${editId}` : 'Register supplier'}>
        <form onSubmit={submit} className="grid">
          <label>Business name<input value={form.business_name} onChange={set('business_name')} required /></label>
          <label>Contact person<input value={form.contact_person} onChange={set('contact_person')} required /></label>
          <label>Phone<input value={form.phone} onChange={set('phone')} placeholder="+27215550101" required /></label>
          <label>Province
            <select value={form.province} onChange={set('province')}>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select>
          </label>
          <div className="wide" ref={mapPanelRef}>
            <PlacePicker
              label="Address"
              value={{ address: form.address, latitude: form.latitude, longitude: form.longitude }}
              onChange={({ address, latitude, longitude }) => setForm({
                ...form, address, latitude, longitude,
              })}
              focusLocation={mapFocus}
            />
          </div>
          <div className="actions">
            <button className="primary">{editId ? 'Save changes' : 'Register'}</button>
            {editId && <button type="button" onClick={() => { setEditId(null); setForm(empty); }}>Cancel</button>}
          </div>
        </form>
      </Card>
      <Card title="All suppliers">
        <Loading loading={loading} error={error} />
        <Table
          rows={data?.data}
          columns={[
            { label: 'ID', key: 'supplier_id' }, { label: 'Business', key: 'business_name' },
            { label: 'Contact', key: 'contact_person' }, { label: 'Phone', key: 'phone' },
            { label: 'Province', key: 'province' }, { label: 'Address', key: 'address' },
            { label: '', render: (s) => (
              <>
                <button type="button" onClick={() => showOnMap(s)}>Show map</button>{' '}
                <button type="button" onClick={() => edit(s)}>Edit</button>{' '}
                <button type="button" className="danger" onClick={() => remove(s)}>Delete</button>
              </>
            ) },
          ]}
        />
      </Card>
    </>
  );
}
