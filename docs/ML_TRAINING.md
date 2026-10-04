# AeroNex ML Training

The bundled models were retrained from `data/training/AeroNex_Training_Dataset.csv`.

## Models
- `models/aeronex_delay_xgb.joblib`: XGBoost regressor predicting `arrival_delay`.
- `models/aeronex_cancellation_xgb.joblib`: XGBoost classifier predicting `cancelled`.
- `models/aeronex_connection_xgb_proxy.joblib`: XGBoost classifier predicting `connection_feasible_proxy`.

## Evaluation
See `ml/reports/training_metrics.json`.

The dataset contains only 190 rows and 5 cancellation positives. Cancellation metrics are therefore low confidence. The connection label is an operational proxy, not passenger-level caught/missed outcome data.

For production aviation use, replace the proxy and small historical sample with larger, time-aligned operational and anonymized passenger connection outcomes.
