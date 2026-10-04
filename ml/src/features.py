"""Feature engineering shared by training and serving."""
from __future__ import annotations
import numpy as np
import pandas as pd
from .paths import REFERENCE, settings


def load_profiles() -> pd.DataFrame:
    return pd.read_csv(REFERENCE / "airport_profiles.csv")


def profile_for(profiles: pd.DataFrame, airport: str) -> dict:
    """Airport-level row (terminal ALL). Falls back to DEFAULT; always carries source_type."""
    m = profiles[(profiles["airport"] == airport) & (profiles["terminal"] == "ALL")]
    if m.empty:
        m = profiles[profiles["airport"] == "DEFAULT"]
    r = m.iloc[0]
    return {"deplaning_min": float(r.deplaning_minutes), "security_time_min": float(r.security_minutes),
            "immigration_time_min": float(r.immigration_minutes), "gate_walk_min": float(r.default_gate_walk_minutes),
            "boarding_cutoff_min": float(r.boarding_cutoff_minutes), "source_type": r.source_type,
            "profile_airport": r.airport}


def add_time_features(df: pd.DataFrame, time_col: str, peak_hours=None) -> pd.DataFrame:
    peak = set(peak_hours if peak_hours is not None else settings()["common"]["peak_hours"])
    t = pd.to_datetime(df[time_col], errors="coerce")
    df["hour_of_day"] = t.dt.hour
    df["day_of_week"] = t.dt.dayofweek
    df["month"] = t.dt.month
    df["is_weekend"] = (t.dt.dayofweek >= 5).astype("float").where(t.notna())
    df["is_peak_hour"] = t.dt.hour.isin(peak).astype("float").where(t.notna())
    return df


def add_airport_congestion(flights: pd.DataFrame) -> pd.Series:
    """Schedule-derived congestion proxy in [0,1] for a flight's ORIGIN airport and departure hour:
    movements (departures+arrivals) in that airport-hour / that airport's 95th-percentile hourly movements.
    Computed only from the schedule rows supplied, so it reflects schedule density in the dataset, not live traffic."""
    f = flights[flights["scheduled_departure"].notna()]
    dep = f.assign(ap=f["origin_airport"], h=f["scheduled_departure"].dt.floor("h"))[["ap", "h"]]
    fa = flights[flights["scheduled_arrival"].notna()]
    arr = fa.assign(ap=fa["destination_airport"], h=fa["scheduled_arrival"].dt.floor("h"))[["ap", "h"]]
    mv = pd.concat([dep, arr]).dropna().groupby(["ap", "h"]).size().rename("n").reset_index()
    p95 = mv.groupby("ap")["n"].quantile(0.95).rename("p95")
    mv = mv.merge(p95, on="ap")
    mv["cong"] = (mv["n"] / mv["p95"].clip(lower=1)).clip(upper=1.0)
    key = flights.assign(ap=flights["origin_airport"], h=flights["scheduled_departure"].dt.floor("h"))[["ap", "h"]]
    merged = key.merge(mv[["ap", "h", "cong"]], on=["ap", "h"], how="left")
    return pd.Series(merged["cong"].values, index=flights.index)


def delay_severity(minutes: pd.Series) -> pd.Series:
    bins = [-np.inf, 15, 60, 180, np.inf]
    return pd.cut(minutes, bins=bins, labels=["on_time", "minor", "major", "severe"]).astype("object")


def build_delay_features(clean: pd.DataFrame, cfg: dict | None = None) -> pd.DataFrame:
    s = cfg or settings()
    thr = s["delay_model"]["significant_delay_threshold_min"]
    x = clean[(clean["cancelled"] == 0) & (clean["diverted"] == 0) & clean["arrival_delay_min"].notna()
              & clean["scheduled_departure"].notna()].copy()
    x = add_time_features(x, "scheduled_departure", s["common"]["peak_hours"])
    x["significant_delay"] = (x["arrival_delay_min"] >= thr).astype(int)
    x["delay_severity"] = delay_severity(x["arrival_delay_min"])
    x["label_note"] = f"significant_delay = arrival_delay_min >= {thr} (configurable; observed delay)"
    return x.sort_values("scheduled_departure").reset_index(drop=True)
