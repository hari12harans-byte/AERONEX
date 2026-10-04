"""MODEL 1 — flight delay. Classifier (P[significant_delay]) + regressor (expected arrival delay minutes)."""
from __future__ import annotations
import json
from datetime import datetime, timezone
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.pipeline import Pipeline
from ..modeling import ABBR, drop_all_nan, preprocessor, temporal_split
from ..paths import FEATURES, MODELS
from ..pipeline import dataset_version


def train_delay(s, search=False):
    from ..train import CATEGORICAL_ALWAYS, _meta, train_classifier
    path = FEATURES / "delay_features.csv"
    if not path.exists():
        raise FileNotFoundError("data/features/delay_features.csv not found — run `python -m src.pipeline` with flight data that has OBSERVED delays")
    df = pd.read_csv(path, parse_dates=["scheduled_departure"])
    if len(df) < 200:
        raise RuntimeError(f"only {len(df)} rows with observed delays; refusing to train the delay model")
    thr = s["delay_model"]["significant_delay_threshold_min"]
    r = train_classifier(df, "significant_delay", s["delay_model"]["features"], "scheduled_departure", s, "delay", search)
    label_info = {"label_type": "observed", "label_status": f"OBSERVED: significant_delay = arrival_delay_min >= {thr} (configurable threshold)",
                  "significant_delay_threshold_min": thr, "warnings": []}

    # ---- regressor for expected delay minutes (same temporal split and features as the classifier)
    cols = r["features"]
    cat = [c for c in cols if c in CATEGORICAL_ALWAYS]
    num = [c for c in cols if c not in cat]
    tr, va, te, _ = temporal_split(df.sort_values("scheduled_departure"), "scheduled_departure", s["common"]["split"], s["common"]["random_state"])
    lo, hi = tr["arrival_delay_min"].quantile([0.01, 0.99])
    reg = Pipeline([("pre", preprocessor(num, cat, False)),
                    ("model", HistGradientBoostingRegressor(loss="absolute_error", random_state=s["common"]["random_state"]))])
    reg.fit(tr[cols], tr["arrival_delay_min"].clip(lo, hi))
    med = float(tr["arrival_delay_min"].median())
    reg_metrics = {}
    for nm, part in (("validation", va), ("test", te)):
        p = reg.predict(part[cols]); y = part["arrival_delay_min"].values
        reg_metrics[nm] = {"mae": float(mean_absolute_error(y, p)), "rmse": float(np.sqrt(mean_squared_error(y, p))),
                           "baseline_median_mae": float(mean_absolute_error(y, np.full(len(y), med)))}
    meta = _meta(r, path, "aeronex-delay", label_info, s,
                 {"regressor": {"type": "hist_gradient_boosting_regressor (absolute_error)", "target_clip_1_99_pct": [float(lo), float(hi)],
                                "metrics": reg_metrics, "file": "aeronex_delay_regressor.joblib"}})
    MODELS.mkdir(exist_ok=True)
    joblib.dump({"model": r["final"], "features": cols}, MODELS / "aeronex_delay_model.joblib")
    joblib.dump({"model": reg, "features": cols}, MODELS / "aeronex_delay_regressor.joblib")
    (MODELS / "delay_model_metadata.json").write_text(json.dumps(meta, indent=2, default=str), encoding="utf-8")
    return r, meta
