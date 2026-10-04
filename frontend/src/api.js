const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const REFRESH_SECONDS = Number(import.meta.env.VITE_REFRESH_SECONDS) || 20;

// When the API is on another origin (split deploy or the Capacitor app) the session cookie can be blocked,
// so the server also returns a bearer token. Same-origin deployments keep using the HttpOnly cookie only.
const CROSS_ORIGIN = BASE !== '';
const TOKEN_KEY = 'aeronex_token';
export const getToken = () => { try { return CROSS_ORIGIN ? localStorage.getItem(TOKEN_KEY) : null; } catch { return null; } };
export const setToken = (t) => { try { if (!CROSS_ORIGIN) return; if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } };

export async function api(path, opts = {}) {
  const { body, headers, ...rest } = opts;
  const token = getToken();
  const h = { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(headers || {}) };
  let r;
  try {
    r = await fetch(`${BASE}/api${path}`, {
      credentials: 'include',
      headers: Object.keys(h).length ? h : undefined,
      body: body ? JSON.stringify(body) : undefined,
      ...rest,
    });
  } catch {
    throw Object.assign(new Error('Cannot reach the AeroNex server'), { status: 0 });
  }
  let data = null;
  try { data = await r.json(); } catch { /* empty body */ }
  if (r.status === 401 && token && !path.startsWith('/auth/login')) setToken(null); // expired or revoked token
  if (!r.ok) {
    const msg = r.status === 429 ? (data?.error || 'Too many requests. Please wait and try again.') : (data?.error || `Request failed (${r.status})`);
    throw Object.assign(new Error(msg), { status: r.status });
  }
  return data;
}
