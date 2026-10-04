import pandas as pd
import math
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'data' / 'processed'

# Curated aliases for Indian and international hub airports
ALIASES: Dict[str, str] = {
    'dubai': 'DXB',
    'dxb': 'DXB',
    'omdb': 'DXB',
    'dubai airport': 'DXB',
    'dubai international': 'DXB',
    'madras': 'MAA',
    'chennai': 'MAA',
    'vomm': 'MAA',
    'chennai airport': 'MAA',
    'chennai international airport': 'MAA',
    'meenambakkam': 'MAA',
    'delhi': 'DEL',
    'new delhi': 'DEL',
    'vidp': 'DEL',
    'igi': 'DEL',
    'indira gandhi': 'DEL',
    'indira gandhi international': 'DEL',
    'bombay': 'BOM',
    'mumbai': 'BOM',
    'vabb': 'BOM',
    'csmia': 'BOM',
    'chhatrapati shivaji': 'BOM',
    'sahar': 'BOM',
    'santa cruz': 'BOM',
    'santacruz': 'BOM',
    'bangalore': 'BLR',
    'bengaluru': 'BLR',
    'vobl': 'BLR',
    'kempegowda': 'BLR',
    'devenahalli': 'BLR',
    'hyderabad': 'HYD',
    'vohs': 'HYD',
    'rgia': 'HYD',
    'rajiv gandhi': 'HYD',
    'shamshabad': 'HYD',
    'begumpet': 'HYD',
    'calcutta': 'CCU',
    'kolkata': 'CCU',
    'vecc': 'CCU',
    'netaji subhash': 'CCU',
    'dum dum': 'CCU',
    'dumdum': 'CCU',
    'cochin': 'COK',
    'kochi': 'COK',
    'voci': 'COK',
    'cial': 'COK',
    'nedumbassery': 'COK',
    'goa': 'GOI',
    'dabolim': 'GOI',
    'vogo': 'GOI',
    'mopa': 'GOX',
    'manohar': 'GOX',
    'ahmedabad': 'AMD',
    'vaah': 'AMD',
    'sardar vallabh': 'AMD',
    'pune': 'PNQ',
    'vapo': 'PNQ',
    'lohegaon': 'PNQ',
    'thiruvananthapuram': 'TRV',
    'trivandrum': 'TRV',
    'votv': 'TRV',
    'jaipur': 'JAI',
    'viip': 'JAI',
    'sanganer': 'JAI',
    'lucknow': 'LKO',
    'vilk': 'LKO',
    'amausi': 'LKO',
    'guwahati': 'GAU',
    'vegt': 'GAU',
    'borjhar': 'GAU',
    'lokpriya gopinath': 'GAU',
    'bhubaneswar': 'BBI',
    'vebs': 'BBI',
    'biju patnaik': 'BBI',
    'patna': 'PAT',
    'vept': 'PAT',
    'jayaprakash': 'PAT',
    'varanasi': 'VNS',
    'vebn': 'VNS',
    'lal bahadur': 'VNS',
    'babatpur': 'VNS',
    'amritsar': 'ATQ',
    'viar': 'ATQ',
    'sri guru ram dass': 'ATQ',
    'rajasansi': 'ATQ',
    'coimbatore': 'CJB',
    'vocb': 'CJB',
    'peelamedu': 'CJB',
    'mangalore': 'IXE',
    'mangaluru': 'IXE',
    'vope': 'IXE',
    'bajpe': 'IXE',
    'tiruchirappalli': 'TRZ',
    'trichy': 'TRZ',
    'votz': 'TRZ',
    'madurai': 'IXM',
    'vomd': 'IXM',
    'shirdi': 'SAG',
    'vasd': 'SAG',
    'calicut': 'CCJ',
    'kozhikode': 'CCJ',
    'karipur': 'CCJ',
    'vocr': 'CCJ',
    'visakhapatnam': 'VTZ',
    'vizag': 'VTZ',
    'vovz': 'VTZ',
    'srinagar': 'SXR',
    'visr': 'SXR',
    'sheikh ul alam': 'SXR',
    'bagdogra': 'IXB',
    'vebd': 'IXB',
    'siliguri': 'IXB',
    'dehradun': 'DED',
    'vidn': 'DED',
    'jolly grant': 'DED',
    'chandigarh': 'IXC',
    'vicg': 'IXC',
    'shaheed bhagat': 'IXC'
}

class AirportResolver:
    def __init__(self):
        self.airports_df = pd.read_csv(DATA / 'airports_india.csv').fillna('')
        self.runways_df = None
        runway_path = DATA / 'runway_summary_india.csv'
        if runway_path.exists():
            try:
                self.runways_df = pd.read_csv(runway_path).fillna('')
            except Exception:
                pass

        self.by_iata: Dict[str, Dict[str, Any]] = {}
        self.by_icao: Dict[str, Dict[str, Any]] = {}
        self.by_name: Dict[str, Dict[str, Any]] = {}
        self.by_city: Dict[str, List[Dict[str, Any]]] = {}
        self.all_airports: List[Dict[str, Any]] = []

        self._build_index()

    def _build_index(self):
        runway_info = {}
        if self.runways_df is not None:
            for _, r in self.runways_df.iterrows():
                ident = str(r.get('airport_ident', '')).strip().upper()
                if ident:
                    runway_info[ident] = {
                        'runway_count': int(r.get('runway_count', 1)),
                        'max_runway_length_ft': float(r.get('max_runway_length_ft', 0) or 0),
                        'lighted_runways': int(r.get('lighted_runways', 1))
                    }

        major_order = ['MAA', 'DXB', 'DEL', 'BOM', 'BLR', 'HYD', 'CCU', 'COK', 'AMD', 'PNQ', 'GOI', 'JAI', 'LKO', 'TRV', 'GAU']

        for _, r in self.airports_df.iterrows():
            iata = str(r.get('iata_code', '')).strip().upper()
            icao = str(r.get('icao_code', '')).strip().upper()
            name = str(r.get('airport_name', '')).strip()
            city = str(r.get('city', '')).strip()
            lat = float(r.get('latitude', 0.0) or 0.0)
            lon = float(r.get('longitude', 0.0) or 0.0)
            elev = float(r.get('elevation_ft', 0.0) or 0.0)

            if not iata and not icao:
                continue

            rw = runway_info.get(icao, runway_info.get(iata, {'runway_count': 1, 'max_runway_length_ft': 9000, 'lighted_runways': 1}))

            item = {
                'iata': iata,
                'icao': icao,
                'airport_name': name or f'{iata or icao} Airport',
                'name': name or f'{iata or icao} Airport',
                'city': city or name or iata or icao,
                'country': 'India',
                'latitude': lat,
                'longitude': lon,
                'lat': lat,
                'lon': lon,
                'elevation_ft': elev,
                'runways': rw,
                'is_major': iata in major_order
            }

            if iata:
                self.by_iata[iata] = item
            if icao:
                self.by_icao[icao] = item

            clean_name = name.lower()
            if clean_name:
                self.by_name[clean_name] = item

            city_key = city.lower()
            if city_key:
                if city_key not in self.by_city:
                    self.by_city[city_key] = []
                self.by_city[city_key].append(item)

            self.all_airports.append(item)

        # Ensure DXB and popular hub airports are registered
        extra_hubs = [
            {
                'iata': 'DXB',
                'icao': 'OMDB',
                'airport_name': 'Dubai International Airport',
                'name': 'Dubai International Airport',
                'city': 'Dubai',
                'country': 'United Arab Emirates',
                'latitude': 25.2532,
                'longitude': 55.3657,
                'lat': 25.2532,
                'lon': 55.3657,
                'elevation_ft': 62.0,
                'runways': {'runway_count': 2, 'max_runway_length_ft': 14764, 'lighted_runways': 2},
                'is_major': True
            },
            {
                'iata': 'SIN',
                'icao': 'WSSS',
                'airport_name': 'Singapore Changi Airport',
                'name': 'Singapore Changi Airport',
                'city': 'Singapore',
                'country': 'Singapore',
                'latitude': 1.3644,
                'longitude': 103.9915,
                'lat': 1.3644,
                'lon': 103.9915,
                'elevation_ft': 22.0,
                'runways': {'runway_count': 3, 'max_runway_length_ft': 13123, 'lighted_runways': 3},
                'is_major': True
            }
        ]
        for hub in extra_hubs:
            if hub['iata'] not in self.by_iata:
                self.by_iata[hub['iata']] = hub
                self.by_icao[hub['icao']] = hub
                self.by_name[hub['name'].lower()] = hub
                city_key = hub['city'].lower()
                if city_key not in self.by_city:
                    self.by_city[city_key] = []
                self.by_city[city_key].append(hub)
                self.all_airports.append(hub)

        # Sort all airports with major hubs first
        def sort_key(a):
            try:
                idx = major_order.index(a['iata'])
                return (0, idx)
            except ValueError:
                return (1, a['city'])

        self.all_airports.sort(key=sort_key)

    def resolve(self, q: str) -> Optional[Dict[str, Any]]:
        if not q or not isinstance(q, str):
            return None
        text = q.strip().lower()
        if not text:
            return None

        # 1. Alias lookup
        if text in ALIASES:
            target_iata = ALIASES[text]
            if target_iata in self.by_iata:
                return self.by_iata[target_iata]

        # 2. Exact IATA match
        upper_q = text.upper()
        if len(upper_q) == 3 and upper_q in self.by_iata:
            return self.by_iata[upper_q]

        # 3. Exact ICAO match
        if len(upper_q) == 4 and upper_q in self.by_icao:
            return self.by_icao[upper_q]

        # 4. Exact City match
        if text in self.by_city and len(self.by_city[text]) > 0:
            return self.by_city[text][0]

        # 5. Exact Name match
        if text in self.by_name:
            return self.by_name[text]

        # 6. Check if any alias starts or ends with text
        for alias_key, target_code in ALIASES.items():
            if alias_key == text or text in alias_key or alias_key in text:
                if target_code in self.by_iata:
                    return self.by_iata[target_code]

        # 7. Substring in city or airport_name
        for a in self.all_airports:
            if text in a['city'].lower() or text in a['airport_name'].lower():
                return a

        return None

    def search(self, q: str, limit: int = 15) -> List[Dict[str, Any]]:
        if not q or not isinstance(q, str):
            return self.all_airports[:limit]
        text = q.strip().lower()
        if not text:
            return self.all_airports[:limit]

        exact = self.resolve(text)
        results = [exact] if exact else []
        seen = {exact['iata'] for exact in results if exact.get('iata')}

        for a in self.all_airports:
            if a.get('iata') in seen:
                continue
            if (
                text in a['city'].lower() or
                text in a['airport_name'].lower() or
                text == a['iata'].lower() or
                text == a['icao'].lower()
            ):
                results.append(a)
                seen.add(a['iata'])
                if len(results) >= limit:
                    break

        return results

    def get_nearest(self, lat: float, lon: float) -> Tuple[Dict[str, Any], float]:
        best_airport = None
        min_dist = float('inf')

        for a in self.all_airports:
            a_lat = a.get('latitude', 0.0)
            a_lon = a.get('longitude', 0.0)
            if a_lat == 0.0 and a_lon == 0.0:
                continue
            dist = self.haversine(lat, lon, a_lat, a_lon)
            if dist < min_dist:
                min_dist = dist
                best_airport = a

        if not best_airport and self.all_airports:
            best_airport = self.all_airports[0]
            min_dist = 0.0

        return best_airport, round(min_dist, 1)

    @staticmethod
    def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return R * c

# Global instance
resolver = AirportResolver()
