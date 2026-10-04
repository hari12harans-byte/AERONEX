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
AERONEX SYSTEM
   │
   ├── Frontend (Vite + React 18 + Leaflet) ── Port 5173
   │     ├── Leaflet + OpenStreetMap Basemap
   │     ├── Airport Digital Twin & Terminal Blueprints
   │     ├── Live Airspace Radar View
   │     ├── Flight Search & Journey Status
   │     └── Gate-to-Gate Transfer Calculator
   │
   ├── Backend API (Node.js + Express) ──────── Port 8000
   │     ├── Geospatial Airport Resolver & Nearest Airport Engine
   │     ├── Flight Normalization & Reference Fallbacks
   │     ├── Connection Risk & Buffer Evaluation
   │     └── ML Client Forwarding & Health Diagnostics
   │
   └── ML Service (FastAPI + Uvicorn) ────────── Port 5000
         ├── XGBoost Flight Delay Regressor (`aeronex_delay_xgb.joblib`)
         ├── XGBoost Flight Cancellation Classifier (`aeronex_cancellation_xgb.joblib`)
         └── Calibrated Connection Risk Model (`aeronex_connection_model.joblib`)
```

---

## 🚀 Quick Start

### 1. Prerequisites
* **Node.js**: v18.17 or higher
* **Python**: v3.10 or higher

### 2. Automated Single-Click Launch (Windows)
Double-click `run_all.bat` in the project root to start all three services in separate terminals:
```cmd
run_all.bat
```

### 3. Manual Startup

#### Step A: Configure Environment
Copy the example configuration to `.env`:
```bash
cp .env.example .env
```

#### Step B: Launch ML Service
```bash
cd ml
pip install -r requirements.txt
python -m uvicorn src.api:app --host 127.0.0.1 --port 5000
```

#### Step C: Launch Backend API
```bash
cd backend
npm install
npm start
```
*Backend runs on `http://localhost:8000`.*

#### Step D: Launch Frontend UI
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173` with Vite HMR and automatic API proxying.*

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
