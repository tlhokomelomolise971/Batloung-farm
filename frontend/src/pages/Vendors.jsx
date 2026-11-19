import { useRef, useState } from 'react';
import { api, money, day } from '../api.js';
import { useLoad, Loading, Message, Table, Card } from '../ui.jsx';
import PlacePicker from '../PlacePicker.jsx';

const empty = { vendor_name: '', phone_number: '', location: '', latitude: null, longitude: null };

export default function Vendors() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const list = useLoad(() => api(search ? `/vendors/search?q=${encodeURIComponent(search)}` : '/vendors'), [search]);
  const owing = useLoad(() => api('/vendors/outstanding'));
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [mapFocus, setMapFocus] = useState(null);
  const mapPanelRef = useRef(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const owed = Object.fromEntries((owing.data?.data || []).map((v) => [v.vendor_id, v.outstanding_balance]));

  async function submit(e) {
    e.preventDefault();
    try {
      if (editId) await api(`/vendors/${editId}`, { method: 'PUT', body: form });
      else await api('/vendors', { method: 'POST', body: form });
      setMsg({ type: 'ok', text: editId ? 'Vendor updated.' : 'Vendor registered.' });
      setForm(empty); setEditId(null); list.reload(); owing.reload();
    } catch (err) { setMsg({ type: 'err', text: err.message }); }
  }
  function edit(v) {
    setEditId(v.vendor_id);
    setMapFocus({ address: v.location, latitude: v.latitude, longitude: v.longitude });
    setForm({
      vendor_name: v.vendor_name,
      phone_number: v.phone_number,
      location: v.location,
      latitude: v.latitude,
      longitude: v.longitude,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function showOnMap(v) {
    setMapFocus({ address: v.location, latitude: v.latitude, longitude: v.longitude });
    mapPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <>
      <h2>Vendors</h2>
      <Message msg={msg} />
      <Card title={editId ? `Edit vendor #${editId}` : 'Register vendor'}>
        <form onSubmit={submit} className="grid">
          <label>Vendor name<input value={form.vendor_name} onChange={set('vendor_name')} required /></label>
          <label>Phone number<input value={form.phone_number} onChange={set('phone_number')} placeholder="+26658123401" required /></label>
          <div ref={mapPanelRef}>
            <PlacePicker
              label="Location"
              value={{ address: form.location, latitude: form.latitude, longitude: form.longitude }}
              onChange={({ address, latitude, longitude }) => setForm({
                ...form, location: address, latitude, longitude,
              })}
              focusLocation={mapFocus}
              required
            />
          </div>
          <div className="actions">
            <button className="primary">{editId ? 'Save changes' : 'Register'}</button>
            {editId && <button type="button" onClick={() => { setEditId(null); setForm(empty); }}>Cancel</button>}
          </div>
        </form>
      </Card>
      <Card title="Registered vendors"
        right={
          <form className="inline" onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone" />
            <button>Search</button>
            {search && <button type="button" onClick={() => { setQ(''); setSearch(''); }}>Clear</button>}
          </form>
        }>
        <Loading loading={list.loading} error={list.error} />
        <Table
          rows={list.data?.data}
          empty="No vendors found."
          columns={[
            { label: 'ID', key: 'vendor_id' }, { label: 'Name', key: 'vendor_name' }, { label: 'Phone', key: 'phone_number' },
            { label: 'Location', key: 'location' }, { label: 'Registered', render: (v) => day(v.registration_date) },
            { label: 'Owes', render: (v) => (owed[v.vendor_id] ? <b className="low">{money(owed[v.vendor_id])}</b> : money(0)) },
            { label: '', render: (v) => (
              <>
                <button type="button" onClick={() => showOnMap(v)}>Show map</button>{' '}
                <button type="button" onClick={() => edit(v)}>Edit</button>
              </>
            ) },
          ]}
        />
      </Card>
    </>
  );
}
