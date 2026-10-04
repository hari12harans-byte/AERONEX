from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from pathlib import Path
import pandas as pd, numpy as np, json, os, math, time, requests
import joblib

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data' / 'processed'
MODELS = ROOT / 'models'

app = FastAPI(title='AeroNex — Flight Connection Guardian', version='1.0.0')

# Production-safe CORS configuration (avoid wildcard with credentials)
ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://127.0.0.1:5173',
    'https://aeronex-bmvv.onrender.com'
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r'https://.*\.onrender\.com',
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Optional Supabase Runtime Initialization
SUPABASE_URL = os.getenv('SUPABASE_URL', '').strip()
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', '').strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '').strip()

supabase_client = None
if SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY):
    try:
        from supabase import create_client
        key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
        supabase_client = create_client(SUPABASE_URL, key)
        print('[Supabase] Initialized runtime connection successfully.')
    except Exception as e:
        print(f'[Supabase] Optional initialization warning: {e}')

# Load Data Resources
with open(DATA / 'priors.json', encoding='utf-8') as f:
    PRIORS = json.load(f)

AIRPORTS = pd.read_csv(DATA / 'airports_india.csv').fillna('')
SCHEDULE = pd.read_csv(DATA / 'flight_schedule_search.csv').fillna('')
HISTORY = pd.read_csv(DATA / 'flight_history_search.csv').fillna('')
MCT = pd.read_csv(DATA / 'mct_india.csv').fillna('')
TRAINING_DATA = pd.read_csv(ROOT / 'data' / 'training' / 'AeroNex_Training_Dataset.csv').fillna(0)

# Load Trained XGBoost & Scikit-Learn Models
try:
    DELAY_MODEL = joblib.load(MODELS / 'aeronex_delay_xgb.joblib')
except Exception as e:
    print(f'[ML] Warning loading delay model: {e}')
    DELAY_MODEL = None

try:
    CANCEL_MODEL = joblib.load(MODELS / 'aeronex_cancellation_xgb.joblib')
except Exception as e:
    print(f'[ML] Warning loading cancellation model: {e}')
    CANCEL_MODEL = None

try:
    CONN_MODEL = joblib.load(MODELS / 'aeronex_connection_xgb_proxy.joblib')
except Exception as e:
    print(f'[ML] Warning loading connection model: {e}')
    CONN_MODEL = None

ALIAS_MAP = {
    'MADRAS': 'MAA', 'CHENNAI': 'MAA', 'BOMBAY': 'BOM', 'MUMBAI': 'BOM',
    'CALCUTTA': 'CCU', 'KOLKATA': 'CCU', 'BANGALORE': 'BLR', 'BENGALURU': 'BLR',
    'DELHI': 'DEL', 'NEW DELHI': 'DEL', 'COCHIN': 'COK', 'KOCHI': 'COK',
    'HYDERABAD': 'HYD', 'AHMEDABAD': 'AMD', 'GOA': 'GOI', 'PUNE': 'PNQ',
    'JAIPUR': 'JAI', 'LUCKNOW': 'LKO', 'TRIVANDRUM': 'TRV',
    'THIRUVANANTHAPURAM': 'TRV', 'COIMBATORE': 'CJB'
}

def resolve_airport_query(q: str):
    if not q:
        return None
    qu = q.strip().upper()
    if qu in ALIAS_MAP:
        iata = ALIAS_MAP[qu]
        m = AIRPORTS[AIRPORTS['iata_code'].astype(str).str.upper() == iata]
        if not m.empty:
            return m.iloc[0].to_dict()
    m = AIRPORTS[AIRPORTS['iata_code'].astype(str).str.upper() == qu]
    if not m.empty:
        return m.iloc[0].to_dict()
    m = AIRPORTS[AIRPORTS['icao_code'].astype(str).str.upper() == qu]
    if not m.empty:
        return m.iloc[0].to_dict()
    m = AIRPORTS[AIRPORTS['city'].astype(str).str.upper() == qu]
    if not m.empty:
        return m.iloc[0].to_dict()
    m = AIRPORTS[AIRPORTS['airport_name'].astype(str).str.upper().str.contains(qu, na=False)]
    if not m.empty:
        return m.iloc[0].to_dict()
    m = AIRPORTS[AIRPORTS['city'].astype(str).str.upper().str.contains(qu, na=False)]
    if not m.empty:
        return m.iloc[0].to_dict()
    return None

def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def find_nearest_airport(lat: float, lon: float):
    best = None
    min_dist = float('inf')
    for _, ap in AIRPORTS.iterrows():
        try:
            a_lat = float(ap['latitude'])
            a_lon = float(ap['longitude'])
            dist = haversine_km(lat, lon, a_lat, a_lon)
            if dist < min_dist:
                min_dist = dist
                best = {
                    'airport_name': ap['airport_name'],
                    'iata': ap['iata_code'],
                    'icao': ap['icao_code'],
                    'city': ap['city'],
                    'country': 'IN',
                    'latitude': a_lat,
                    'longitude': a_lon,
                    'distance_km': round(dist, 1)
                }
        except (ValueError, TypeError):
            continue
    return best

class ConnectionRequest(BaseModel):
    inbound_delay_minutes: float = 0
    remaining_connection_minutes: float = 90
    mct_minutes: float = 60
    boarding_minutes_remaining: float = 60
    gate_distance_m: float = 450
    security_minutes: float = 10
    immigration_minutes: float = 0
    transfer_minutes: float = 0
    terminal_change: int = 0
    gate_change: int = 0
    baggage_required: int = 0
    baggage_through_checked: int = 1
    same_airline: int = 1
    same_ticket: int = 1
    airport_congestion: float = 0.25

class FlightPredictRequest(BaseModel):
    airline: str = 'IndiGo'
    origin: str = 'MAA'
    destination: str = 'DEL'
    scheduled_departure: str = '12:00'
    scheduled_arrival: str = '14:30'
    distance: float = PRIORS.get('global_distance', 1500)
    passenger_count: float = PRIORS.get('global_passengers', 150)
    ticket_price: float = PRIORS.get('global_ticket_price', 7000)
    day_of_week: int = 2
    month: int = 10

@app.get('/api/health')
def health():
    return {
        'status': 'ok',
        'service': 'aeronex',
        'version': '1.0.0',
        'models': {
            'delay': DELAY_MODEL is not None,
            'cancellation': CANCEL_MODEL is not None,
            'connection': CONN_MODEL is not None,
            'connection_proxy': CONN_MODEL is not None
        },
        'supabase': supabase_client is not None,
        'airspace': os.getenv('AIRPLANES_LIVE_ENABLED', '1').lower() in ('1', 'true', 'yes'),
        'weather': os.getenv('OPEN_METEO_ENABLED', '1').lower() in ('1', 'true', 'yes')
    }

@app.get('/api/stats')
def stats():
    return {
        'airports': int(len(AIRPORTS)),
        'schedule_rows': int(len(SCHEDULE) + len(HISTORY)),
        'route_rows': int(len(pd.read_csv(DATA / 'routes_normalized.csv'))),
        'runway_airports': int(len(pd.read_csv(DATA / 'runway_summary_india.csv'))),
        'flight_history_rows': 100000,
        'mct_rows': int(len(MCT)),
        'ml_models': 3
    }

@app.get('/api/airports')
def airports(q: str = ''):
    d = AIRPORTS
    if q:
        qu = q.upper().strip()
        d = d[
            d['iata_code'].astype(str).str.contains(qu, na=False) |
            d['airport_name'].astype(str).str.upper().str.contains(qu, na=False) |
            d['city'].astype(str).str.upper().str.contains(qu, na=False)
        ]
    return d.head(80).to_dict('records')

@app.get('/api/airports/nearest')
def nearest_airport(lat: float, lon: float):
    nearest = find_nearest_airport(lat, lon)
    if not nearest:
        return {'status': 'error', 'message': 'Could not determine nearest airport'}
    return {
        'status': 'ok',
        'source': 'GEOLOCATION_ESTIMATE',
        **nearest,
        'nearest': nearest
    }

@app.get('/api/airports/resolve')
def resolve_airport(q: str = ''):
    ap = resolve_airport_query(q)
    if not ap:
        return {'status': 'error', 'message': f'No airport recognized for "{q}"'}
    return {'status': 'ok', 'source': 'RESOLVED', 'airport': ap}

@app.get('/api/mct/{iata}')
def mct(iata: str):
    code = iata.upper()
    row = MCT[MCT.airport_iata == code]
    if row.empty:
        return {
            'airport_iata': code,
            'available': False,
            'source': 'runtime lookup recommended',
            'message': 'No locally stored MCT record. AeroNex will use the live MCT provider when enabled.'
        }
    r = row.iloc[0].to_dict()
    r['available'] = True
    return r

@app.get('/api/flights/search')
def search_flights(q: str = '', origin: str = '', destination: str = '', limit: int = 25):
    # Resolve airport if q corresponds to city or airport name (e.g. Chennai -> MAA, Delhi -> DEL)
    resolved = resolve_airport_query(q) if q else None
    resolved_iata = resolved.get('iata_code') if resolved else None

    # Step 1: Search in SCHEDULE
    d = SCHEDULE.copy()
    if origin:
        d = d[d['origin'].astype(str).str.upper() == origin.upper()]
    if destination:
        d = d[d['destination'].astype(str).str.upper() == destination.upper()]

    if q:
        qu = q.strip().upper()
        mask = (
            d['flight_number'].astype(str).str.upper().str.contains(qu, na=False) |
            d['airline'].astype(str).str.upper().str.contains(qu, na=False)
        )
        if resolved_iata:
            mask |= (d['origin'].astype(str).str.upper() == resolved_iata) | (d['destination'].astype(str).str.upper() == resolved_iata)
        d = d[mask]

    if not d.empty:
        records = d.head(min(limit, 100)).to_dict('records')
        for r in records:
            r['source'] = 'SCHEDULE'
            r['status'] = 'SCHEDULED'
        return records

    # Step 2: Fallback to verified operational HISTORY
    h = HISTORY.copy()
    if origin:
        h = h[h['origin'].astype(str).str.upper() == origin.upper()]
    if destination:
        h = h[h['destination'].astype(str).str.upper() == destination.upper()]

    if q:
        qu = q.strip().upper()
        mask = (
            h['flight_number'].astype(str).str.upper().str.contains(qu, na=False) |
            h['airline'].astype(str).str.upper().str.contains(qu, na=False)
        )
        if resolved_iata:
            mask |= (h['origin'].astype(str).str.upper() == resolved_iata) | (h['destination'].astype(str).str.upper() == resolved_iata)
        h = h[mask]

    records = h.head(min(limit, 100)).to_dict('records')
    for r in records:
        r['source'] = 'HISTORICAL'
    return records

def priors(airline, origin, destination):
    route = f'{origin}_{destination}'
    return {
        'airline_avg_delay': float(PRIORS['airline_avg_delay'].get(airline, PRIORS['global_avg_delay'])),
        'origin_avg_delay': float(PRIORS['origin_avg_delay'].get(origin, PRIORS['global_avg_delay'])),
        'route_avg_delay': float(PRIORS['route_avg_delay'].get(route, PRIORS['global_avg_delay'])),
        'airline_cancel_rate': float(PRIORS['airline_cancel_rate'].get(airline, PRIORS['global_cancel_rate']))
    }

def hours(t):
    try:
        return int(str(t)[:2])
    except Exception:
        return 12

@app.post('/api/predict/flight')
def predict_flight(r: FlightPredictRequest):
    origin = r.origin.upper()
    destination = r.destination.upper()
    p = priors(r.airline, origin, destination)
    try:
        dep_hour = hours(r.scheduled_departure)
        arr_hour = hours(r.scheduled_arrival)
    except Exception:
        dep_hour, arr_hour = 12, 15

    route = f'{origin}_{destination}'
    airport_rows = TRAINING_DATA[TRAINING_DATA.origin.astype(str).str.upper() == origin]
    airline_rows = TRAINING_DATA[TRAINING_DATA.airline.astype(str).str.upper() == str(r.airline).upper()]
    route_rows = TRAINING_DATA[(TRAINING_DATA.origin.astype(str).str.upper() == origin) & (TRAINING_DATA.destination.astype(str).str.upper() == destination)]

    airport_delay_rate = float(airport_rows.airport_delay_rate.mean()) if len(airport_rows) else float(TRAINING_DATA.airport_delay_rate.mean())
    airline_delay_rate = float(airline_rows.airline_delay_rate.mean()) if len(airline_rows) else float(TRAINING_DATA.airline_delay_rate.mean())
    route_delay_rate = float(route_rows.route_delay_rate.mean()) if len(route_rows) else float(TRAINING_DATA.route_delay_rate.mean())
    airport_cancel_rate = float(airport_rows.airport_cancellation_rate.mean()) if len(airport_rows) else float(TRAINING_DATA.airport_cancellation_rate.mean())

    feat = {
        'distance': r.distance,
        'airport_delay_rate': airport_delay_rate,
        'airline_delay_rate': airline_delay_rate,
        'route_delay_rate': route_delay_rate,
        'airport_cancellation_rate': airport_cancel_rate,
        'previous_flight_delay': 0.0,
        'dep_hour': dep_hour,
        'arr_hour': arr_hour,
        'dow': r.day_of_week,
        'month': r.month,
        'is_weekend': int(r.day_of_week in (5, 6)),
        'airline': r.airline,
        'origin': origin,
        'destination': destination,
        'route': route
    }
    X = pd.DataFrame([feat])
    delay = float(max(0, DELAY_MODEL.predict(X)[0])) if DELAY_MODEL else p['route_avg_delay']
    cancel = float(CANCEL_MODEL.predict_proba(X)[0, 1]) if CANCEL_MODEL else p['airline_cancel_rate']
    return {
        'delay_minutes': round(delay, 1),
        'cancellation_probability': round(cancel * 100, 1),
        'inputs': feat,
        'model_status': 'trained_on_AeroNex_Training_Dataset',
        'model_version': 'aeronex-xgb-2026-10'
    }

@app.post('/api/predict/connection')
def predict_connection(r: ConnectionRequest):
    required = 10 + r.security_minutes + r.immigration_minutes + r.transfer_minutes + (r.gate_distance_m / 80) + 20 + r.baggage_required * 10 + r.terminal_change * 15 + r.airport_congestion * 15
    buffer = r.remaining_connection_minutes - required

    now = pd.Timestamp.today()
    route = 'UNKNOWN_UNKNOWN'
    x = {
        'distance': 1500.0,
        'airport_delay_rate': float(r.airport_congestion),
        'airline_delay_rate': float(r.airport_congestion),
        'route_delay_rate': float(r.airport_congestion),
        'airport_cancellation_rate': 0.0,
        'previous_flight_delay': float(r.inbound_delay_minutes),
        'scheduled_connection_minutes': float(r.remaining_connection_minutes + max(0, r.inbound_delay_minutes)),
        'minimum_connection_minutes': float(r.mct_minutes),
        'boarding_cutoff_minutes': float(20),
        'gate_distance_meters': float(r.gate_distance_m),
        'terminal_change': int(r.terminal_change),
        'baggage_required': int(r.baggage_required),
        'same_airline': int(r.same_airline),
        'same_ticket': int(r.same_ticket),
        'dep_hour': 12,
        'arr_hour': 15,
        'dow': int(now.dayofweek),
        'month': int(now.month),
        'is_weekend': int(now.dayofweek in (5, 6)),
        'airline': 'Unknown',
        'origin': 'UNKNOWN',
        'destination': 'UNKNOWN',
        'route': route
    }
    prob = float(CONN_MODEL.predict_proba(pd.DataFrame([x]))[0, 1]) if CONN_MODEL else max(0, min(1, 0.5 + buffer / 120))
    if r.boarding_minutes_remaining < 0 or buffer < -20:
        prob = min(prob, 0.08)
    elif buffer < 0:
        prob = min(prob, 0.30)

    risk = round((1 - prob) * 100, 1)
    band = 'SAFE' if prob >= 0.8 else 'WATCH' if prob >= 0.6 else 'HIGH RISK' if prob >= 0.3 else 'CRITICAL'
    rec = (
        'Proceed normally' if band == 'SAFE'
        else 'Move to gate now and avoid non-essential stops' if band == 'WATCH'
        else 'Request airport assistance and prioritize the gate transfer' if band == 'HIGH RISK'
        else 'Activate missed-connection recovery immediately'
    )
    return {
        'catch_probability': round(prob * 100, 1),
        'miss_probability': risk,
        'risk_band': band,
        'required_minutes': round(required, 1),
        'buffer_minutes': round(buffer, 1),
        'recommendation': rec,
        'model': 'XGBoost operational-feasibility proxy',
        'model_status': 'trained_on_AeroNex_Training_Dataset',
        'disclaimer': 'The connection target is an operational feasibility proxy, not a real passenger caught/missed outcome and not an aviation safety guarantee.'
    }

@app.get('/api/airspace')
def airspace(lat: float = 13.0, lon: float = 80.2):
    if os.getenv('AIRPLANES_LIVE_ENABLED', '1').lower() not in ('1', 'true', 'yes'):
        return {'live': False, 'aircraft': [], 'message': 'Live airspace disabled'}
    try:
        url = f'https://api.airplanes.live/v2/point/{lat}/{lon}/50'
        res = requests.get(url, timeout=8)
        res.raise_for_status()
        data = res.json()
        ac = []
        for x in data.get('ac', [])[:150]:
            ac.append({
                'callsign': (x.get('flight') or '').strip(),
                'type': x.get('t'),
                'lat': x.get('lat'),
                'lon': x.get('lon'),
                'altitude_ft': x.get('alt_baro'),
                'speed_kt': x.get('gs'),
                'track': x.get('track'),
                'hex': x.get('hex')
            })
        return {'live': True, 'source': 'Airplanes.live ADS-B', 'aircraft': ac, 'timestamp': int(time.time())}
    except Exception as e:
        return {'live': False, 'aircraft': [], 'message': 'Live airspace data temporarily unavailable', 'detail': str(e)[:120]}

@app.get('/api/weather')
def weather(lat: float = 13.0, lon: float = 80.2):
    if os.getenv('OPEN_METEO_ENABLED', '1').lower() not in ('1', 'true', 'yes'):
        return {'live': False, 'message': 'Weather provider disabled'}
    try:
        url = f'https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&timezone=auto'
        r = requests.get(url, timeout=8)
        r.raise_for_status()
        return {'live': True, 'source': 'Open-Meteo', 'data': r.json().get('current', {})}
    except Exception as e:
        return {'live': False, 'message': 'Weather temporarily unavailable', 'detail': str(e)[:120]}

# Mount frontend static files
app.mount('/', StaticFiles(directory=str(ROOT / 'frontend'), html=True), name='frontend')
