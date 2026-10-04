# AeroNex — Intelligent Aviation & Airport Concourse Ecosystem

> **Your Next Connection, Always On Time.**  
> AeroNex is an intelligent airport operations and passenger transfer ecosystem combining real-time flight telemetry, machine-learning delay & cancellation risk scoring, interactive airport digital twins with OpenStreetMap, and concourse gate navigation.

---

## 🌟 Key Features

* **Interactive Airport Digital Twin**:
  * Powered by **Leaflet & OpenStreetMap** (zero API keys or external subscriptions required).
  * Real-world geographic runways, multi-terminal airside buildings, ground transit hubs, ATC control towers, and perimeter boundaries.
  * Layer switching between **Real Map** (OpenStreetMap), **Satellite** (with safe fallback notices), and **Blueprint** (indoor concourse terminal schematic).
  * Instant **Locate Me** geolocation that pinpoints your location and identifies the nearest airport with distance via Haversine calculations.

* **Live Airspace & Flight Tracker**:
  * Real-time aircraft ADS-B tracking via OpenSky / airplanes.live with smooth radar styling.
  * Flight searches, departure/arrival schedules, and gate assignments across major domestic and international hubs.
  * Graceful offline fallbacks if external radar feeds are delayed or unreachable.

* **Machine-Learning Connection Guardian**:
  * Pre-trained **XGBoost** models for severe delay probability, flight cancellation risk, and missed connection prediction.
  * Built on calibrated scikit-learn and XGBoost pipelines evaluated against historical DGCA and flight dataset records.
  * Calculates effective connection buffers: deplaning, security screening, gate walks, terminal transfers, and boarding cut-offs.

* **Gate Navigation & Concourse Calculator**:
  * Interactive airside walking route planner with estimated walking times, terminal shuttle metrics, and security screening delays.
  * Direct telemetry feeding into the Connection Guardian risk engine.

---

## 🏗️ Architecture

```
AERONEX UNIFIED DEPLOYMENT (RENDER / LOCAL)
   │
   ├── Frontend (Static Leaflet + OpenStreetMap + Space-Age Dark Theme)
   │     ├── Leaflet + OpenStreetMap Basemap (Zero CARTO dependency)
   │     ├── Airport Digital Twin & Terminal Blueprints
   │     ├── Live Airspace Radar View (Airplanes.live)
   │     ├── Flight Search & Journey Status
   │     └── Gate-to-Gate Transfer Calculator
   │
   └── Backend & ML Engine (FastAPI + Uvicorn + XGBoost) ── Port $PORT / 8000
         ├── Pre-trained XGBoost Models (`models/aeronex_*_xgb.joblib`)
         │     ├── Delay Prediction Pipeline (`aeronex_delay_xgb.joblib`)
         │     ├── Cancellation Prediction Pipeline (`aeronex_cancellation_xgb.joblib`)
         │     └── Connection Feasibility Proxy Pipeline (`aeronex_connection_xgb_proxy.joblib`)
         ├── Geospatial Airport Resolver & Nearest Airport Engine (MAA, BOM, DEL, etc.)
         ├── Flight Normalization & Reference Fallbacks (Schedule + Historical)
         ├── Minimum Connect Time (MCT) Engine & Connection Guardian Risk Scoring
         ├── Open-Meteo Weather Integration
         ├── Optional Supabase Runtime Persistence Integration
         └── Static Single-Page App Hosting (`/`, `/app.js`, `/styles.css`)
```

---

## ☁️ Render Deployment (Production)

This repository is configured for direct deployment on **Render** as a Python Web Service.

| Setting | Value |
| :--- | :--- |
| **Root Directory** | *(Leave empty - repo root)* |
| **Runtime** | `Python` (or `Docker` using included `Dockerfile`) |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn backend.main:app --host 0.0.0.0 --port $PORT` |
| **Health Check Path** | `/api/health` |
| **Auto-Deploy** | Yes (triggers on pushes to `main`) |

### Environment Variables
Configure these in the Render Dashboard (optional overrides):
* `AIRPLANES_LIVE_ENABLED=1`
* `OPEN_METEO_ENABLED=1`
* `SUPABASE_URL=` *(optional)*
* `SUPABASE_ANON_KEY=` *(optional)*
* `SUPABASE_SERVICE_ROLE_KEY=` *(optional, backend-only)*

---

## 🚀 Local Quick Start

### 1. Prerequisites
* **Python**: v3.10, 3.11, or 3.12

### 2. Setup & Run
```bash
# Clone the repository
git clone https://github.com/hari12harans-byte/AeroNex.git
cd AeroNex

# Install dependencies
pip install -r requirements.txt

# Run the unified server
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser. All API endpoints and frontend features are live!

---

## 🗺️ Geospatial & Map Provider Configuration

AeroNex is built using **Leaflet** with **OpenStreetMap** tiles:
* **Basemap Tile URL**: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
* **Attribution**: `© OpenStreetMap contributors`
* **Zero CARTO dependency**: Free of proprietary basemap API keys, usage limits, or watermark errors.

### Nearest Airport Geolocation API
```http
GET /api/airports/nearest?lat=13.0827&lon=80.2707
```
**Response:**
```json
{
  "airport_name": "Chennai International Airport",
  "iata": "MAA",
  "icao": "VOMM",
  "city": "Chennai",
  "country": "IN",
  "latitude": 12.9941,
  "longitude": 80.1709,
  "distance_km": 14.6
}
```

---

## 🤖 Machine Learning Models

* Delay and cancellation models are located in `ml/models/`.
* Pipeline training and feature generation routines are documented in [`ml/SETUP.md`](ml/SETUP.md).
* Dataset provenance and canonical schemas are documented in [`docs/CANONICAL_SCHEMA.md`](docs/CANONICAL_SCHEMA.md) and [`docs/DATASET_SELECTION_REPORT.md`](docs/DATASET_SELECTION_REPORT.md).

---

## 📄 License
This project is licensed under the MIT License.
