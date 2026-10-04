# AeroNex — AI Flight Connection Guardian

A self-contained prototype combining the supplied aviation datasets, three ML layers, a dynamic connection engine, OpenStreetMap/Leaflet, live ADS-B when reachable, and a professional aviation-console frontend.

## What is actually trained

1. **ML-1 Delay** — XGBoost regressor using the supplied `Airlines_Dataset.csv` benchmark dataset.
2. **ML-2 Cancellation** — XGBoost classifier using the same operational benchmark data.
3. **ML-3 Connection Feasibility** — XGBoost classifier trained on **synthetic operational scenarios** generated from timing, MCT, gate, security, immigration, baggage and congestion constraints. It is deliberately named a **proxy/feasibility model** because the supplied data does not contain passenger-level caught/missed connection labels.

The UI and API therefore do not falsely claim passenger-outcome accuracy.

## Included data

All supplied source files used during construction are under `data/source/`. Processed, deployable tables are under `data/processed/`.

## Run locally

```bash
python -m venv .venv
# Windows
.venv\\Scripts\\activate
# macOS/Linux
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```
Open http://127.0.0.1:8000

## Docker

```bash
docker build -t aeronex .
docker run --rm -p 8000:8000 -e AIRPLANES_LIVE_ENABLED=1 aeronex
```

## Production deployment — Render

1. Put this folder in a GitHub repository.
2. Create a new **Web Service** on Render from the repository.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
5. Health check: `/api/health`
6. Add `AIRPLANES_LIVE_ENABLED=1`.
7. Deploy and open the Render URL.

The project is intentionally a single-service deployment: FastAPI serves both `/api/*` and the frontend. That removes CORS and Vercel/FastAPI entrypoint complexity for the first production demo.

## Real-data switches

- **Airplanes.live**: live ADS-B aircraft position. If unreachable, AeroNex displays an unavailable state instead of inventing aircraft.
- **Open-Meteo**: weather endpoint; weather is secondary and not the main connection predictor.
- **AviationStack**: optional commercial flight-status integration can be added through a backend provider adapter. Do not expose the key in frontend code.
- **MCT**: local seed contains supplied MAA plus selected public MCT planning records. The app can be extended to query the public MCT API at runtime. MCT is planning/analysis data and airline-specific rules can be stricter.

## Important model limitation

The supplied 100k benchmark dataset contains label inconsistencies; the previous benchmark achieved approximately MAE 49.7 minutes for delay and ROC-AUC 0.499 for cancellation. These are **not production-quality metrics**. AeroNex exposes the models as a working prototype and should be retrained with verified operational data before real-world use.

## Demo flow for judges

1. Search a flight such as `MAA → DEL`.
2. Run ML-1/ML-2 prediction.
3. Trigger an inbound delay.
4. Connection Guardian recomputes catch probability using MCT + remaining time + gate/security/terminal/baggage features.
5. Risk changes to SAFE/WATCH/HIGH RISK/CRITICAL.
6. Live Airspace shows real ADS-B aircraft if the provider is reachable.
7. The app never fabricates live data: unavailable providers are clearly marked.
