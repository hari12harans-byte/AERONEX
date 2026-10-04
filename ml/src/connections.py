"""Build connection scenarios by pairing REAL schedule rows.

Pairs an arriving flight A (… -> X) with a departing flight B (X -> …) at the same airport on the same
calendar day with min <= scheduled gap <= max minutes. These are plausible itineraries, NOT booked
passengers. Overnight connections (crossing midnight) are not generated. Pair count per airport-day is
capped by a seeded sample (settings.connection_model.max_pairs_per_airport_day), reported in the build report.
Rows without an OBSERVED arrival delay for flight A are excluded (nothing to label them with) and counted.
"""
from __future__ import annotations
import numpy as np
import pandas as pd
from .features import add_airport_congestion, add_time_features, load_profiles, profile_for
from .labeling import add_connection_math, add_label
from .paths import settings


def build_connection_scenarios(flights: pd.DataFrame, cfg: dict | None = None):
    s = cfg or settings()
    cm, common = s["connection_model"], s["common"]
    rng = np.random.default_rng(cm["sample_seed"])
    report = {"input_rows": int(len(flights))}

    f = flights[(flights["cancelled"] == 0) & (flights["diverted"] == 0)
                & flights["scheduled_departure"].notna() & flights["scheduled_arrival"].notna()].reset_index(drop=True)
    report["usable_schedule_rows"] = int(len(f))
    f["congestion_origin"] = add_airport_congestion(f)
    f["_day"] = f["scheduled_arrival"].dt.normalize()
    f["_dday"] = f["scheduled_departure"].dt.normalize()

    arr_idx, dep_idx = [], []
    capped = 0
    arrs = f.groupby(["destination_airport", "_day"]).indices
    deps = f.groupby(["origin_airport", "_dday"]).indices
    for key, ai in arrs.items():
        di = deps.get(key)
        if di is None:
            continue
        A, B = f.iloc[ai], f.iloc[di]
        gap = (B["scheduled_departure"].values[None, :] - A["scheduled_arrival"].values[:, None]) / np.timedelta64(1, "m")
        ok = (gap >= cm["min_connection_min"]) & (gap <= cm["max_connection_min"])
        ao = lambda s: s.to_numpy(dtype=object)   # object arrays: pandas 3 string arrays do not broadcast
        if cm["same_airline_only"]:
            ok &= ao(A["airline"])[:, None] == ao(B["airline"])[None, :]
        ok &= ao(A["origin_airport"])[:, None] != ao(B["destination_airport"])[None, :]   # no immediate return
        ok &= ao(A["flight_number"])[:, None] != ao(B["flight_number"])[None, :]
        ii, jj = np.nonzero(ok)
        if len(ii) > cm["max_pairs_per_airport_day"]:
            pick = rng.choice(len(ii), cm["max_pairs_per_airport_day"], replace=False)
            ii, jj = ii[pick], jj[pick]
            capped += 1
        arr_idx.extend(np.asarray(ai)[ii]); dep_idx.extend(np.asarray(di)[jj])
    report["airport_days_capped_by_sampling"] = capped
    report["pairs_generated"] = len(arr_idx)
    if not arr_idx:
        return pd.DataFrame(), {**report, "warning": "no connection pairs could be built from this schedule"}

    A = f.iloc[arr_idx].reset_index(drop=True)
    B = f.iloc[dep_idx].reset_index(drop=True)
    out = pd.DataFrame({
        "flight_id": A["flight_number"].astype(str) + "|" + B["flight_number"].astype(str) + "|" + A["scheduled_arrival"].dt.strftime("%Y%m%d"),
        "airline": A["airline"], "flight_number": A["flight_number"],
        "origin_airport": A["origin_airport"], "connection_airport": A["destination_airport"],
        "destination_airport": B["destination_airport"],
        "scheduled_arrival": A["scheduled_arrival"], "scheduled_departure": B["scheduled_departure"],
        "arrival_delay_min": A["arrival_delay_min"], "departure_delay_min": B["departure_delay_min"],
        "flight_distance_km": A["flight_distance_km"],
        "airport_congestion": B["congestion_origin"],
    })
    out["connection_time_min"] = (B["scheduled_departure"] - A["scheduled_arrival"]).dt.total_seconds().values / 60

    n0 = len(out)
    policy = cm.get("no_observed_delay_policy", "exclude")
    out["arrival_delay_source"] = np.where(out["arrival_delay_min"].notna(), "observed", "assumed_zero")
    report["no_observed_delay_policy"] = policy
    if policy == "assume_zero":
        report["arrival_delay_assumed_zero_rows"] = int(out["arrival_delay_min"].isna().sum())
        out["arrival_delay_min"] = out["arrival_delay_min"].fillna(0.0)
        report["excluded_no_observed_arrival_delay"] = 0
    else:
        out = out[out["arrival_delay_min"].notna()].reset_index(drop=True)
        report["excluded_no_observed_arrival_delay"] = int(n0 - len(out))
    if out.empty:
        return out, {**report, "warning": "schedule has no observed arrival delays; connection model cannot be labelled"}

    profiles = load_profiles()
    cache = {ap: profile_for(profiles, ap) for ap in out["connection_airport"].dropna().unique()}
    prof = out["connection_airport"].map(lambda a: cache.get(a) or profile_for(profiles, "DEFAULT"))
    for col in ("deplaning_min", "security_time_min", "immigration_time_min", "gate_walk_min", "boarding_cutoff_min"):
        out[col] = prof.map(lambda p, c=col: p[c])
    out["profile_source_type"] = prof.map(lambda p: p["source_type"])

    # Unknown without real data -> left as NaN (NOT randomised). Trainer drops all-NaN features and reports it.
    out["gate_change"] = np.nan
    out["weather_risk"] = np.nan
    if {"destination_terminal"}.issubset(A.columns) and A["destination_terminal"].notna().any() and B["origin_terminal"].notna().any():
        out["terminal_change"] = (A["destination_terminal"].astype(str).values != B["origin_terminal"].astype(str).values).astype(float)
        out.loc[A["destination_terminal"].isna().values | B["origin_terminal"].isna().values, "terminal_change"] = np.nan
    else:
        out["terminal_change"] = np.nan

    out = add_time_features(out, "scheduled_arrival", common["peak_hours"])
    out = add_connection_math(out)
    out = add_label(out, cm["label_mode"], cm["stochastic_sigma"], cm["sample_seed"])
    out = out.sort_values("scheduled_arrival").reset_index(drop=True)
    report["rows_final"] = int(len(out))
    report["label_mode"] = cm["label_mode"]
    report["class_distribution"] = out["missed_connection"].value_counts().sort_index().to_dict()
    report["all_nan_features"] = [c for c in ("gate_change", "terminal_change", "weather_risk", "airport_congestion")
                                  if out[c].isna().all()]
    return out, report
