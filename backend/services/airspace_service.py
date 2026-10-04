import os
import time
import math
import datetime
import requests
from typing import Dict, Any, List, Optional, Tuple

class AirspaceService:
    def __init__(self):
        self.enabled = os.getenv('AIRPLANES_LIVE_ENABLED', '1').lower() in ('1', 'true', 'yes')
        self.default_radius_nm = int(os.getenv('AIRSPACE_RADIUS_NM', '50'))
        self.refresh_seconds = int(os.getenv('AIRSPACE_REFRESH_SECONDS', '30'))
        self.cache_seconds = int(os.getenv('AIRSPACE_CACHE_SECONDS', '60'))
        self.max_stale_seconds = int(os.getenv('AIRSPACE_MAX_STALE_SECONDS', '180'))

        # Cache storage keyed by cache_key
        self._cache: Dict[str, Dict[str, Any]] = {}

        # Upstream failure and exponential backoff tracking
        self._consecutive_failures: int = 0
        self._next_retry_at: float = 0.0
        self._last_successful_provider: str = 'Airplanes.live'
        self._last_successful_timestamp: Optional[float] = None
        self._last_known_status: str = 'live'

        self._headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://airplanes.live/',
            'Origin': 'https://airplanes.live'
        }

    def _get_cache_key(self, lat: float, lon: float, radius_nm: float) -> str:
        return f"{round(lat, 2)}_{round(lon, 2)}_{int(radius_nm)}"

    def _calculate_backoff_delay(self) -> float:
        # Exponential backoff: 5s, 10s, 20s, 40s, max 60s
        if self._consecutive_failures <= 0:
            return 0.0
        return min(60.0, 5.0 * (2 ** min(self._consecutive_failures - 1, 4)))

    def _fetch_airplanes_live(self, lat: float, lon: float, radius_nm: float) -> Tuple[bool, List[Dict[str, Any]], str]:
        url = f"https://api.airplanes.live/v2/point/{lat:.4f}/{lon:.4f}/{min(int(radius_nm), 250)}"
        try:
            res = requests.get(url, headers=self._headers, timeout=5)
            if res.status_code != 200:
                return False, [], f"Airplanes.live HTTP {res.status_code}"

            data = res.json()
            raw_ac = data.get('ac', [])
            ac_list = []
            for x in raw_ac[:150]:
                hex_id = str(x.get('hex', '')).strip().lower()
                callsign = (x.get('flight') or x.get('r') or '').strip()
                if not hex_id and not callsign:
                    continue

                alt = x.get('alt_baro')
                on_ground = bool(alt == 'ground' or (isinstance(alt, (int, float)) and alt <= 60))
                alt_ft = 0 if on_ground else (int(alt) if isinstance(alt, (int, float)) else 0)

                lat_val = float(x.get('lat', lat))
                lon_val = float(x.get('lon', lon))
                spd_val = int(round(float(x.get('gs', 0) or 0)))
                track_val = float(x.get('track', 0) or 0)
                reg_val = str(x.get('r', '')).strip() or 'Unavailable'
                type_val = str(x.get('t', '')).strip() or 'Unavailable'
                vr_val = float(x.get('baro_rate', 0) or 0)
                squawk_val = str(x.get('squawk', '')).strip() or 'Unavailable'
                seen = x.get('seen')
                last_seen = f"{int(seen)}s ago" if seen is not None else "Just now"

                ac_list.append({
                    'hex': hex_id or 'Unavailable',
                    'callsign': callsign if callsign else 'Unavailable',
                    'registration': reg_val,
                    'aircraft_type': type_val,
                    'latitude': lat_val,
                    'longitude': lon_val,
                    'altitude': alt_ft,
                    'speed': spd_val,
                    'heading': track_val,
                    'vertical_rate': vr_val,
                    'squawk': squawk_val,
                    'last_seen': last_seen,
                    'source': 'Airplanes.live',

                    # UI compatibility aliases
                    'lat': lat_val,
                    'lon': lon_val,
                    'altFt': alt_ft,
                    'spdKt': spd_val,
                    'speedKt': spd_val,
                    'track': track_val,
                    'type': type_val,
                    'onGround': on_ground
                })

            return True, ac_list, 'Airplanes.live'
        except Exception as e:
            return False, [], f"Airplanes.live Error: {str(e)[:60]}"

    def get_airspace(self, lat: float = 13.0827, lon: float = 80.2707, radius: float = 50, airport_info: Optional[Dict[str, str]] = None, force_refresh: bool = False) -> Dict[str, Any]:
        radius_nm = min(max(float(radius or self.default_radius_nm), 10), 250)
        cache_key = self._get_cache_key(lat, lon, radius_nm)
        now = time.time()

        airport = airport_info or {'iata': 'MAA', 'name': 'Chennai International Airport'}
        cached_entry = self._cache.get(cache_key)

        # Check if live feed is disabled by configuration
        if not self.enabled:
            return {
                'status': 'unavailable',
                'source': 'Airplanes.live (Disabled)',
                'airport': airport,
                'radius_nm': int(radius_nm),
                'last_updated': datetime.datetime.fromtimestamp(now, tz=datetime.timezone.utc).isoformat(),
                'last_updated_epoch': int(now),
                'cache_age_seconds': 0,
                'aircraft_count': 0,
                'aircraft': []
            }

        # Check exponential backoff rate limiting or forced manual refresh
        can_query_upstream = force_refresh or (now >= self._next_retry_at)

        success = False
        ac_list: List[Dict[str, Any]] = []
        source_name = 'Airplanes.live'

        if can_query_upstream:
            ok, fetched_ac, src = self._fetch_airplanes_live(lat, lon, radius_nm)
            if ok:
                success = True
                ac_list = fetched_ac
                source_name = src

        if success:
            # Upstream succeeded: update state and cache
            self._consecutive_failures = 0
            self._next_retry_at = 0.0
            self._last_successful_provider = source_name
            self._last_successful_timestamp = now
            self._last_known_status = 'live'

            self._cache[cache_key] = {
                'aircraft': ac_list,
                'last_successful_fetch': now,
                'last_data_timestamp': now,
                'source': source_name,
                'airport': airport
            }

            return {
                'status': 'live',
                'source': source_name,
                'airport': airport,
                'radius_nm': int(radius_nm),
                'last_updated': datetime.datetime.fromtimestamp(now, tz=datetime.timezone.utc).isoformat(),
                'last_updated_epoch': int(now),
                'cache_age_seconds': 0,
                'aircraft_count': len(ac_list),
                'aircraft': ac_list
            }

        # Upstream failed or backoff was active: increment failure count if attempted
        if can_query_upstream:
            self._consecutive_failures += 1
            delay = self._calculate_backoff_delay()
            self._next_retry_at = now + delay

        # Consult short-term cache
        if cached_entry:
            cache_age = int(now - cached_entry['last_successful_fetch'])
            cached_ac = cached_entry['aircraft']
            last_ts = cached_entry['last_data_timestamp']
            cached_source = cached_entry['source']

            if cache_age <= self.cache_seconds:
                # Still within fresh cache threshold (0-60s)
                self._last_known_status = 'live'
                return {
                    'status': 'live',
                    'source': cached_source,
                    'airport': airport,
                    'radius_nm': int(radius_nm),
                    'last_updated': datetime.datetime.fromtimestamp(last_ts, tz=datetime.timezone.utc).isoformat(),
                    'last_updated_epoch': int(last_ts),
                    'cache_age_seconds': cache_age,
                    'aircraft_count': len(cached_ac),
                    'aircraft': cached_ac
                }
            elif cache_age <= self.max_stale_seconds:
                # 60s - 180s: DEGRADED / CACHED
                status = 'degraded' if cache_age <= (self.cache_seconds + 30) else 'cached'
                self._last_known_status = status
                return {
                    'status': status,
                    'source': f"{cached_source} (Cached)",
                    'airport': airport,
                    'radius_nm': int(radius_nm),
                    'last_updated': datetime.datetime.fromtimestamp(last_ts, tz=datetime.timezone.utc).isoformat(),
                    'last_updated_epoch': int(last_ts),
                    'cache_age_seconds': cache_age,
                    'aircraft_count': len(cached_ac),
                    'aircraft': cached_ac
                }

        # No usable cache or cache expired (>180s)
        self._last_known_status = 'unavailable'
        return {
            'status': 'unavailable',
            'source': self._last_successful_provider,
            'airport': airport,
            'radius_nm': int(radius_nm),
            'last_updated': datetime.datetime.fromtimestamp(now, tz=datetime.timezone.utc).isoformat(),
            'last_updated_epoch': int(now),
            'cache_age_seconds': int(now - self._last_successful_timestamp) if self._last_successful_timestamp else 0,
            'aircraft_count': 0,
            'aircraft': []
        }

    def get_provider_status(self) -> Dict[str, Any]:
        if not self.enabled:
            return {
                'enabled': False,
                'provider': 'Airplanes.live',
                'status': 'disabled',
                'healthy': False,
                'last_successful_fetch': None
            }

        now = time.time()
        is_healthy = False

        # If we had a successful live fetch within the max stale window, provider is healthy
        if self._last_successful_timestamp and (now - self._last_successful_timestamp) <= self.max_stale_seconds:
            is_healthy = True
        elif self._consecutive_failures == 0:
            # Check feed status capability
            try:
                r = requests.get('https://api.airplanes.live/status', headers=self._headers, timeout=3)
                if r.status_code == 200:
                    is_healthy = True
            except Exception:
                is_healthy = False
        else:
            is_healthy = False

        return {
            'enabled': True,
            'provider': 'Airplanes.live',
            'status': self._last_known_status,
            'healthy': is_healthy,
            'last_successful_fetch': (
                datetime.datetime.fromtimestamp(self._last_successful_timestamp, tz=datetime.timezone.utc).isoformat()
                if self._last_successful_timestamp else None
            )
        }

airspace_service = AirspaceService()
