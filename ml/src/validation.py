"""Validation produces warnings; it never edits data."""
from __future__ import annotations
import json
import pandas as pd
from .paths import REPORTS, REFERENCE


def known_airports():
    p = REFERENCE / "airport_profiles.csv"
    return set(pd.read_csv(p)["airport"].str.upper()) if p.exists() else set()


def validate_flights(df: pd.DataFrame, write: bool = True):
    warns = []

    def add(check, count, severity, msg):
        if count:
            warns.append({"check": check, "count": int(count), "severity": severity, "message": msg})

    for c in ("origin_airport", "destination_airport"):
        codes = df[c].dropna().astype(str)
        add(f"{c}_not_iata_shape", (~codes.str.fullmatch(r"[A-Z]{3}")).sum(), "warning",
            f"{c} values that are not 3-letter codes (kept as-is)")
        k = known_airports()
        if k:
            add(f"{c}_not_in_airport_profiles", (~codes.isin(k)).sum(), "info",
                f"{c} airports without a profile row; the DEFAULT profile (estimated) will be used")
    add("null_scheduled_departure", df["scheduled_departure"].isna().sum(), "warning", "rows without scheduled departure")
    add("null_scheduled_arrival", df["scheduled_arrival"].isna().sum(), "warning", "rows without scheduled arrival")
    both = df["scheduled_departure"].notna() & df["scheduled_arrival"].notna()
    add("arrival_before_departure", (both & (df["scheduled_arrival"] < df["scheduled_departure"])).sum(), "warning",
        "scheduled arrival earlier than departure (possible missing next-day rollover or timezone issue)")
    add("null_arrival_delay", df["arrival_delay_min"].isna().sum(), "info",
        "no observed arrival delay (schedule-only rows cannot be labelled)")
    add("implausible_early_arrival", (df["arrival_delay_min"] < -120).sum(), "warning", "arrival more than 2h early")
    add("negative_connection_time", (df.get("connection_time_min", pd.Series(dtype=float)) < 0).sum(), "error",
        "negative scheduled connection time")
    add("duplicate_flight_after_cleaning", df.duplicated(subset=["airline", "flight_number", "origin_airport", "scheduled_departure"]).sum(),
        "warning", "duplicates remain")
    if "scheduled_departure" in df and df["scheduled_departure"].notna().any():
        span = (df["scheduled_departure"].min(), df["scheduled_departure"].max())
    else:
        span = (None, None)
    rep = {"rows": int(len(df)), "date_range": [str(span[0]), str(span[1])], "warnings": warns}
    if write:
        REPORTS.mkdir(parents=True, exist_ok=True)
        (REPORTS / "validation_report.json").write_text(json.dumps(rep, indent=2), encoding="utf-8")
    return rep
