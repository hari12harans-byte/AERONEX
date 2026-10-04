"""python -m src.train [--stage all|delay|connection] [--search]

Trains ONLY from files produced by src.pipeline. If they are missing/unusable it prints MODEL NOT TRAINED
and exits non-zero. It never fabricates data or metrics.
"""
from __future__ import annotations
import argparse
import json
import sys
from datetime import datetime, timezone
import joblib
import pandas as pd
from .modeling import (ABBR, calibrate, calibration_bins, candidates, class_weight_for, drop_all_nan, evaluate,
                       importances, random_search, select_model, temporal_split)
from .paths import FEATURES, MODELS, REPORTS, settings
from .pipeline import dataset_version

CATEGORICAL_ALWAYS = {"airline", "origin_airport", "destination_airport", "connection_airport"}


def train_classifier(df, target, features, time_col, s, tag, search=False, rule_baseline=None):
    """Compare candidates on a temporal split. Returns a dict with everything needed to save artifacts."""
    common = s["common"]
    cols, dropped = drop_all_nan(df, features)
    cat = [c for c in cols if c in CATEGORICAL_ALWAYS]
    num = [c for c in cols if c not in cat]
    tr, va, te, split = temporal_split(df.sort_values(time_col), time_col, common["split"], common["random_state"])
    ytr, yva, yte = tr[target].astype(int), va[target].astype(int), te[target].astype(int)
    if ytr.nunique() < 2:
        raise RuntimeError(f"training labels contain a single class ({tag}); cannot train a classifier")
    cw, imb = class_weight_for(ytr)
    imb.update(class_weight=cw or "none", train_distribution=ytr.value_counts().sort_index().to_dict(),
               resampling="none (SMOTE not used; not tested)")
    X = lambda d: d[cols]
    results, searches = [], []
    for name, pipe in candidates(num, cat, cw, common["random_state"]).items():
        if search or common["search"]["enabled"]:
            pipe, info = random_search(name, pipe, X(tr), ytr, common["search"]["n_iter"], common["search"]["cv_splits"], common["random_state"])
            if info:
                searches.append(info)
        pipe.fit(X(tr), ytr)
        pv = pipe.predict_proba(X(va))[:, 1]
        results.append({"name": name, "pipeline": pipe, "validation": evaluate(yva, pv, common["decision_threshold"])})
    if rule_baseline is not None:
        results_rule = {"name": "rule_baseline_buffer_lt_0", "validation": evaluate(yva, rule_baseline(va), common["decision_threshold"])}
    else:
        results_rule = None
    best, criteria = select_model(results, common["min_recall_target"])
    if best is None:
        raise RuntimeError(criteria)
    final, cal_info = best["pipeline"], {"applied": False}
    if common["calibrate"]:
        cal = calibrate(best["pipeline"], X(va), yva, common["calibration_method"])
        if cal is not None:
            final = cal
            cal_info = {"applied": True, "method": common["calibration_method"], "fitted_on": "validation split"}
        else:
            cal_info["reason"] = "validation split too small or single-class"
    p_raw = best["pipeline"].predict_proba(X(te))[:, 1]
    p_fin = final.predict_proba(X(te))[:, 1]
    test = evaluate(yte, p_fin, common["decision_threshold"])
    if cal_info["applied"]:
        cal_info["test_brier_before"] = evaluate(yte, p_raw)["brier"]
        cal_info["test_brier_after"] = test["brier"]
    cal_info["test_calibration"] = calibration_bins(yte, p_fin)
    imp = importances(best["pipeline"], X(va), yva, common["random_state"])
    comp = [{"stage": tag, "model": r["name"], "split": "validation", "selected": r is best, **{k: v for k, v in r["validation"].items() if k != "confusion_matrix"},
             **{f"cm_{k}": v for k, v in r["validation"]["confusion_matrix"].items()}} for r in results]
    if results_rule:
        comp.append({"stage": tag, "model": results_rule["name"], "split": "validation", "selected": False,
                     **{k: v for k, v in results_rule["validation"].items() if k != "confusion_matrix"},
                     **{f"cm_{k}": v for k, v in results_rule["validation"]["confusion_matrix"].items()}})
    return dict(best=best, final=final, features=cols, dropped=dropped, split=split, imbalance=imb, criteria=criteria,
                calibration=cal_info, test=test, validation=best["validation"], importance=imp, comparison=comp,
                searches=searches, sizes=(len(tr), len(va), len(te)))


def _meta(r, df_path, model_type_prefix, label_info, s, extra=None):
    best = r["best"]["name"]
    tr, va, te = r["sizes"]
    m = {"model_type": best, "model_version": f"{model_type_prefix}-{ABBR.get(best, best)}-v1",
         "training_timestamp": datetime.now(timezone.utc).isoformat(), "dataset_version": dataset_version(df_path),
         "feature_version": s["feature_version"], "training_rows": tr, "validation_rows": va, "test_rows": te,
         "metrics": {"validation": r["validation"], "test": r["test"]}, "features": r["features"],
         "features_dropped_all_nan": r["dropped"], "split": r["split"], "imbalance": r["imbalance"],
         "selection_criteria": r["criteria"], "calibration": r["calibration"], "feature_importance": r["importance"],
         "feature_importance_method": "permutation importance (average_precision drop) on validation split; global, not per-prediction",
         "hyperparameter_search": r["searches"], **label_info}
    m.update(extra or {})
    return m


def train_connection(s, search=False):
    path = FEATURES / "connection_features.csv"
    if not path.exists():
        raise FileNotFoundError("data/features/connection_features.csv not found — run `python -m src.pipeline` with real data first")
    df = pd.read_csv(path, parse_dates=["scheduled_arrival", "scheduled_departure"])
    mode = s["connection_model"]["label_mode"]
    feats = s["connection_model"]["features"]
    r = train_classifier(df, "missed_connection", feats, "scheduled_arrival", s, "connection", search,
                         rule_baseline=lambda d: (d["connection_buffer_min"] < 0).astype(float).values)
    warns = []
    if mode == "derived_deterministic" and "connection_buffer_min" in r["features"]:
        warns.append("The label is a deterministic function of the input features (buffer = available - required; missed = buffer < 0). "
                     "Metrics show how well the model reproduces that rule, NOT how well it predicts real passenger outcomes.")
    label_info = {"label_type": mode, "label_status": "DERIVED PROTOTYPE LABEL" if mode == "derived_deterministic" else "SYNTHETIC / EXPERIMENTAL LABEL",
                  "label_note": df["label_note"].iloc[0], "warnings": warns,
                  "arrival_delay_source_in_training": df["arrival_delay_source"].value_counts().to_dict() if "arrival_delay_source" in df.columns else "observed"}
    if "arrival_delay_source" in df.columns and (df["arrival_delay_source"] == "assumed_zero").any():
        warns.append("arrival_delay_min was ASSUMED to be 0 for %.0f%% of training rows (schedule-only data, no observed delays). "
                     "The model has learned nothing about delays; it describes planned-schedule feasibility only." % (100 * (df["arrival_delay_source"] == "assumed_zero").mean()))
    label_info["warnings"] = warns
    meta = _meta(r, path, "aeronex", label_info, s)
    MODELS.mkdir(exist_ok=True)
    joblib.dump({"model": r["final"], "features": r["features"]}, MODELS / "aeronex_connection_model.joblib")
    (MODELS / "model_metadata.json").write_text(json.dumps(meta, indent=2, default=str), encoding="utf-8")
    return r, meta


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", choices=["all", "delay", "connection"], default="all")
    ap.add_argument("--search", action="store_true", help="small RandomizedSearchCV before comparison")
    a = ap.parse_args(argv)
    s = settings()
    REPORTS.mkdir(parents=True, exist_ok=True)
    comp, rc = [], 0
    try:
        if a.stage in ("all", "delay"):
            from .delay_model.train_delay import train_delay
            r, meta = train_delay(s, a.search)
            comp += r["comparison"] if isinstance(r, dict) else []
            print("delay model:", meta["model_version"], "| selection:", meta["selection_criteria"])
        if a.stage in ("all", "connection"):
            r, meta = train_connection(s, a.search)
            comp += r["comparison"]
            print("connection model:", meta["model_version"], "|", meta["label_status"])
            for w in meta["warnings"]:
                print("WARNING:", w)
    except (FileNotFoundError, RuntimeError) as e:
        print(f"MODEL NOT TRAINED: {e}")
        rc = 2
    if comp:
        pd.DataFrame(comp).to_csv(REPORTS / "model_comparison.csv", index=False)
    return rc


if __name__ == "__main__":
    sys.exit(main())
