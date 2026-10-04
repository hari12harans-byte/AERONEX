// Client for the optional AeroNex ML service (ml/src/api.py). Never throws into request handlers:
// every call resolves to { available: true, ...prediction } or { available: false, status, reason }.
// If the ML service is down or the model is untrained, AeroNex keeps using the deterministic Connection Guardian.

const base = () => String(process.env.ML_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS || 2500);
const COOLDOWN_MS = 15_000;
let downUntil = 0; // after a network failure, skip the ML service briefly so page loads stay fast

async function call(path, init) {
  if (Date.now() < downUntil) return { available: false, status: 'ML SERVICE UNAVAILABLE', reason: 'recent connection failure (cooling down)' };
  try {
    const r = await fetch(`${base()}${path}`, { ...init, headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const data = await r.json().catch(() => null);
    if (r.status === 503) return { available: false, status: data?.detail?.status || 'MODEL NOT TRAINED', reason: data?.detail?.detail || 'model not trained' };
    if (!r.ok) return { available: false, status: 'ML SERVICE ERROR', reason: `HTTP ${r.status}` };
    return { available: true, data };
  } catch (e) {
    downUntil = Date.now() + COOLDOWN_MS;
    return { available: false, status: 'ML SERVICE UNAVAILABLE', reason: e.name === 'TimeoutError' ? 'timeout' : e.message };
  }
}

/** Normalise a /predict response and keep the legacy field names used by the existing UI. */
function normalise(p) {
  return {
    available: true,
    probability: p.probability,
    missed_connection_probability: p.probability, // legacy alias (Guardian.jsx)
    risk: p.risk,
    model_version: p.model_version,
    top_factors: p.top_factors || [],
    connection_buffer_min: p.connection_buffer_min,
    available_time_min: p.available_time_min,
    required_time_min: p.required_time_min,
    probability_note: p.probability_note,
    data_quality: p.data_quality || {},
    timestamp: p.timestamp,
  };
}

export async function mlHealth() {
  const r = await call('/health', { method: 'GET' });
  return r.available ? { available: true, ...r.data } : r;
}
export async function mlInfo() {
  const r = await call('/model/info', { method: 'GET' });
  return r.available ? { available: true, ...r.data } : r;
}
export async function mlPredict(input) {
  const r = await call('/predict', { method: 'POST', body: JSON.stringify(stripNulls(input)) });
  return r.available ? normalise(r.data) : r;
}
export async function mlBatchPredict(items) {
  const r = await call('/batch-predict', { method: 'POST', body: JSON.stringify({ items: items.map(stripNulls) }) });
  return r.available ? { available: true, results: r.data.results } : r;
}

export async function mlPredictOperational(input) {
  const r = await call('/predict/operational', { method: 'POST', body: JSON.stringify(stripNulls(input)) });
  return r.available ? { available: true, ...r.data } : r;
}

const stripNulls = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && !Number.isNaN(v)));

/** IST hour / weekday (Monday = 0, matching the Python training features) from an ISO timestamp. */
export function istParts(iso) {
  const t = new Date(Date.parse(iso) + 330 * 60000);
  return { hour_of_day: t.getUTCHours(), day_of_week: (t.getUTCDay() + 6) % 7 };
}

