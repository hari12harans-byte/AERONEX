"""Cleaning. Every dropped row is written to removed_rows.csv with a reason; every transformation is counted."""
from __future__ import annotations
import json
import numpy as np
import pandas as pd
from .schema import (CANONICAL_COLUMNS, EXTRA_COLUMNS, DATETIME_COLUMNS, NUMERIC_COLUMNS, BOOL_COLUMNS,
                     CITY_TO_IATA, AIRLINE_TO_CODE)
from .paths import PROCESSED, REPORTS

DUP_KEY = ["airline", "flight_number", "origin_airport", "destination_airport", "scheduled_departure"]
_TRUE = {"1", "true", "t", "yes", "y"}
_FALSE = {"0", "false", "f", "no", "n", "", "nan", "none", "<na>"}


def _str(s: pd.Series) -> pd.Series:
    return s.astype("object").where(s.notna(), None).map(lambda v: None if v is None else str(v).strip())


def normalize_airport(v):
    if v is None or str(v).strip() == "" or str(v).lower() in {"nan", "none", "<na>"}:
        return None
    s = str(v).strip()
    if len(s) == 3 and s.isalpha():
        return s.upper()
    low = s.lower()
    if low in CITY_TO_IATA:
        return CITY_TO_IATA[low]
    if "(" in s and ")" in s:                      # "Delhi (DEL)"
        inner = s[s.rfind("(") + 1:s.rfind(")")].strip()
        if len(inner) == 3 and inner.isalpha():
            return inner.upper()
    return s.upper()                                # unknown: kept as-is, flagged by validation


def normalize_airline(v):
    if v is None or str(v).strip() == "" or str(v).lower() in {"nan", "none", "<na>"}:
        return None
    s = str(v).strip()
    return AIRLINE_TO_CODE.get(s.lower(), s.upper() if len(s) <= 3 else s)


def to_bool01(s: pd.Series) -> pd.Series:
    def f(v):
        if v is None or (isinstance(v, float) and np.isnan(v)):
            return 0
        t = str(v).strip().lower()
        if t in _TRUE:
            return 1
        if t in _FALSE:
            return 0
        try:
            return int(float(t) != 0)
        except ValueError:
            return 0
    return s.map(f).astype(int)


def clean_flights(df: pd.DataFrame, max_abs_delay_min: float = 1440, write: bool = True):
    """Return (clean_df, removed_df, report). Input is canonical-schema flight rows."""
    report: dict = {"rows_before": int(len(df)), "transformations": {}}
    x = df.copy()
    for c in CANONICAL_COLUMNS + EXTRA_COLUMNS:
        if c not in x.columns:
            x[c] = np.nan
    x["_row_id"] = np.arange(len(x))
    tf = report["transformations"]

    # --- types
    # Preserve the source flight date when a timestamp is time-only.
    # Otherwise pandas may attach the machine's current date, corrupting
    # temporal splits and same-day connection pairing.
    if "flight_date" in x.columns:
        fd = pd.to_datetime(x["flight_date"], errors="coerce", dayfirst=False)
        time_only = r"^\s*\d{1,2}:\d{2}(:\d{2})?\s*$"
        for c in DATETIME_COLUMNS:
            m_time = x[c].notna() & x[c].astype(str).str.match(time_only)
            if m_time.any():
                x.loc[m_time, c] = pd.to_datetime(
                    fd[m_time].dt.strftime("%Y-%m-%d") + " " +
                    x.loc[m_time, c].astype(str).str.strip(),
                    errors="coerce"
                )
    bad_dt = {}
    for c in DATETIME_COLUMNS:
        before = x[c].notna().sum()
        x[c] = pd.to_datetime(x[c], errors="coerce")
        bad_dt[c] = int(before - x[c].notna().sum())
    report["invalid_values"] = {"unparseable_datetime": bad_dt}
    bad_num = {}
    for c in NUMERIC_COLUMNS:
        before = x[c].notna().sum()
        x[c] = pd.to_numeric(x[c], errors="coerce")
        bad_num[c] = int(before - x[c].notna().sum())
    report["invalid_values"]["non_numeric"] = bad_num
    x["cancelled"] = to_bool01(x["cancelled"])
    x["diverted"] = to_bool01(x["diverted"])

    # --- code normalisation
    for c in ("origin_airport", "destination_airport", "connection_airport"):
        x[c] = _str(x[c]).map(normalize_airport)
    x["airline"] = _str(x["airline"]).map(normalize_airline)
    x["flight_number"] = _str(x["flight_number"]).map(lambda v: None if v is None else v.upper().replace(" ", ""))
    tf["airport_codes_normalised"] = True

    # --- documented derivations (only when the observed timestamps exist)
    m = x["arrival_delay_min"].isna() & x["actual_arrival"].notna() & x["scheduled_arrival"].notna()
    x.loc[m, "arrival_delay_min"] = (x.loc[m, "actual_arrival"] - x.loc[m, "scheduled_arrival"]).dt.total_seconds() / 60
    tf["arrival_delay_derived_from_timestamps"] = int(m.sum())
    m = x["departure_delay_min"].isna() & x["actual_departure"].notna() & x["scheduled_departure"].notna()
    x.loc[m, "departure_delay_min"] = (x.loc[m, "actual_departure"] - x.loc[m, "scheduled_departure"]).dt.total_seconds() / 60
    tf["departure_delay_derived_from_timestamps"] = int(m.sum())
    m = x["scheduled_duration_min"].isna() & x["scheduled_departure"].notna() & x["scheduled_arrival"].notna()
    dur = (x["scheduled_arrival"] - x["scheduled_departure"]).dt.total_seconds() / 60
    ok = m & (dur > 0)
    x.loc[ok, "scheduled_duration_min"] = dur[ok]
    tf["scheduled_duration_derived"] = int(ok.sum())

    # --- missing values (reported, never imputed here)
    report["missing_values"] = {c: int(x[c].isna().sum()) for c in CANONICAL_COLUMNS + EXTRA_COLUMNS if x[c].isna().any()}

    removed = []

    def drop(mask, reason):
        nonlocal x
        if mask.any():
            r = x[mask].copy()
            r["removed_reason"] = reason
            removed.append(r)
            x = x[~mask]

    # --- invalid values
    drop(x["origin_airport"].notna() & (x["origin_airport"] == x["destination_airport"]), "origin_equals_destination")
    for c in ("arrival_delay_min", "departure_delay_min"):
        drop(x[c].abs() > max_abs_delay_min, f"{c}_beyond_{int(max_abs_delay_min)}min")

    # --- duplicates (identical key incl. scheduled_departure; first kept)
    key = [k for k in DUP_KEY if x[k].notna().any()]
    dups = 0
    if key:
        dmask = x.duplicated(subset=key, keep="first") & x[key].notna().all(axis=1)
        dups = int(dmask.sum())
        drop(dmask, "duplicate_flight")
    report["duplicates"] = {"key": key, "removed": dups}

    # --- outliers: flagged only, not removed
    out = {}
    for c in ("arrival_delay_min", "departure_delay_min"):
        s = x[c].dropna()
        if len(s) >= 20:
            q1, q3 = s.quantile([.25, .75])
            lo, hi = q1 - 3 * (q3 - q1), q3 + 3 * (q3 - q1)
            x[f"{c}_outlier"] = ((x[c] < lo) | (x[c] > hi)).astype(int)
            out[c] = {"rule": "outside Q1-3*IQR .. Q3+3*IQR (flag only)", "bounds": [float(lo), float(hi)],
                      "count": int(x[f"{c}_outlier"].sum())}
        else:
            x[f"{c}_outlier"] = 0
    report["outliers"] = out

    # --- cancelled / diverted are kept (flagged); modelling stages exclude them explicitly
    report["cancelled_rows_kept"] = int(x["cancelled"].sum())
    report["diverted_rows_kept"] = int(x["diverted"].sum())

    removed_df = pd.concat(removed) if removed else pd.DataFrame(columns=list(x.columns) + ["removed_reason"])
    report["rows_after"] = int(len(x))
    report["removed_rows"] = int(len(removed_df))
    report["removed_by_reason"] = removed_df["removed_reason"].value_counts().to_dict() if len(removed_df) else {}
    x = x.drop(columns=["_row_id"])
    removed_df = removed_df.drop(columns=["_row_id"], errors="ignore")

    if write:
        PROCESSED.mkdir(parents=True, exist_ok=True)
        REPORTS.mkdir(parents=True, exist_ok=True)
        x.to_csv(PROCESSED / "flights_clean.csv", index=False)
        removed_df.to_csv(PROCESSED / "removed_rows.csv", index=False)
        (REPORTS / "cleaning_report.json").write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    return x.reset_index(drop=True), removed_df, report
