import math
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from backend.services.airport_resolver import resolver

ROOT = Path(__file__).resolve().parents[2]

# Tailored Airport Digital Twin definitions
AIRPORT_TWINS: Dict[str, Dict[str, Any]] = {
    'MAA': {
        'iata': 'MAA',
        'icao': 'VOMM',
        'name': 'Chennai International Airport',
        'city': 'Chennai',
        'country': 'India',
        'center': [12.990005, 80.169296],
        'zoom': 15,
        'elevation_ft': 52.0,
        'runways': [
            {
                'ident': '07/25',
                'name': 'Primary Runway 07/25',
                'length_m': 3658,
                'width_m': 45,
                'heading_deg': 70,
                'surface': 'Asphalt',
                'status': 'ACTIVE',
                'points': [[12.9856, 80.1512], [13.0001, 80.1834]]
            },
            {
                'ident': '12/30',
                'name': 'Secondary Runway 12/30',
                'length_m': 2045,
                'width_m': 45,
                'heading_deg': 120,
                'surface': 'Asphalt',
                'status': 'ACTIVE',
                'points': [[12.9950, 80.1610], [12.9790, 80.1740]]
            }
        ],
        'terminals': [
            {'id': 'T1', 'name': 'Terminal 1 (Kamaraj Domestic)', 'code': 'T1', 'pos': [12.9892, 80.1735], 'gates': 'G01 - G12', 'type': 'Domestic'},
            {'id': 'T2', 'name': 'Terminal 2 (NITB Integrated)', 'code': 'T2', 'pos': [12.9908, 80.1712], 'gates': 'G14 - G24', 'type': 'Integrated / Domestic'},
            {'id': 'T4', 'name': 'Terminal 4 (International Departure)', 'code': 'T4', 'pos': [12.9922, 80.1685], 'gates': 'G25 - G34', 'type': 'International'}
        ],
        'taxiways': [
            {'name': 'Taxiway Alpha', 'points': [[12.9880, 80.1540], [12.9920, 80.1750]]},
            {'name': 'Taxiway Bravo', 'points': [[12.9840, 80.1600], [12.9880, 80.1720]]},
            {'name': 'Apron Link Echo', 'points': [[12.9900, 80.1700], [12.9930, 80.1680]]}
        ],
        'transport': [
            {'name': 'Chennai Airport Metro Station (Blue Line)', 'mode': 'Metro', 'pos': [12.9880, 80.1750], 'info': 'Direct air-conditioned connector to T1/T2'},
            {'name': 'Prepaid Taxi & App Cabs (Uber/Ola)', 'mode': 'Taxi', 'pos': [12.9875, 80.1738], 'info': 'Multi-Level Car Parking (MLCP) Zone'},
            {'name': 'MTC Air-Conditioned Airport Shuttle', 'mode': 'Bus', 'pos': [12.9870, 80.1745], 'info': 'Routes to Central, Koyambedu, OMR'}
        ],
        'facilities': [
            {'name': 'Air Traffic Control (ATC) Tower', 'type': 'atc', 'pos': [12.9925, 80.1645]},
            {'name': 'CISF Airport Security Command Post', 'type': 'security', 'pos': [12.9890, 80.1710]},
            {'name': 'Apollo Airport Emergency Medical Centre', 'type': 'emergency', 'pos': [12.9905, 80.1720]},
            {'name': 'Travel Club Lounge (T1/T2)', 'type': 'lounge', 'pos': [12.9900, 80.1725]}
        ],
        'blueprint': {
            'airportCode': 'MAA',
            'viewBox': {'w': 1000, 'h': 540},
            'spineY': 240,
            'note': 'Chennai International Airport (MAA / VOMM) — T1 Kamaraj, T2 NITB & T4 International blueprint.',
            'pois': [
                # Concourse Pier A (Domestic T1 / NITB)
                {'id': 'T1-G01', 'type': 'gate', 'label': 'Gate 1 (T1)', 'x': 80, 'y': 100, 'terminal': 'T1'},
                {'id': 'T1-G04', 'type': 'gate', 'label': 'Gate 4 (T1)', 'x': 180, 'y': 100, 'terminal': 'T1'},
                {'id': 'T1-G08', 'type': 'gate', 'label': 'Gate 8 (T1)', 'x': 300, 'y': 100, 'terminal': 'T1'},
                {'id': 'T1-G12', 'type': 'gate', 'label': 'Gate 12 (T1)', 'x': 440, 'y': 100, 'terminal': 'T1'},
                {'id': 'T2-G14', 'type': 'gate', 'label': 'Gate 14 (T2 NITB)', 'x': 540, 'y': 100, 'terminal': 'T2'},
                {'id': 'T2-G18', 'type': 'gate', 'label': 'Gate 18 (T2 NITB)', 'x': 680, 'y': 100, 'terminal': 'T2'},
                {'id': 'T2-G22', 'type': 'gate', 'label': 'Gate 22 (T2 NITB)', 'x': 800, 'y': 100, 'terminal': 'T2'},
                {'id': 'T4-G26', 'type': 'gate', 'label': 'Gate 26 (T4 Intl)', 'x': 880, 'y': 100, 'terminal': 'T4'},
                {'id': 'T4-G32', 'type': 'gate', 'label': 'Gate 32 (T4 Intl)', 'x': 940, 'y': 100, 'terminal': 'T4'},
                # Concourse Pier B (Lower Gates & Remote Stands)
                {'id': 'B01', 'type': 'gate', 'label': 'Gate B01 (Remote)', 'x': 80, 'y': 400, 'terminal': 'T1'},
                {'id': 'B04', 'type': 'gate', 'label': 'Gate B04 (Domestic)', 'x': 200, 'y': 400, 'terminal': 'T1'},
                {'id': 'B06', 'type': 'gate', 'label': 'Gate B06 (Domestic)', 'x': 280, 'y': 400, 'terminal': 'T1'},
                {'id': 'A18', 'type': 'gate', 'label': 'Gate A18 (NITB)', 'x': 680, 'y': 400, 'terminal': 'T2'},
                {'id': 'A22', 'type': 'gate', 'label': 'Gate A22 (NITB)', 'x': 800, 'y': 400, 'terminal': 'T2'},
                {'id': 'B12', 'type': 'gate', 'label': 'Gate B12 (Intl Remote)', 'x': 520, 'y': 400, 'terminal': 'T4'},
                {'id': 'B20', 'type': 'gate', 'label': 'Gate B20 (International)', 'x': 900, 'y': 400, 'terminal': 'T4'},
                # Central Spine Facilities
                {'id': 'SEC_T1', 'type': 'security', 'label': 'Domestic Security Checkpoint T1', 'x': 260, 'y': 240, 'terminal': 'T1'},
                {'id': 'SEC_T2', 'type': 'security', 'label': 'Central Security Checkpoint T2', 'x': 580, 'y': 240, 'terminal': 'T2'},
                {'id': 'SEC_T4', 'type': 'security', 'label': 'International Security & Customs T4', 'x': 820, 'y': 240, 'terminal': 'T4'},
                {'id': 'IMM_T4', 'type': 'immigration', 'label': 'Immigration & E-Visa Hall T4', 'x': 740, 'y': 240, 'terminal': 'T4'},
                {'id': 'BAG_T1', 'type': 'baggage', 'label': 'Domestic Baggage Belts 1-4', 'x': 180, 'y': 240, 'terminal': 'T1'},
                {'id': 'BAG_T2', 'type': 'baggage', 'label': 'Integrated Baggage Belts 5-8', 'x': 480, 'y': 240, 'terminal': 'T2'},
                {'id': 'LOUNGE_CLUB', 'type': 'lounge', 'label': 'Travel Club Lounge T1/T2', 'x': 380, 'y': 240, 'terminal': 'T2'},
                {'id': 'LOUNGE_AI', 'type': 'lounge', 'label': 'Air India Maharaja Lounge T4', 'x': 880, 'y': 240, 'terminal': 'T4'},
                {'id': 'FOOD_COURT', 'type': 'food', 'label': 'Anna Salai Airside Food Hub', 'x': 640, 'y': 240, 'terminal': 'T2'},
                {'id': 'REST_DOM', 'type': 'restroom', 'label': 'Restrooms T1 Concourse', 'x': 340, 'y': 100, 'terminal': 'T1'},
                {'id': 'REST_INTL', 'type': 'restroom', 'label': 'Restrooms T4 Concourse', 'x': 840, 'y': 100, 'terminal': 'T4'},
                {'id': 'METRO_MAA', 'type': 'transport', 'label': 'Chennai Airport Metro Station', 'x': 500, 'y': 475, 'terminal': 'T1/T2'},
                {'id': 'APOLLO_MED', 'type': 'emergency', 'label': 'Apollo Medical Emergency Unit', 'x': 420, 'y': 240, 'terminal': 'T2'}
            ]
        }
    },
    'DEL': {
        'iata': 'DEL',
        'icao': 'VIDP',
        'name': 'Indira Gandhi International Airport',
        'city': 'New Delhi',
        'country': 'India',
        'center': [28.55563, 77.09519],
        'zoom': 14,
        'elevation_ft': 777.0,
        'runways': [
            {'ident': '10/28', 'name': 'Runway 10/28', 'length_m': 3810, 'width_m': 45, 'heading_deg': 100, 'surface': 'Asphalt', 'status': 'ACTIVE', 'points': [[28.5670, 77.0800], [28.5590, 77.1180]]},
            {'ident': '11L/29R', 'name': 'Runway 11L/29R', 'length_m': 4430, 'width_m': 60, 'heading_deg': 110, 'surface': 'Asphalt', 'status': 'ACTIVE', 'points': [[28.5540, 77.0750], [28.5440, 77.1220]]},
            {'ident': '11R/29L', 'name': 'Runway 11R/29L', 'length_m': 3810, 'width_m': 45, 'heading_deg': 110, 'surface': 'Asphalt', 'status': 'ACTIVE', 'points': [[28.5470, 77.0780], [28.5380, 77.1190]]}
        ],
        'terminals': [
            {'id': 'T3', 'name': 'Terminal 3 (Integrated International & Domestic)', 'code': 'T3', 'pos': [28.5562, 77.1000], 'gates': 'A01 - A24 / B01 - B24', 'type': 'Integrated'},
            {'id': 'T2', 'name': 'Terminal 2 (Low Cost Carriers Domestic)', 'code': 'T2', 'pos': [28.5585, 77.0940], 'gates': 'Gates 20 - 32', 'type': 'Domestic'},
            {'id': 'T1', 'name': 'Terminal 1 (IndiGo & SpiceJet Domestic)', 'code': 'T1', 'pos': [28.5700, 77.1150], 'gates': 'Gates 1 - 20', 'type': 'Domestic'}
        ],
        'taxiways': [
            {'name': 'Taxiway Kilo', 'points': [[28.5580, 77.0850], [28.5520, 77.1120]]},
            {'name': 'Taxiway Lima', 'points': [[28.5500, 77.0900], [28.5460, 77.1150]]}
        ],
        'transport': [
            {'name': 'Delhi Metro Airport Express Line (T3 Station)', 'mode': 'Metro', 'pos': [28.5545, 77.1015], 'info': 'Fast 19-min link to New Delhi Railway Station'},
            {'name': 'Inter-Terminal Shuttle Bus Hub', 'mode': 'Shuttle', 'pos': [28.5570, 77.0980], 'info': 'Direct connections between T3, T2, and T1'}
        ],
        'facilities': [
            {'name': 'Air Traffic Control Tower', 'type': 'atc', 'pos': [28.5590, 77.0910]},
            {'name': 'CISF Airport Security Operations Command', 'type': 'security', 'pos': [28.5550, 77.0970]},
            {'name': 'Medanta Airport Clinic T3', 'type': 'emergency', 'pos': [28.5560, 77.1020]}
        ],
        'blueprint': {
            'airportCode': 'DEL',
            'viewBox': {'w': 1000, 'h': 540},
            'spineY': 240,
            'note': 'Indira Gandhi International Airport (DEL / VIDP) — Terminal 3 Concourse blueprint.',
            'pois': [
                {'id': 'A1', 'type': 'gate', 'label': 'Gate A1', 'x': 80, 'y': 100, 'terminal': 'T3'},
                {'id': 'A3', 'type': 'gate', 'label': 'Gate A3', 'x': 180, 'y': 100, 'terminal': 'T3'},
                {'id': 'A6', 'type': 'gate', 'label': 'Gate A6', 'x': 300, 'y': 100, 'terminal': 'T3'},
                {'id': 'A10', 'type': 'gate', 'label': 'Gate A10', 'x': 440, 'y': 100, 'terminal': 'T3'},
                {'id': 'A12', 'type': 'gate', 'label': 'Gate A12', 'x': 520, 'y': 100, 'terminal': 'T3'},
                {'id': 'A16', 'type': 'gate', 'label': 'Gate A16', 'x': 680, 'y': 100, 'terminal': 'T3'},
                {'id': 'A18', 'type': 'gate', 'label': 'Gate A18', 'x': 740, 'y': 100, 'terminal': 'T3'},
                {'id': 'A20', 'type': 'gate', 'label': 'Gate A20', 'x': 800, 'y': 100, 'terminal': 'T3'},
                {'id': 'A22', 'type': 'gate', 'label': 'Gate A22', 'x': 870, 'y': 100, 'terminal': 'T3'},
                {'id': 'A24', 'type': 'gate', 'label': 'Gate A24', 'x': 920, 'y': 100, 'terminal': 'T3'},
                {'id': 'B01', 'type': 'gate', 'label': 'Gate B01', 'x': 80, 'y': 400, 'terminal': 'T3'},
                {'id': 'B04', 'type': 'gate', 'label': 'Gate B04', 'x': 200, 'y': 400, 'terminal': 'T3'},
                {'id': 'B06', 'type': 'gate', 'label': 'Gate B06', 'x': 280, 'y': 400, 'terminal': 'T3'},
                {'id': 'B08', 'type': 'gate', 'label': 'Gate B08', 'x': 380, 'y': 400, 'terminal': 'T3'},
                {'id': 'B12', 'type': 'gate', 'label': 'Gate B12', 'x': 520, 'y': 400, 'terminal': 'T3'},
                {'id': 'B16', 'type': 'gate', 'label': 'Gate B16', 'x': 680, 'y': 400, 'terminal': 'T3'},
                {'id': 'B20', 'type': 'gate', 'label': 'Gate B20', 'x': 820, 'y': 400, 'terminal': 'T3'},
                {'id': 'B24', 'type': 'gate', 'label': 'Gate B24', 'x': 920, 'y': 400, 'terminal': 'T3'},
                {'id': 'SEC_NORTH', 'type': 'security', 'label': 'Transfer Security North', 'x': 420, 'y': 240, 'terminal': 'T3'},
                {'id': 'SEC_SOUTH', 'type': 'security', 'label': 'Transfer Security South', 'x': 580, 'y': 240, 'terminal': 'T3'},
                {'id': 'IMM_T3', 'type': 'immigration', 'label': 'International Immigration', 'x': 500, 'y': 240, 'terminal': 'T3'},
                {'id': 'BAG_CLAIM', 'type': 'baggage', 'label': 'Baggage Claim Belts 1-8', 'x': 260, 'y': 240, 'terminal': 'T3'},
                {'id': 'FOOD_CENTRAL', 'type': 'food', 'label': 'Central Food Court', 'x': 700, 'y': 240, 'terminal': 'T3'},
                {'id': 'LOUNGE_AI', 'type': 'lounge', 'label': 'Air India Maharaja Lounge', 'x': 340, 'y': 240, 'terminal': 'T3'},
                {'id': 'REST_A', 'type': 'restroom', 'label': 'Restrooms Concourse A', 'x': 620, 'y': 100, 'terminal': 'T3'},
                {'id': 'REST_B', 'type': 'restroom', 'label': 'Restrooms Concourse B', 'x': 620, 'y': 400, 'terminal': 'T3'},
                {'id': 'METRO_T3', 'type': 'transport', 'label': 'Delhi Metro Airport Express', 'x': 500, 'y': 475, 'terminal': 'T3'},
                {'id': 'MED_CARE', 'type': 'emergency', 'label': 'Medical First Aid Post', 'x': 780, 'y': 240, 'terminal': 'T3'}
            ]
        }
    }
}

class AirportTwinService:
    def __init__(self):
        pass

    def get_twin(self, airport_code: str = 'MAA') -> Dict[str, Any]:
        code = (airport_code or 'MAA').strip().upper()
        # Resolve aliases
        resolved = resolver.resolve(code)
        if resolved:
            code = resolved['iata']

        if code in AIRPORT_TWINS:
            return AIRPORT_TWINS[code]

        # Generate dynamic twin structure for any Indian airport in dataset
        ap = resolver.by_iata.get(code)
        if not ap and resolver.all_airports:
            ap = resolver.all_airports[0]
            code = ap['iata']

        lat = ap.get('latitude', 13.0)
        lon = ap.get('longitude', 80.0)
        city = ap.get('city', code)
        name = ap.get('airport_name', f'{code} Airport')
        rw_info = ap.get('runways', {'runway_count': 1, 'max_runway_length_ft': 9000})

        rw_length_m = int((rw_info.get('max_runway_length_ft', 9000) or 9000) * 0.3048)

        # Standard runways
        runways = [
            {
                'ident': '09/27',
                'name': f'Runway 09/27',
                'length_m': rw_length_m,
                'width_m': 45,
                'heading_deg': 90,
                'surface': 'Asphalt',
                'status': 'ACTIVE',
                'points': [[lat - 0.005, lon - 0.015], [lat + 0.005, lon + 0.015]]
            }
        ]

        terminals = [
            {'id': 'T1', 'name': f'{city} Terminal 1 (Integrated)', 'code': 'T1', 'pos': [lat + 0.003, lon + 0.002], 'gates': 'Gates 1 - 20', 'type': 'Integrated'}
        ]

        pois = [
            {'id': 'B06', 'type': 'gate', 'label': 'Gate B06', 'x': 200, 'y': 400, 'terminal': 'T1'},
            {'id': 'A18', 'type': 'gate', 'label': 'Gate A18', 'x': 700, 'y': 100, 'terminal': 'T1'},
            {'id': 'G1', 'type': 'gate', 'label': 'Gate 1', 'x': 100, 'y': 100, 'terminal': 'T1'},
            {'id': 'G5', 'type': 'gate', 'label': 'Gate 5', 'x': 300, 'y': 100, 'terminal': 'T1'},
            {'id': 'G10', 'type': 'gate', 'label': 'Gate 10', 'x': 500, 'y': 100, 'terminal': 'T1'},
            {'id': 'G15', 'type': 'gate', 'label': 'Gate 15', 'x': 800, 'y': 100, 'terminal': 'T1'},
            {'id': 'SEC_MAIN', 'type': 'security', 'label': 'Central Security Screening', 'x': 450, 'y': 240, 'terminal': 'T1'},
            {'id': 'IMM_MAIN', 'type': 'immigration', 'label': 'Immigration & Customs', 'x': 550, 'y': 240, 'terminal': 'T1'},
            {'id': 'BAG_MAIN', 'type': 'baggage', 'label': 'Baggage Claim Hall', 'x': 250, 'y': 240, 'terminal': 'T1'},
            {'id': 'LOUNGE_MAIN', 'type': 'lounge', 'label': f'{city} Airport Lounge', 'x': 350, 'y': 240, 'terminal': 'T1'},
            {'id': 'FOOD_MAIN', 'type': 'food', 'label': 'Airside Food Court', 'x': 650, 'y': 240, 'terminal': 'T1'},
            {'id': 'METRO_LINK', 'type': 'transport', 'label': 'City Transit & Taxi Hub', 'x': 500, 'y': 475, 'terminal': 'T1'},
            {'id': 'MED_POST', 'type': 'emergency', 'label': 'First Aid Post', 'x': 750, 'y': 240, 'terminal': 'T1'}
        ]

        return {
            'iata': code,
            'icao': ap.get('icao', f'V{code[:3]}'),
            'name': name,
            'city': city,
            'country': 'India',
            'center': [lat, lon],
            'zoom': 14,
            'elevation_ft': ap.get('elevation_ft', 100.0),
            'runways': runways,
            'terminals': terminals,
            'taxiways': [],
            'transport': [
                {'name': f'Prepaid Taxi & App Cabs', 'mode': 'Taxi', 'pos': [lat, lon], 'info': 'Terminal Forecourt'}
            ],
            'facilities': [
                {'name': 'ATC Tower', 'type': 'atc', 'pos': [lat + 0.002, lon - 0.003]}
            ],
            'blueprint': {
                'airportCode': code,
                'viewBox': {'w': 1000, 'h': 540},
                'spineY': 240,
                'note': f'{name} ({code}) Terminal Concourse layout.',
                'pois': pois
            }
        }

    def calculate_gate_route(self, from_id: str, to_id: str, airport_code: str = 'MAA', via_security: bool = True) -> Dict[str, Any]:
        twin = self.get_twin(airport_code)
        pois = twin['blueprint']['pois']

        p_from = next((p for p in pois if p['id'].upper() == from_id.upper()), None)
        p_to = next((p for p in pois if p['id'].upper() == to_id.upper()), None)

        if not p_from:
            p_from = pois[0]
        if not p_to:
            p_to = pois[min(1, len(pois) - 1)]

        spine_y = twin['blueprint']['spineY']

        points = [
            [p_from['x'], p_from['y']],
            [p_from['x'], spine_y]
        ]

        # Terminal change check
        term_change = 1 if p_from.get('terminal') and p_to.get('terminal') and p_from['terminal'] != p_to['terminal'] else 0

        # Security check if terminal change, different sides of concourse, or explicitly requested
        needs_sec = via_security or bool(term_change) or (p_from['y'] > spine_y and p_to['y'] < spine_y) or (p_from['y'] < spine_y and p_to['y'] > spine_y)
        sec_poi = next((p for p in pois if p['type'] == 'security'), None)
        if needs_sec and sec_poi:
            points.append([sec_poi['x'], spine_y])

        points.append([p_to['x'], spine_y])
        points.append([p_to['x'], p_to['y']])

        # Euclidean pixel distance
        px_dist = 0.0
        for i in range(len(points) - 1):
            dx = points[i+1][0] - points[i][0]
            dy = points[i+1][1] - points[i][1]
            px_dist += math.sqrt(dx*dx + dy*dy)

        # Scale to meters (approx 1 px = 0.694 m for terminal concourses)
        meters = int(max(120, round(px_dist * 0.694)))

        # Timing calculations
        walk_min = max(2, round(meters / 75.0))
        sec_min = 8 if needs_sec else 0
        term_transfer_min = 5 if term_change else 0
        total_min = walk_min + sec_min + term_transfer_min

        stages = [
            f"Depart from {p_from['label']}",
            f"Walk along concourse corridor toward central spine ({int(abs(p_from['y'] - spine_y))} m)"
        ]
        if needs_sec:
            stages.append(f"Pass through {sec_poi['label'] if sec_poi else 'Transfer Security Screening'} (~{sec_min} min queue)")
        if term_change:
            stages.append(f"Cross inter-terminal moving walkway from {p_from['terminal']} to {p_to['terminal']} (~{term_transfer_min} min)")
        stages.append(f"Proceed along concourse to {p_to['label']} ({meters - int(abs(p_from['y'] - spine_y))} m)")
        stages.append(f"Arrive at {p_to['label']}")

        return {
            'airport': twin['iata'],
            'from': p_from,
            'to': p_to,
            'points': points,
            'stages': stages,
            'meters': meters,
            'gateDistanceMeters': meters,
            'walkMinutes': walk_min,
            'walkingMinutes': walk_min,
            'securityMinutes': sec_min,
            'terminalTransferMinutes': term_transfer_min,
            'terminalChange': term_change,
            'totalMinutes': total_min,
            'dataBadge': 'ESTIMATED',
            'disclaimer': 'Indoor distances and walking estimates are calculated from airport schematic blueprints. Indoor positioning is estimated.'
        }

twin_service = AirportTwinService()
