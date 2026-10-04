import os
import time
import requests
from typing import Dict, Any, List, Optional

SUPABASE_URL = os.getenv('SUPABASE_URL', '').strip().rstrip('/')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '').strip()
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', '').strip()

API_KEY = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY

class SupabaseService:
    def __init__(self):
        self.url = SUPABASE_URL
        self.key = API_KEY
        self.enabled = bool(self.url and self.key)

        # In-memory storage when Supabase is not configured
        self._memory_store: Dict[str, List[Dict[str, Any]]] = {
            'users': [],
            'trips': [],
            'flight_events': [],
            'predictions': [],
            'connection_assessments': [],
            'notifications': []
        }

    def _headers(self) -> Dict[str, str]:
        return {
            'apikey': self.key,
            'Authorization': f'Bearer {self.key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }

    def insert(self, table: str, record: Dict[str, Any]) -> Dict[str, Any]:
        if not self.enabled:
            if table not in self._memory_store:
                self._memory_store[table] = []
            rec = dict(record)
            if 'id' not in rec:
                rec['id'] = len(self._memory_store[table]) + 1
            if 'created_at' not in rec:
                rec['created_at'] = int(time.time() * 1000)
            self._memory_store[table].insert(0, rec)
            return rec

        try:
            endpoint = f'{self.url}/rest/v1/{table}'
            res = requests.post(endpoint, json=record, headers=self._headers(), timeout=5)
            if res.status_code in (200, 201):
                data = res.json()
                return data[0] if isinstance(data, list) and data else record
        except Exception:
            pass

        # Fallback to memory
        if table not in self._memory_store:
            self._memory_store[table] = []
        self._memory_store[table].insert(0, record)
        return record

    def select(self, table: str, limit: int = 50) -> List[Dict[str, Any]]:
        if not self.enabled:
            return self._memory_store.get(table, [])[:limit]

        try:
            endpoint = f'{self.url}/rest/v1/{table}?limit={limit}&order=created_at.desc'
            res = requests.get(endpoint, headers=self._headers(), timeout=5)
            if res.status_code == 200:
                return res.json()
        except Exception:
            pass

        return self._memory_store.get(table, [])[:limit]

supabase_service = SupabaseService()
