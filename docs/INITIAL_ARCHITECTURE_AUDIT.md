# AeroNex — Initial Architecture Audit

Written BEFORE the ML upgrade, from the contents of `AeroNex_with_Indian_AI_ML.zip` (root folder `aeronex_ml_work`).
Nothing below was run against live providers; this is a static code read.

## 1. Repository layout
| Path | Role |
|---|---|
| `frontend/` | React + Vite SPA (react-router, lucide-react), PWA (`public/sw.js`, manifest), Capacitor config |
| `backend/server.js` (672 lines) | Express API, ESM, single file; only dependency is `express` |
| `backend/data.js` | Reference/demo data: 9 airports, 5 airlines, 12 DEMO flights, schematic terminal POIs, transport |
| `ml/` | Early ML scaffold (`pipeline.py`, `train.py`, `api.py`) — see §7 |
| `README.md`, `ml/README.md`, `ml/SETUP.md`, `ml/data/README.md` | Docs |
| `.env.example` | Environment template |

Not present in the zip: Dockerfile / docker-compose, tests, CI config, any raw dataset, any trained model, `.git`.

## 2. Frontend
Pages: Landing, Auth, Dashboard, Trip, FlightStatus, AirspacePage, Twin, GateNavigation, Services, Support, Legal, NotFound.
Components: `Guardian.jsx` (Connection Guardian card), `Airspace.jsx`, `TwinMap.jsx`, `FlightSearch.jsx`, `HeroScene.jsx`, `ErrorBoundary.jsx`, `ui.jsx` (Card, RiskBadge, SourceBadge).
`api.js` wraps `fetch` with cookie session plus bearer-token fallback for cross-origin/Capacitor builds (`VITE_API_BASE_URL`).
`Guardian.jsx` already renders `trip.ml.missed_connection_probability` and `ml.risk` when present.

## 3. Backend
Express app with: security headers, CORS allow-list, per-IP rate limits (300/min API, login/sign-up limits), cookie or bearer auth (`requireAuth`), local JSON store under `backend/data/` (development only; Supabase is reserved, not wired).

### Existing API endpoints
`GET /api/health`, `GET /api/system/status`, `GET /api/config`, `POST /api/auth/{register,login,logout}`, `GET /api/auth/me`,
`GET /api/airports`, `GET /api/weather`, `GET /api/live/aircraft`, `GET /api/flights/search`,
`GET /api/trip`, `POST /api/connection/analyze`, `POST /api/simulation/event`,
`GET /api/baggage`, `GET /api/transport`, `GET /api/hotels`, `GET /api/airport/twin`, `GET /api/gate/route`,
`GET /api/notifications`, `POST /api/notifications/read`, `GET /api/emergency`, `POST /api/assistance`,
`GET /api/recovery`, `POST /api/assistant`.

## 4. Data sources today
- LIVE: airplanes.live (aircraft), Open-Meteo (weather), AviationStack (only if key set).
- REFERENCE: OpenStreetMap hotels, schematic airport twin (not a surveyed floor plan).
- DEMO: flight schedule, trip (AI255 → AI887 via DEL), baggage, notifications, transport ETAs.

## 5. Existing deterministic risk engine (`assessConnection`, server.js ~L224)
```
available = (connecting estimatedDeparture − arriving estimatedArrival) in minutes   # delay already inside estimated times
required  = DEPLANE 10 + immigration + security + gate walk + BOARDING_CUTOFF 20
buffer    = available − required
risk      = buffer ≥30 LOW | ≥10 MEDIUM | ≥0 HIGH | <0 CRITICAL
```
This is the explainable baseline. It is preserved unchanged; the ML layer is additive.

## 6. Authentication
HttpOnly cookie session, optional bearer token for split deploys, scrypt/crypto in server.js, JSON file user store. Production needs `AUTH_SECRET`, `COOKIE_SECURE=1`, `TRUST_PROXY=1`.

## 7. Existing ML functionality (audited — problems found)
`ml/src/pipeline.py`, `train.py`, `api.py`, a pinned `requirements.txt`, and docs. Findings:

1. **Training features are random.** `build_features()` draws `connection_time_min`, `gate_walk_min`, `security_min`, `immigration_min`, `gate_change`, `terminal_change`, `weather_risk`, `airport_congestion` from `numpy` RNGs. Only airline/airports/delays/hour come from raw data.
2. **The label is a formula of those random columns plus Gaussian noise.** A model trained on it learns the formula; its metrics say nothing about real missed connections. The `label_source` string says "derived prototype", but the metrics reported by `train.py` would still look like real performance.
3. **Random train/test split** (`train_test_split`, stratified) instead of the time-based split the new spec requires.
4. **No raw data and no trained model ship in the zip.** `ml/README`/`SETUP` quote "147,073 schedule rows"; that figure is unverifiable from the repository and was not carried into the new docs.
5. `api.py`: single `/predict` returning `missed_connection_probability`; no model metadata, no explanation, no `/model/info`, `/batch-predict`; `@app.on_event` is deprecated in current FastAPI; field names (`security_min`) differ from the new spec (`security_time_min`).
6. Backend hooks: `/api/trip` and `/api/connection/analyze` call `mlPredict()` inline in `server.js` with a 2.5 s timeout and fall back to `ml: null`. `/api/trip` sends hard-coded `weather_risk: 0.2`, `airport_congestion: 0.5`, `arrival_delay_min: 0`, and infers `gate_change` from `departureGate !== 'A12'` (a demo heuristic, not an observation).
7. No `ml/config`, adapters, cleaning, validation, provenance registry, model card or tests.

## 8. Deployment & mobile
Single-service deploy (`node backend/server.js` serving `frontend/dist`); split deploy via `ALLOWED_ORIGINS` + `VITE_API_BASE_URL`. Capacitor config is in `frontend/capacitor.config.json`. No Docker files exist.

## 9. Environment variables in use
`API_BASE_URL`, `ALLOWED_ORIGINS`, `COOKIE_SECURE`, `REFRESH_SECONDS`, `OPEN_METEO_ENABLED`, `AIRPLANES_LIVE_*`, `AVIATIONSTACK_API_KEY`, `ML_API_URL`, plus production `AUTH_SECRET`, `NODE_ENV`, `TRUST_PROXY`, `VITE_SITE_URL`. Reserved but unused: Supabase, Google OAuth, n8n, WhatsApp, `OPENFLIGHTS_ENABLED`, `SEED_DEMO_ACCOUNT`.
Note: `.env.example` sets `API_BASE_URL=http://localhost:8000` while README says the API is on :4000.

## 10. Consequences for the upgrade
- Keep every endpoint and the deterministic engine; add ML as optional enrichment with graceful fallback.
- Replace the random-feature pipeline with a provenance-tracked pipeline; mark all labels `DERIVED PROTOTYPE LABEL`.
- Ship NO trained model and NO metrics unless produced from real data on the user's machine (`MODEL NOT TRAINED`).
