import { useState } from 'react';
import { api, money } from '../api.js';
import { useLoad, Loading, Table, Card, Message } from '../ui.jsx';

const today = new Date().toISOString().slice(0, 10);
const monthStart = `${today.slice(0, 8)}01`;

export default function Reports() {
  const top = useLoad(() => api('/reports/top-fruits'));
  const topVendor = useLoad(() => api('/reports/top-vendor'));
  const levels = useLoad(() => api('/reports/stock-levels'));
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [rev, setRev] = useState(null);
  const [msg, setMsg] = useState(null);

  async function runRevenue(e) {
    e.preventDefault();
    try { setRev((await api(`/reports/revenue?from=${from}&to=${to}`)).data); setMsg(null); }
    catch (err) { setMsg({ type: 'err', text: err.message }); }
  }

  return (
    <>
      <h2>Reports</h2>
      <Card title="Sales revenue by date range">
        <form onSubmit={runRevenue} className="inline">
          <label>From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required /></label>
          <label>To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} required /></label>
          <button className="primary">Show</button>
        </form>
        <Message msg={msg} />
        {rev && <p className="big">{money(rev.total_revenue)} <span className="muted">from {rev.number_of_sales} sale(s)</span></p>}
      </Card>
      <Card title="Five most frequently sold fruits">
        <Loading {...top} />
        <Table rows={top.data?.data} columns={[{ label: 'Fruit', key: 'fruit_name' }, { label: 'Boxes sold', key: 'boxes_sold' }]} />
      </Card>
      <Card title="Vendor with the most boxes purchased">
        <Loading {...topVendor} />
        {topVendor.data?.data
          ? <p className="big">{topVendor.data.data.vendor_name} <span className="muted">{topVendor.data.data.total_boxes} boxes</span></p>
          : !topVendor.loading && <p className="muted">No sales yet.</p>}
      </Card>
      <Card title="Current stock (each fruit and size)">
        <Loading {...levels} />
        <Table rows={levels.data?.data} columns={[{ label: 'Fruit', key: 'fruit_name' }, { label: 'Size', key: 'packaging_size' }, { label: 'Boxes available', key: 'available_quantity' }]} />
      </Card>
    </>
  );
}
