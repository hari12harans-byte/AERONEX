"""DGCA / MoCA monthly traffic & on-time-performance exports.

These are normally AGGREGATES (airline x month, or airport x month), not flight records, so this
adapter returns kind='aggregate'. The aggregate column names below are guesses; verify them against
the real file. Aggregates can be used as airline-level context, never as per-flight delay labels.
"""
from pathlib import Path
import pandas as pd
from .base_adapter import AdapterResult, BaseAdapter
from ..schema import norm

AGG_ALIASES = {
    "airline": ["airline", "carrier", "operator"],
    "airport": ["airport", "airport_code", "station"],
    "period": ["month", "period", "date", "year_month"],
    "otp_pct": ["otp", "otp_pct", "on_time_performance", "on_time_performance_pct", "otp_percent"],
    "cancellation_pct": ["cancellation_rate", "cancellation_pct", "cancellation", "cancel_rate"],
    "flights": ["flights", "departures", "no_of_flights", "total_flights"],
}


class DgcaAdapter(BaseAdapter):
    name = "dgca"

    def load_raw(self):
        p = Path(self.cfg["path"])
        if not p.exists():
            raise FileNotFoundError(f"DATA SOURCE UNAVAILABLE: {p} not found")
        read = pd.read_excel if p.suffix.lower() in {".xlsx", ".xls"} else pd.read_csv
        return read(p), {"source_file": p.name}

    def normalize(self, raw):
        cols = {norm(c): c for c in raw.columns}
        out, mapping = pd.DataFrame(index=raw.index), {}
        for canon, names in AGG_ALIASES.items():
            src = next((cols[norm(n)] for n in names if norm(n) in cols), None)
            if src is not None:
                out[canon] = raw[src]
                mapping[canon] = str(src)
        notes = ["DGCA-style aggregate table: not flight-level; not usable as a per-flight delay label"]
        missing = [k for k in ("period", "otp_pct") if k not in out.columns]
        if missing:
            notes.append(f"could not map aggregate columns: {missing} — check the file's headers")
        return AdapterResult(out, "aggregate", mapping, missing, notes)
