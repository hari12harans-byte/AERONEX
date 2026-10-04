"""Adapters turn a raw source into the canonical AeroNex flight schema (see src/schema.py)."""
from __future__ import annotations
from dataclasses import dataclass, field
import re
import numpy as np
import pandas as pd
from ..schema import ALIASES, CANONICAL_COLUMNS, EXTRA_COLUMNS, norm

_TIME_ONLY = re.compile(r"^\s*\d{1,2}:\d{2}(:\d{2})?\s*$")


@dataclass
class AdapterResult:
    df: pd.DataFrame
    kind: str = "flights"                       # flights | aggregate
    mapping: dict = field(default_factory=dict)  # canonical -> raw column
    unmapped_canonical: list = field(default_factory=list)
    notes: list = field(default_factory=list)
    provenance: dict = field(default_factory=dict)


class BaseAdapter:
    name = "base"

    def __init__(self, cfg: dict | None = None):
        self.cfg = cfg or {}

    def load_raw(self) -> tuple[pd.DataFrame, dict]:
        raise NotImplementedError

    def load(self) -> AdapterResult:
        raw, prov = self.load_raw()
        res = self.normalize(raw)
        res.provenance = prov
        return res

    def normalize(self, raw: pd.DataFrame) -> AdapterResult:
        cols = {norm(c): c for c in raw.columns}
        out = pd.DataFrame(index=raw.index)
        mapping, notes = {}, []
        for canon, names in ALIASES.items():
            src = next((cols[norm(n)] for n in names if norm(n) in cols), None)
            if src is not None:
                out[canon] = raw[src]
                mapping[canon] = str(src)
        self._combine_date_time(out, notes)
        keep = set(CANONICAL_COLUMNS) | set(EXTRA_COLUMNS)
        unmapped = [c for c in CANONICAL_COLUMNS if c not in out.columns
                    and c in {"airline", "flight_number", "origin_airport", "destination_airport",
                              "scheduled_departure", "scheduled_arrival", "arrival_delay_min"}]
        for c in keep:
            if c not in out.columns:
                out[c] = np.nan
        used = {norm(v) for v in mapping.values()}
        extras = [c for c in raw.columns if norm(c) not in used]
        if extras:
            notes.append(f"{len(extras)} unmapped raw columns were not carried over: {extras[:10]}")
        return AdapterResult(out, "flights", mapping, unmapped, notes)

    @staticmethod
    def _combine_date_time(out: pd.DataFrame, notes: list):
        """If scheduled_* are bare times (HH:MM) and a date column exists, build real datetimes."""
        if "flight_date" not in out.columns:
            return
        for col in ("scheduled_departure", "scheduled_arrival", "actual_departure", "actual_arrival"):
            if col in out.columns and out[col].astype(str).str.match(_TIME_ONLY).mean() > 0.9:
                d = pd.to_datetime(out["flight_date"], errors="coerce", dayfirst=True).dt.strftime("%Y-%m-%d")
                out[col] = pd.to_datetime(d + " " + out[col].astype(str).str.strip(), errors="coerce")
                notes.append(f"{col}: combined flight_date + time-of-day (arrival may need next-day rollover)")
