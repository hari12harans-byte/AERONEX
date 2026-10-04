"""Shared modelling utilities: temporal split, candidates, evaluation, selection, calibration, importance."""
from __future__ import annotations
import warnings
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (average_precision_score, brier_score_loss, confusion_matrix, f1_score,
                             precision_score, recall_score, roc_auc_score, accuracy_score)
from sklearn.model_selection import RandomizedSearchCV, TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ABBR = {"logistic_regression": "lr", "random_forest": "rf", "hist_gradient_boosting": "hgb", "xgboost": "xgb"}


# ----------------------------------------------------------------------------- splitting
def temporal_split(df: pd.DataFrame, time_col: str, fracs: dict, seed: int = 42):
    """Older rows -> train, newer -> validation/test (cut by timestamp, so equal timestamps never straddle a cut)."""
    t = pd.to_datetime(df[time_col], errors="coerce")
    info = {"time_column": time_col}
    if t.notna().sum() >= 0.99 * len(df) and t.nunique() >= 10:
        c1 = t.quantile(fracs["train"])
        c2 = t.quantile(fracs["train"] + fracs["validation"])
        tr, va, te = df[t <= c1], df[(t > c1) & (t <= c2)], df[t > c2]
        if min(len(tr), len(va), len(te)) > 0:
            info.update(split_method="temporal",
                        train_period=[str(t[t <= c1].min()), str(c1)],
                        validation_period=[str(t[(t > c1) & (t <= c2)].min()), str(c2)],
                        test_period=[str(t[t > c2].min()), str(t.max())])
            return tr, va, te, info
    rng = np.random.default_rng(seed)
    idx = rng.permutation(len(df))
    n1, n2 = int(len(df) * fracs["train"]), int(len(df) * (fracs["train"] + fracs["validation"]))
    info.update(split_method="random_fallback",
                warning="Timestamps unusable for a temporal split; random split may leak across time.")
    return df.iloc[idx[:n1]], df.iloc[idx[n1:n2]], df.iloc[idx[n2:]], info


# ----------------------------------------------------------------------------- candidates
def preprocessor(numeric, categorical, scale):
    num = [("imp", SimpleImputer(strategy="median"))] + ([("sc", StandardScaler())] if scale else [])
    parts = [("num", Pipeline(num), numeric)]
    if categorical:
        parts.append(("cat", Pipeline([("imp", SimpleImputer(strategy="constant", fill_value="UNKNOWN")),
                                       ("oh", OneHotEncoder(handle_unknown="ignore", min_frequency=20, sparse_output=False))]),
                      categorical))
    return ColumnTransformer(parts)


def candidates(numeric, categorical, class_weight, seed=42):
    c = {
        "logistic_regression": Pipeline([("pre", preprocessor(numeric, categorical, True)),
                                         ("model", LogisticRegression(max_iter=2000, class_weight=class_weight))]),
        "random_forest": Pipeline([("pre", preprocessor(numeric, categorical, False)),
                                   ("model", RandomForestClassifier(n_estimators=300, min_samples_leaf=2, class_weight=class_weight,
                                                                    n_jobs=-1, random_state=seed))]),
        "hist_gradient_boosting": Pipeline([("pre", preprocessor(numeric, categorical, False)),
                                            ("model", HistGradientBoostingClassifier(class_weight=class_weight, random_state=seed))]),
    }
    try:  # optional dependency
        from xgboost import XGBClassifier
        c["xgboost"] = Pipeline([("pre", preprocessor(numeric, categorical, False)),
                                 ("model", XGBClassifier(n_estimators=300, max_depth=6, learning_rate=0.1, eval_metric="logloss",
                                                         random_state=seed, n_jobs=-1))])
    except Exception:
        pass
    return c


SEARCH_SPACE = {
    "random_forest": {"model__n_estimators": [200, 400], "model__max_depth": [None, 8, 16], "model__min_samples_leaf": [1, 2, 5]},
    "hist_gradient_boosting": {"model__learning_rate": [0.03, 0.06, 0.1], "model__max_leaf_nodes": [15, 31, 63],
                               "model__l2_regularization": [0.0, 1.0]},
}


def random_search(name, pipe, X, y, n_iter, cv_splits, seed):
    """Small RandomizedSearchCV on the TRAIN set with time-ordered CV folds (data must be sorted by time)."""
    space = SEARCH_SPACE.get(name)
    if not space or y.nunique() < 2:
        return pipe, None
    rs = RandomizedSearchCV(pipe, space, n_iter=min(n_iter, int(np.prod([len(v) for v in space.values()]))),
                            scoring="average_precision", cv=TimeSeriesSplit(n_splits=cv_splits), random_state=seed,
                            n_jobs=1, refit=True, error_score=np.nan)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        rs.fit(X, y)
    return rs.best_estimator_, {"model": name, "search_space": {k: [str(i) for i in v] for k, v in space.items()},
                                "n_iter": rs.n_iter, "scoring": "average_precision (time-ordered CV on train)",
                                "best_params": {k: (None if v is None else v) for k, v in rs.best_params_.items()},
                                "best_cv_score": float(rs.best_score_)}


# ----------------------------------------------------------------------------- evaluation
def evaluate(y, p, thr=0.5):
    y = np.asarray(y).astype(int)
    pred = (np.asarray(p) >= thr).astype(int)
    two = len(np.unique(y)) == 2
    cm = confusion_matrix(y, pred, labels=[0, 1])
    return {
        "n": int(len(y)), "prevalence": float(y.mean()), "threshold": thr,
        "precision": float(precision_score(y, pred, zero_division=0)),
        "recall": float(recall_score(y, pred, zero_division=0)),
        "f1": float(f1_score(y, pred, zero_division=0)),
        "accuracy": float(accuracy_score(y, pred)),
        "roc_auc": float(roc_auc_score(y, p)) if two else None,
        "pr_auc": float(average_precision_score(y, p)) if two else None,
        "brier": float(brier_score_loss(y, p)),
        "confusion_matrix": {"tn": int(cm[0, 0]), "fp": int(cm[0, 1]), "fn": int(cm[1, 0]), "tp": int(cm[1, 1])},
    }


def calibration_bins(y, p, n_bins=10):
    y, p = np.asarray(y), np.asarray(p)
    edges = np.linspace(0, 1, n_bins + 1)
    rows, ece = [], 0.0
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (p >= lo) & ((p < hi) | (hi == 1.0))
        if m.any():
            rows.append({"bin": f"{lo:.1f}-{hi:.1f}", "n": int(m.sum()), "mean_predicted": float(p[m].mean()), "observed_rate": float(y[m].mean())})
            ece += m.mean() * abs(p[m].mean() - y[m].mean())
    return {"ece": float(ece), "bins": rows}


def class_weight_for(y, minority_threshold=0.35):
    share = float(np.mean(y))
    return ("balanced" if min(share, 1 - share) < minority_threshold else None), {"positive_share": share}


def select_model(results, min_recall):
    """Best validation PR-AUC among models whose validation recall >= min_recall; otherwise best recall.
    Criteria are returned so they can be written into the model card. Accuracy is never used."""
    ok = [r for r in results if r["validation"]["pr_auc"] is not None]
    if not ok:
        return None, "no model had a computable PR-AUC on validation"
    meets = [r for r in ok if r["validation"]["recall"] >= min_recall]
    if meets:
        best = max(meets, key=lambda r: (r["validation"]["pr_auc"], r["validation"]["recall"]))
        return best, f"highest validation PR-AUC among models with validation recall >= {min_recall}"
    best = max(ok, key=lambda r: (r["validation"]["recall"], r["validation"]["pr_auc"]))
    return best, f"no model reached validation recall {min_recall}; chose highest validation recall (PR-AUC as tie-break)"


def calibrate(pipe, Xva, yva, method):
    from sklearn.calibration import CalibratedClassifierCV
    from sklearn.frozen import FrozenEstimator
    if yva.nunique() < 2 or len(yva) < 100:
        return None
    cal = CalibratedClassifierCV(FrozenEstimator(pipe), method=method)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        cal.fit(Xva, yva)
    return cal


def importances(pipe, X, y, seed=42, top=None):
    """Global permutation importance (average_precision drop) on held-out validation data."""
    if y.nunique() < 2:
        return []
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        r = permutation_importance(pipe, X, y, scoring="average_precision", n_repeats=5, random_state=seed, n_jobs=1)
    rows = sorted(({"feature": c, "importance": float(m), "std": float(s)} for c, m, s in zip(X.columns, r.importances_mean, r.importances_std)),
                  key=lambda d: -d["importance"])
    return rows[:top] if top else rows


def drop_all_nan(df, cols):
    keep = [c for c in cols if c in df.columns and df[c].notna().any()]
    dropped = [c for c in cols if c not in keep]
    return keep, dropped
