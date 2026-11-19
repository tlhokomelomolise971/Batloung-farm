import { api, SIZES } from '../api.js';
import { useLoad, Loading, Card } from '../ui.jsx';

export default function Stock() {
  const { data, loading, error, reload } = useLoad(() => api('/stock'));

  // one row per fruit, one column per packaging size
  const byFruit = {};
  (data?.data || []).forEach((r) => {
    byFruit[r.fruit_id] ??= { name: r.fruit_name };
    byFruit[r.fruit_id][r.packaging_size] = r;
  });

  return (
    <>
      <h2>Stock levels</h2>
      <Card title="Boxes available by packaging size" right={<button onClick={reload}>Refresh</button>}>
        <Loading loading={loading} error={error} />
        <div className="table-wrap">
          <table>
            <thead><tr><th>Fruit</th>{SIZES.map((s) => <th key={s}>{s}</th>)}</tr></thead>
            <tbody>
              {Object.entries(byFruit).map(([id, f]) => (
                <tr key={id}>
                  <td>{f.name}</td>
                  {SIZES.map((s) => (
                    <td key={s} className={f[s]?.is_low ? 'low' : ''}>
                      {f[s] ? f[s].available_quantity : 0}{f[s]?.is_low ? ' ⚠' : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">⚠ = at or below the reorder level.</p>
      </Card>
    </>
  );
}
