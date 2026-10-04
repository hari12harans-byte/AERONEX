# ml/data
- `raw/` — original files, never modified. Nothing is bundled; add your own (see `../SETUP.md`).
- `processed/` — `flights_clean.csv`, `removed_rows.csv` (every dropped row with its reason).
- `features/` — `delay_features.csv`, `connection_features.csv`.
- `reports/` — cleaning / validation / build reports, `model_comparison.csv`.
- `reference/airport_profiles.csv` — transfer-time **estimates** (not official measurements); edit with real figures and set `source_type`.
- `metadata/dataset_registry.json` — provenance per ingested dataset (unknown fields are written as `UNKNOWN`).
