# AeroNex Final ZIP — Selection Report

## What was selected

This package uses the **first ZIP as the primary application** because it contains the complete React/Vite frontend, Express backend, ML service, connection-risk model, authentication, airport digital-twin UI, live-aircraft/weather adapters, tests, and project documentation.

The **second ZIP was used as a data/reference supplement**, not as the application base.

### Included from ZIP 1
- React + Vite frontend
- Express backend
- Python FastAPI ML service
- Pretrained AeroNex connection-risk artifact and model metadata
- Airport digital-twin / gate navigation components
- Flight status, trip, dashboard, support and airspace pages
- Live-provider adapters and caching logic
- Authentication and rate limiting
- ML pipeline, feature engineering, validation, model card and architecture docs

### Included from ZIP 2
- `Airlines_Dataset.csv` → copied as `ml/data/raw/indian_delay.csv` because the ML registry already expects that filename
- `india_flight_delays_2025.csv`
- airport/runway/route/reference datasets
- OurAirports and India airport reference data
- MCT/transport reference data

## Deliberately excluded

The second ZIP's standalone FastAPI backend and its XGBoost delay model were **not** made the main system. Its reported delay-model performance was weak (R² below 0 and ROC-AUC ≈ 0.51 for the severe-delay classifier), so replacing the main architecture with it would make the project less reliable.

The second ZIP's generated `__pycache__` and duplicate artifacts were also excluded.

Large generated feature/processed CSVs from ZIP 1 were excluded from the final runtime ZIP. They can be regenerated with the ML pipeline from the included raw data.

## Important ML limitation

The shipped connection model is a **prototype feasibility model**. Its label is derived from connection-buffer mathematics rather than real passenger missed-connection outcomes. Its near-perfect validation metrics therefore must **not** be presented to judges/users as real-world predictive accuracy.

The architecture keeps the deterministic Connection Guardian as an explainable fallback and clearly labels AI estimates.

## Important improvement made

The final package fixes a data-ingestion issue in `ml/src/cleaning.py`: time-only flight timestamps are now combined with `flight_date` before datetime conversion. This prevents pandas from silently assigning the computer's current date to historical flight times.

## Recommended system architecture

Frontend
→ Express API
→ live/reference flight + airspace/weather providers
→ Python FastAPI ML service
→ delay/connection intelligence
→ deterministic Connection Guardian fallback
→ passenger-facing risk, gate path and support workflow

## Runtime

The final package is intended for:
1. Frontend: Vite/React
2. Backend: Node.js/Express
3. ML service: Python/FastAPI
4. Raw/reference aviation data under `ml/data/raw`
5. Secrets only in backend environment variables

See `README.md`, `ml/SETUP.md`, `docs/FINAL_PROJECT_ARCHITECTURE.md`, and `docs/MODEL_CARD.md`.
