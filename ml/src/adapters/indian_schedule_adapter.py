"""Adapter for AeroNex_Indian_Combined.csv (timetable + fare rows).

What the file is: recurring TIMETABLE rows (airline, flight no., origin, destination, HH:MM times, valid_from/valid_to,
days_of_week) plus fare observations. It contains NO actual times and NO delays.

What this adapter does:
  * keeps record_type == flight_schedule rows that have both times, a validity window, weekdays, origin, destination, flight no.
  * expands each recurring row into dated flights on SAMPLE days only (first `sample_days_per_month` days of every month),
    because expanding every day of 2018-2025 would be enormous. The sampling is a documented choice, not a data property.
  * arrival earlier than/equal to departure is read as arriving the next day.
  * fare_observation rows are ignored (no flight number or time; they cannot be linked to schedule rows).
Result: schedule-only flights, arrival_delay_min stays EMPTY.
"""
from pathlib import Path
import numpy as np
import pandas as pd
from .base_adapter import BaseAdapter

DOW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


class IndianScheduleCsvAdapter(BaseAdapter):
    name = "indian_schedule_csv"

    def load_raw(self):
        p = Path(self.cfg["path"])
        if not p.exists():
            raise FileNotFoundError(f"DATA SOURCE UNAVAILABLE: {p} not found")
        df = pd.read_csv(p, low_memory=False)
        self.stats = {"rows_in_file": int(len(df))}
        s = df[df["record_type"] == "flight_schedule"].copy()
        self.stats["schedule_rows"] = int(len(s)); self.stats["fare_rows_ignored"] = int((df["record_type"] != "flight_schedule").sum())
        need = ["scheduled_departure_time", "scheduled_arrival_time", "valid_from", "valid_to", "days_of_week",
                "origin", "destination", "flight_number", "airline"]
        s = s.dropna(subset=need).copy()
        s["vf"] = pd.to_datetime(s["valid_from"], errors="coerce"); s["vt"] = pd.to_datetime(s["valid_to"], errors="coerce")
        s = s[s["vf"].notna() & s["vt"].notna() & (s["vf"] <= s["vt"])].reset_index(drop=True)
        self.stats["schedule_rows_usable"] = int(len(s))
        dep = pd.to_timedelta(s["scheduled_departure_time"].str.strip() + ":00")
        arr = pd.to_timedelta(s["scheduled_arrival_time"].str.strip() + ":00")
        nextday = arr <= dep
        arr = arr + pd.to_timedelta(nextday.astype(int), unit="D")
        self.stats["next_day_arrivals"] = int(nextday.sum())
        mask = np.zeros((len(s), 7), dtype=bool)
        for i, d in enumerate(DOW):
            mask[:, i] = s["days_of_week"].str.contains(d, regex=False).values
        n_days = int(self.cfg.get("sample_days_per_month", 7))
        days = pd.date_range(s["vf"].min(), s["vt"].max(), freq="D")
        days = days[days.day <= n_days]
        vf, vt = s["vf"].values, s["vt"].values
        parts = []
        for d in days:
            m = (vf <= d.to_datetime64()) & (vt >= d.to_datetime64()) & mask[:, d.dayofweek]
            if m.any():
                idx = np.nonzero(m)[0]
                parts.append(pd.DataFrame({"_i": idx, "flight_date": d}))
        ex = pd.concat(parts, ignore_index=True)
        out = s.loc[ex["_i"], ["airline", "flight_number", "origin", "destination"]].reset_index(drop=True)
        out["flight_date"] = ex["flight_date"].values
        out["scheduled_departure"] = out["flight_date"] + dep.loc[ex["_i"]].reset_index(drop=True)
        out["scheduled_arrival"] = out["flight_date"] + arr.loc[ex["_i"]].reset_index(drop=True)
        self.stats["dated_flights_generated"] = int(len(out)); self.stats["sample_days_per_month"] = n_days
        return out, {"source_file": p.name, "description": "Indian timetable (schedule) rows expanded onto sample days; no observed delays",
                     "expansion_stats": self.stats}

    def normalize(self, raw):
        res = super().normalize(raw)
        res.notes.append("schedule-only: no observed arrival delay in this source (arrival_delay_min is empty)")
        res.notes.append(f"timetable rows expanded onto sample days only: {self.stats}")
        res.notes.append("fare_observation rows ignored (no flight number / time; cannot be linked to schedule rows)")
        return res
