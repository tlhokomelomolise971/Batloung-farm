import { useState } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import Suppliers from './pages/Suppliers.jsx';
import Fruits from './pages/Fruits.jsx';
import Stock from './pages/Stock.jsx';
import Vendors from './pages/Vendors.jsx';
import Purchases from './pages/Purchases.jsx';
import Sales from './pages/Sales.jsx';
import Reports from './pages/Reports.jsx';

const PAGES = [
  { id: 'dashboard', label: 'Dashboard', Component: Dashboard },
  { id: 'sales', label: 'Sales', Component: Sales },
  { id: 'purchases', label: 'Purchases', Component: Purchases },
  { id: 'stock', label: 'Stock', Component: Stock },
  { id: 'fruits', label: 'Fruits', Component: Fruits },
  { id: 'vendors', label: 'Vendors', Component: Vendors },
  { id: 'suppliers', label: 'Suppliers', Component: Suppliers },
  { id: 'reports', label: 'Reports', Component: Reports },
];

export default function App() {
  const [page, setPage] = useState('dashboard');
  const { Component } = PAGES.find((p) => p.id === page);

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>
          <span className="sidebar-brand-name">🍌 Batloung Farm</span>
          <span className="sidebar-fruit-icons" aria-hidden="true">🍎 🍊 🥭 🍇</span>
        </h1>
        <p className="tag">Distribution System</p>
        <nav>
          {PAGES.map((p) => (
            <button key={p.id} className={p.id === page ? 'active' : ''} onClick={() => setPage(p.id)}>
              {p.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="content">
        <Component goTo={setPage} />
      </main>
    </div>
  );
}
