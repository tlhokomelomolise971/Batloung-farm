import { useEffect, useState } from 'react';
import { api, money } from '../api.js';
import { useLoad, Loading, Table, Card } from '../ui.jsx';

export default function Dashboard({ goTo }) {
  const [services, setServices] = useState({ api: 'checking', database: 'checking' });
  const low = useLoad(() => api('/stock/low'));
  const owing = useLoad(() => api('/vendors/outstanding'));
  const top = useLoad(() => api('/reports/top-fruits'));
  const topVendor = useLoad(() => api('/reports/top-vendor'));

  useEffect(() => {
    let active = true;
    const checkServices = async () => {
      try {
        const response = await fetch('/health', { cache: 'no-store' });
        const health = await response.json();
        if (response.status !== 503 && !response.ok) {
          throw new Error(`Health check failed (${response.status})`);
        }
        if (typeof health.database !== 'string') {
          throw new Error('Health check returned an invalid response');
        }
        if (active) {
          setServices({
            api: 'online',
            database: health.database === 'connected' ? 'online' : 'offline',
          });
        }
      } catch {
        if (active) setServices({ api: 'offline', database: 'unknown' });
      }
    };

    checkServices();
    const interval = setInterval(checkServices, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const totalOwing = (owing.data?.data || []).reduce((a, v) => a + Number(v.outstanding_balance), 0);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">Farm operations / overview</p>
          <h2>Executive dashboard</h2>
          <p className="dashboard-subtitle">A clear view of inventory, receivables, and sales performance.</p>
          <div className="service-status" aria-live="polite" aria-label="Service status">
            {Object.entries(services).map(([name, status]) => (
              <span key={name} className={`service-status-item ${status}`}>
                <span className="service-status-dot" aria-hidden="true" />
                {name === 'api' ? 'API' : 'Database'}: {status}
              </span>
            ))}
          </div>
        </div>
      </header>
      <div className="stats dashboard-stats">
        <div className="stat dashboard-stat">
          <span>Low-stock items</span>
          <b>{low.data?.count ?? '–'}</b>
          <small>Items at reorder level</small>
        </div>
        <div className="stat dashboard-stat">
          <span>Vendors who owe money</span>
          <b>{owing.data?.count ?? '–'}</b>
          <small>Accounts with an open balance</small>
        </div>
        <div className="stat dashboard-stat dashboard-stat-featured">
          <span>Total outstanding</span>
          <b>{money(totalOwing)}</b>
          <small>Receivables across all vendors</small>
        </div>
        <div className="stat dashboard-stat">
          <span>Top vendor (boxes)</span>
          <b>{topVendor.data?.data?.vendor_name ?? '–'}</b>
          <small>Highest sales volume</small>
        </div>
      </div>

      <Card title="⚠ Low stock" right={<button className="link" onClick={() => goTo('purchases')}>Record purchase →</button>}>
        <Loading {...low} />
        <Table
          rows={low.data?.data}
          empty="All stock levels are fine."
          columns={[
            { label: 'Fruit', key: 'fruit_name' },
            { label: 'Size', key: 'packaging_size' },
            { label: 'Available', key: 'available_quantity' },
            { label: 'Reorder level', key: 'reorder_level' },
          ]}
        />
      </Card>

      <Card title="Vendors with outstanding payments" right={<button className="link" onClick={() => goTo('vendors')}>View vendors →</button>}>
        <Loading {...owing} />
        <Table
          rows={owing.data?.data}
          empty="No outstanding balances."
          columns={[
            { label: 'Vendor', key: 'vendor_name' },
            { label: 'Billed', render: (r) => money(r.total_billed) },
            { label: 'Paid', render: (r) => money(r.total_paid) },
            { label: 'Owes', render: (r) => <b>{money(r.outstanding_balance)}</b> },
          ]}
        />
      </Card>

      <Card title="Top 5 fruits sold (boxes)">
        <Loading {...top} />
        <Table rows={top.data?.data} columns={[{ label: 'Fruit', key: 'fruit_name' }, { label: 'Boxes sold', key: 'boxes_sold' }]} />
      </Card>
    </div>
  );
}
