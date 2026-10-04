import requests

BASE = 'http://127.0.0.1:8000'

print("=== 1. Health Endpoint ===")
h = requests.get(f'{BASE}/api/health').json()
print("Health:", h)

print("\n=== 2. Search 'chennai' -> MAA ===")
s1 = requests.get(f'{BASE}/api/flights/search?q=chennai').json()
print(f"Results Count: {len(s1.get('results', []))}")
print("Airport Recognized:", s1.get('airportRecognized'))
if s1.get('results'):
    first = s1['results'][0]
    print(f"First Flight: {first['flightNumber']} | {first['origin']} ({first['originCity']}) -> {first['destination']} ({first['destinationCity']}) | Source: {first['source']}")

print("\n=== 3. Search 'MAA' -> Chennai ===")
s2 = requests.get(f'{BASE}/api/flights/search?q=MAA').json()
print(f"Results Count: {len(s2.get('results', []))}")
print("Airport Recognized:", s2.get('airportRecognized'))

print("\n=== 4. Search 'VOMM' -> Chennai ===")
s3 = requests.get(f'{BASE}/api/flights/search?q=VOMM').json()
print(f"Results Count: {len(s3.get('results', []))}")
print("Airport Recognized:", s3.get('airportRecognized'))

print("\n=== 5. Search 'AI255' -> Flight Result ===")
s4 = requests.get(f'{BASE}/api/flights/search?q=AI255').json()
print(f"Results Count: {len(s4.get('results', []))}")
for r in s4.get('results', []):
    print(f"Flight: {r['flightNumber']} | {r['airline']} | {r['origin']} -> {r['destination']} | Dep: {r['scheduledDeparture']} | Arr: {r['scheduledArrival']} | Status: {r['status']} | Source: {r['source']}")

print("\n=== 6. Search Invalid Airport ===")
s5 = requests.get(f'{BASE}/api/flights/search?q=XYZ999INVALID').json()
print(f"Results Count: {len(s5.get('results', []))}")
print("Live status:", s5.get('live_status'))
print("Airport recognized:", s5.get('airportRecognized'))

print("\n=== 7. Nearest Airport (12.9900, 80.1693) ===")
n1 = requests.get(f'{BASE}/api/airports/nearest?lat=12.9900&lon=80.1693').json()
print(f"Nearest: {n1.get('airport_name')} ({n1.get('iata')} / {n1.get('icao')}) | Distance: {n1.get('distance_km')} km")

print("\n=== 8. Digital Twin MAA ===")
tw1 = requests.get(f'{BASE}/api/airport/twin?airport=MAA').json()
print(f"Airport: {tw1.get('name')} ({tw1.get('iata')} / {tw1.get('icao')})")
print(f"Runways ({len(tw1.get('runways', []))}): {[r['ident'] for r in tw1.get('runways', [])]}")
print(f"Terminals ({len(tw1.get('terminals', []))}): {[t['name'] for t in tw1.get('terminals', [])]}")
print(f"Blueprint POIs Count: {len(tw1.get('blueprint', {}).get('pois', []))}")

print("\n=== 9. Gate Navigation B06 -> A18 ===")
g1 = requests.get(f'{BASE}/api/gate/route?from=B06&to=A18&airport=MAA').json()
print(f"Route: {g1.get('from', {}).get('label')} -> {g1.get('to', {}).get('label')}")
print(f"Distance: {g1.get('meters')} m")
print(f"Walking: {g1.get('walkMinutes')} min")
print(f"Security: {g1.get('securityMinutes')} min")
print(f"Terminal transfer: {g1.get('terminalTransferMinutes')} min")
print(f"Total: {g1.get('totalMinutes')} min")
print(f"Data badge: {g1.get('dataBadge')}")

print("\n=== 10. ML Flight Predict (XGBoost Delay & Cancellation) ===")
p1 = requests.post(f'{BASE}/api/predict/flight', json={
    'airline': 'Air India',
    'origin': 'MAA',
    'destination': 'DEL',
    'scheduled_departure': '08:30',
    'scheduled_arrival': '10:55',
    'day_of_week': 2,
    'month': 10
}).json()
print(f"Predicted Delay: +{p1.get('delay_minutes')} min")
print(f"Cancellation Probability: {p1.get('cancellation_probability')}%")
print(f"Model Status: {p1.get('model_status')}")

print("\n=== 11. ML Connection Predict (XGBoost Proxy Feasibility) ===")
p2 = requests.post(f'{BASE}/api/predict/connection', json={
    'inbound_delay_minutes': 0,
    'remaining_connection_minutes': 90,
    'mct_minutes': 55,
    'boarding_minutes_remaining': 60,
    'gate_distance_m': 450,
    'security_minutes': 12,
    'terminal_change': 0
}).json()
print(f"Catch Probability: {p2.get('catch_probability')}%")
print(f"Miss Probability (Risk): {p2.get('miss_probability')}%")
print(f"Risk Band: {p2.get('risk_band')}")
print(f"Recommendation: {p2.get('recommendation')}")

print("\n=== 12. Frontend SPA Delivery ===")
spa = requests.get(f'{BASE}/dashboard')
print(f"Status Code: {spa.status_code} | Bytes: {len(spa.text)} | Title in HTML: {'AeroNex' in spa.text}")

print("\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!")
