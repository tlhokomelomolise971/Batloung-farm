// Talks to the backend. Throws an Error with a readable message on any failure.
export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running on port 3000?');
  }
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  if (!res.ok || json?.success === false) {
    const e = json?.error;
    const extra = Array.isArray(e?.details) ? `: ${e.details.join('; ')}` : '';
    throw new Error((e?.message || `Request failed (${res.status})`) + extra);
  }
  return json;
}

export const SIZES = ['SMALL', 'MEDIUM', 'LARGE'];
export const PROVINCES = ['Gauteng', 'Free State', 'KwaZulu-Natal', 'Western Cape', 'Eastern Cape', 'Limpopo', 'Mpumalanga', 'North West'];
export const money = (n) => `M ${Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const day = (s) => (s ? String(s).slice(0, 10) : '');
