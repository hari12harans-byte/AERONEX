# AeroNex Model Card — Two-stage connection-risk prototype

> **Status: MODEL NOT TRAINED.** No dataset ships with this repository, so no model artifact and **no metrics** exist.
> This card describes the design and what must be filled in after training. Numbers appear only in
> `ml/models/*_metadata.json` and `ml/data/reports/model_comparison.csv`, produced by `python -m src.train` on real data.

**The prototype is decision support. It is NOT an autonomous airline operational control system.**

## Purpose
Help a traveller see whether a planned connection is at risk and why. Two independent models:
1. **Flight delay model** (`ml/src/delay_model/`): classifier for `significant_delay` (arrival delay ≥ a configurable threshold,
   default 15 min, `ml/config/settings.yaml`) and a regressor for expected arrival-delay minutes.
2. **Connection risk model** (`ml/src/train.py`): `P(missed_connection)` from expected delay, scheduled connection time and
   airport transfer requirements. Output is called an **estimated probability**.

Candidates (compared on a temporal validation split): logistic regression, random forest, histogram gradient boosting,
XGBoost only if installed. Selection: highest validation PR-AUC among models whose validation recall ≥ `min_recall_target`
(default 0.80), otherwise highest recall; accuracy is never the criterion. Classes are re-weighted (`class_weight=balanced`)
when the minority share < 35 %; SMOTE is not used. Calibration (`sigmoid` by default) is fitted on the validation split and
Brier/ECE before and after are saved. Optional `--search` runs a small RandomizedSearchCV with time-ordered folds.

## Training data
None bundled. See `docs/DATASET_SELECTION_REPORT.md` and `ml/data/metadata/dataset_registry.json` (written by the pipeline).
Connection scenarios are built by pairing real schedule rows (same airline, airport, day, 30–360 min gap, seeded cap per
airport-day). They are plausible itineraries, not booked passengers.

## Label definition — read this
No public source gives passenger-level missed-connection outcomes. The label is therefore:
- **DERIVED PROTOTYPE LABEL** (`derived_deterministic`, default): `missed_connection = 1` if `connection_buffer_min < 0`. This is
  "connection feasibility", **not confirmed ground truth**, and it depends on *estimated* airport transfer times.
- **SYNTHETIC / EXPERIMENTAL** (`experimental_stochastic`, optional): feasibility with seeded random variation in transfer time.
  Not observed; not real-world ground truth.

Consequence: with the default label the target is a deterministic function of the inputs, so held-out metrics measure how well
the model reproduces that rule, **not** real-world predictive skill. The trainer records this as a warning in the metadata and
reports a `rule_baseline_buffer_lt_0` row in the comparison file. Do not quote these metrics as real-world accuracy.

## Features
Connection model: arrival_delay_min, connection_time_min, deplaning/gate-walk/security/immigration/boarding-cutoff minutes,
gate_change, terminal_change, weather_risk, airport_congestion, hour_of_day, day_of_week, is_weekend, is_peak_hour, and the
derived available/required/buffer minutes. Features with no real data in the source (typically gate_change, weather_risk) are
dropped at training time and listed in `features_dropped_all_nan`; at prediction time unknown inputs are imputed by the model and
reported under `data_quality.unknown_imputed_by_model`.
Explanations: global permutation importance on validation data (`top_factors`); not a per-prediction attribution. SHAP is not used.

## Metrics
_To be filled from `model_metadata.json` after training: precision, recall, F1, ROC-AUC, PR-AUC, confusion matrix, Brier, ECE for
validation and test, plus train/validation/test periods._ Currently: **none exist**.

## Limitations
- Derived/synthetic label (above); airport transfer times are estimates (`source_type = estimated`).
- Connecting-flight delay is not a model input; AeroNex folds it into `connection_time_min` upstream.
- Overnight connections, baggage, immigration queues, airline rebooking policy and real gate/terminal events are not modelled.
- Trained on whatever schedule/delay data you provide; coverage, period and quality limits carry over. Distribution shift is likely.
- Probabilities are only as reliable as the calibration check on the derived label.

## Intended use
Decision support in the AeroNex app alongside the rule-based Connection Guardian. The backend lets ML **raise** but never
**lower** the deterministic risk level.

## Not intended for
Airline or airport operations, safety decisions, denying boarding, compensation/liability decisions, or any claim that a
passenger will or will not make a connection.

## Ethical considerations
Passenger data is not used. Do not add personal identifiers to training data. Show uncertainty ("estimated probability"), keep
the explanation visible, and keep the rule-based fallback. Re-evaluate before any use with real passenger outcomes.

## Trained run: connection model on AeroNex_Indian_Combined.csv
Label: DERIVED PROTOTYPE (missed = buffer < 0). Arrival delay assumed 0 for 100% of rows. 649,659 scenarios, 9.0% positive.
Temporal split 70/15/15. Test: recall 0.994, precision 1.0, PR-AUC 1.0. All candidates and the rule baseline tie at ~1.0,
because the label is a function of the inputs. These numbers measure rule-copying, NOT real-world accuracy. Delay model: NOT TRAINED.
