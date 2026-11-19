import { useEffect, useState } from 'react';

// Load data from the API; call reload() after changes.
export function useLoad(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    loader()
      .then((d) => live && setState({ data: d, loading: false, error: '' }))
      .catch((e) => live && setState({ data: null, loading: false, error: e.message }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return { ...state, reload: () => setN((x) => x + 1) };
}

export const Message = ({ msg }) =>
  msg ? <div className={`msg ${msg.type}`}>{msg.text}</div> : null;

export const Loading = ({ loading, error }) =>
  error ? <div className="msg err">{error}</div> : loading ? <p className="muted">Loading…</p> : null;

export function Table({ columns, rows, empty = 'Nothing here yet.' }) {
  if (!rows?.length) return <p className="muted">{empty}</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((c) => <th key={c.label}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i}>{columns.map((c) => <td key={c.label}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Badge = ({ status }) => <span className={`badge ${status}`}>{status.replace('_', ' ')}</span>;
export const Card = ({ title, children, right }) => (
  <section className="card">
    <div className="card-head"><h3>{title}</h3>{right}</div>
    {children}
  </section>
);
