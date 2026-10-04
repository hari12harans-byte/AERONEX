# Dataset Selection Report

## Status: DISCOVERY NOT PERFORMED — DATA SOURCE UNAVAILABLE

The environment in which this upgrade was written had no internet access, so Hugging Face could not be searched
and no dataset was downloaded, inspected or selected. **No dataset is claimed here.** The earlier README figure
"147,073 schedule rows (2018–2025)" could not be verified from anything in the repository and is not repeated.

`ml/config/datasets.yaml` ships with `dataset_id: CONFIGURE_ME`; such entries are skipped and reported as
`DATA SOURCE UNAVAILABLE`.

## How to complete this report
1. `cd ml && python scripts/discover_hf.py` → `ml/data/reports/hf_candidates.json` (candidates only, not evaluated).
2. For each candidate, open the dataset card and sample the data. Check: description, original source, date range,
   geographic coverage, columns, license, duplicates, missing values, whether rows are real observations, synthetic or
   derived from another source. A Hugging Face upload is **not** assumed to be official DGCA/MoCA data.
3. Put chosen IDs (ideally a pinned `revision`) and provenance in `datasets.yaml`; run `python -m src.pipeline`.
   Counts and license are then written to `ml/data/metadata/dataset_registry.json` automatically ("UNKNOWN" if not resolvable).
4. Record one entry per selected dataset below.

## Template (one block per selected dataset)
| Field | Value |
|---|---|
| Name | |
| Hugging Face ID | |
| Original source | |
| URL | |
| License | |
| Date range | |
| Number of records | |
| Columns | |
| Quality (duplicates / missing / outliers — see `cleaning_report.json`) | |
| Limitations | |
| Official or third-party | |
| Observed delays present? (required for the delay model and for labelling connections) | |

## What the pipeline needs from real data
- **Flight-level rows with scheduled times and OBSERVED arrival delay (or actual arrival)** — needed for both models.
  Schedule-only data can feed congestion features and connection pairing but cannot be labelled.
- **DGCA/MoCA monthly OTP files are normally aggregates** (airline × month / airport × month). They are loaded by
  `dgca_adapter.py` as `kind: aggregate` and are not used as per-flight labels.
- No source provides passenger-level missed-connection outcomes; see `docs/MODEL_CARD.md`.

## Dataset in use: AeroNex_Indian_Combined.csv (added 2026-10-03)
- Publisher, URL and licence: UNKNOWN (supplied by the project owner; not verified).
- 120,273 rows: 109,935 timetable rows + 10,338 fare rows. Fare rows are ignored (no flight number or time).
- Timetable rows are recurring patterns (days_of_week + valid_from/valid_to), expanded onto days 1-7 of each month (sampling choice).
- 34,404 timetable rows had every field needed; the rest lack departure or arrival time.
- The `timezone` column is a copy of `valid_to`; not used. Times are assumed to be IST.
- NO actual times or delays exist, so the delay model cannot be trained from this file.
- Airport names were mapped to IATA codes in src/schema.py ("MIHAN" -> NAG is an assumption).
- Connection training uses no_observed_delay_policy: assume_zero (arrival delay = 0, flagged arrival_delay_source = assumed_zero).
