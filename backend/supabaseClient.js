// AeroNex Supabase Data Persistence Layer
// Securely interfaces with Supabase tables (trips, flight_events, predictions, connection_assessments, notifications).
// Uses Service Role Key on backend only; never exposed to browser.
// Gracefully falls back to local storage when Supabase environment variables are unset.

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const isConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

if (isConfigured) {
  console.log('[Supabase] Configured with endpoint:', SUPABASE_URL);
} else {
  console.log('[Supabase] Keys not provided in .env; utilizing local persistent JSON store (data/db.json).');
}

async function supabaseFetch(table, options = {}) {
  if (!isConfigured) return null;
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: options.prefer || 'return=representation',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[Supabase] Table ${table} HTTP ${res.status}:`, errText);
      return null;
    }
    return await res.json().catch(() => null);
  } catch (e) {
    console.warn(`[Supabase] Network error accessing ${table}:`, e.message);
    return null;
  }
}

export const supabaseService = {
  isConfigured() {
    return isConfigured;
  },

  async logFlightEvent(event) {
    if (!isConfigured) return null;
    return supabaseFetch('flight_events', {
      method: 'POST',
      body: JSON.stringify({
        flight_number: event.flightNumber,
        event_type: event.type,
        delay_minutes: event.delayMinutes || 0,
        gate: event.gate || null,
        created_at: new Date().toISOString(),
        details: event,
      }),
    });
  },

  async logPrediction(pred) {
    if (!isConfigured) return null;
    return supabaseFetch('predictions', {
      method: 'POST',
      body: JSON.stringify({
        model_version: pred.model_version || 'aeronex-xgb-v1',
        probability: pred.probability,
        risk: pred.risk,
        created_at: new Date().toISOString(),
        inputs: pred.data_quality?.provided || [],
        metadata: pred,
      }),
    });
  },

  async logConnectionAssessment(assessment) {
    if (!isConfigured) return null;
    return supabaseFetch('connection_assessments', {
      method: 'POST',
      body: JSON.stringify({
        available_min: assessment.availableMin,
        required_min: assessment.requiredMin,
        buffer_min: assessment.bufferMin,
        risk: assessment.risk,
        created_at: new Date().toISOString(),
      }),
    });
  },

  async saveNotification(userId, notif) {
    if (!isConfigured) return null;
    return supabaseFetch('notifications', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        created_at: notif.time || new Date().toISOString(),
      }),
    });
  },
};
