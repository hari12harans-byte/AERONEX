"""python -m src.pipeline  — ingest -> adapt -> clean -> validate -> features. Writes reports; invents nothing."""
from __future__ import annotations
import hashlib
import json
import sys
import pandas as pd
from .adapters import ADAPTERS
from .cleaning import clean_flights
from .connections import build_connection_scenarios
from .features import build_delay_features
from .huggingface_loader import DataSourceUnavailable, is_configured
from .paths import FEATURES, PROCESSED, REPORTS, load_yaml, resolve_path, settings
from . import registry
from .validation import validate_flights


def _adapter_cfg(name, spec):
    cfg = dict(spec)
    if spec.get("source") == "local" and spec.get("path"):
        cfg["path"] = str(resolve_path(spec["path"]))
    return cfg


def ingest(only=None):
    ds = load_yaml("datasets.yaml")["datasets"]
    flights, status = [], {}
    for name, spec in ds.items():
        if only and name not in only:
            continue
        if not spec.get("enabled", True):
            status[name] = "disabled"; continue
        if spec.get("source") == "huggingface" and not is_configured(spec.get("dataset_id")):
            status[name] = "DATA SOURCE UNAVAILABLE: dataset_id is CONFIGURE_ME"; continue
        try:
            res = ADAPTERS[spec.get("adapter", "csv")](_adapter_cfg(name, spec)).load()
        except (DataSourceUnavailable, FileNotFoundError) as e:
            status[name] = str(e) if str(e).startswith("DATA SOURCE") else f"DATA SOURCE UNAVAILABLE: {e}"; continue
        prov = spec.get("provenance", {})
        registry.upsert({
            "name": name, "source_name": prov.get("source_name", "UNKNOWN"), "source_url": prov.get("source_url", res.provenance.get("source_url", "UNKNOWN")),
            "dataset_id": res.provenance.get("dataset_id", res.provenance.get("source_file", "UNKNOWN")),
            "license": prov.get("license", res.provenance.get("license", "UNKNOWN")),
            "dataset_version": res.provenance.get("dataset_version", "UNKNOWN"),
            "record_count": int(len(res.df)), "kind": res.kind, "official_source": bool(prov.get("official", False)),
            "description": res.provenance.get("description", "UNKNOWN"),
            "limitations": res.notes + ([f"unmapped canonical columns: {res.unmapped_canonical}"] if res.unmapped_canonical else []),
        })
        status[name] = f"loaded {len(res.df)} rows ({res.kind})"
        if res.kind == "flights":
            res.df["_source"] = name
            flights.append(res.df)
    return flights, status


def dataset_version(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()[:12] if path.exists() else "UNKNOWN"


def main():
    s = settings()
    flights, status = ingest()
    print(json.dumps(status, indent=2))
    if not flights:
        print("\nNo flight-level data available. Nothing was generated. Add data (see ml/data/README.md) and re-run.")
        return 2
    raw = pd.concat(flights, ignore_index=True, sort=False)
    clean, removed, _ = clean_flights(raw, s["delay_model"]["max_abs_delay_min"])
    vrep = validate_flights(clean)
    FEATURES.mkdir(parents=True, exist_ok=True)
    delay = build_delay_features(clean, s)
    delay.to_csv(FEATURES / "delay_features.csv", index=False)
    conn, crep = build_connection_scenarios(clean, s)
    if len(conn):
        conn.to_csv(FEATURES / "connection_features.csv", index=False)
    (REPORTS / "build_report.json").write_text(json.dumps(
        {"sources": status, "flight_rows": int(len(clean)), "delay_feature_rows": int(len(delay)),
         "connection_build": crep, "validation_warnings": len(vrep["warnings"])}, indent=2, default=str), encoding="utf-8")
    print(json.dumps(crep, indent=2, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
