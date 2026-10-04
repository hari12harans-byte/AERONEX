"""Serving logic for AeroNex ML models (Connection Guardian, Delay XGBoost, Cancellation XGBoost)."""
from __future__ import annotations
import json
from datetime import datetime, timezone
import joblib
import numpy as np
import pandas as pd
from .features import load_profiles, profile_for
from .paths import MODELS, settings

PROB_NOTE = ("Estimated probability from a model trained on a DERIVED PROTOTYPE LABEL; it is not a measured "
             "real-world probability. Decision support only.")
NOT_TRAINED = "MODEL NOT TRAINED"


class ModelNotTrained(RuntimeError):
    pass


def risk_from_probability(p: float, bands: dict) -> str:
    if p >= bands["critical"]:
        return "CRITICAL"
    if p >= bands["high"]:
        return "HIGH"
    if p >= bands["medium"]:
        return "MEDIUM"
    return "LOW"


class Predictor:
    def __init__(self):
        self.s = settings()
        self.conn = None
        self.meta = None
        self.delay = None
        self.delay_reg = None
        self.delay_meta = None
        self.delay_xgb = None
        self.cancellation_xgb = None
        self.profiles = load_profiles()
        self.load()

    def load(self):
        # 1. Connection model (logistic regression / calibrated classifier)
        p = MODELS / "aeronex_connection_model.joblib"
        if p.exists() and (MODELS / "model_metadata.json").exists():
            try:
                self.conn = joblib.load(p)
                self.meta = json.loads((MODELS / "model_metadata.json").read_text(encoding="utf-8"))
            except Exception as e:
                print(f"[ML] Error loading connection model: {e}")

        # 2. XGBoost delay regressor
        xgb_delay_p = MODELS / "aeronex_delay_xgb.joblib"
        if xgb_delay_p.exists():
            try:
                self.delay_xgb = joblib.load(xgb_delay_p)
                self.delay = self.delay_xgb
            except Exception as e:
                print(f"[ML] Error loading delay XGB: {e}")

        # 3. XGBoost cancellation / severe delay classifier
        xgb_canc_p = MODELS / "aeronex_cancellation_xgb.joblib"
        if not xgb_canc_p.exists():
            xgb_canc_p = MODELS / "aeronex_severe_delay_xgb.joblib"
        if xgb_canc_p.exists():
            try:
                self.cancellation_xgb = joblib.load(xgb_canc_p)
            except Exception as e:
                print(f"[ML] Error loading cancellation XGB: {e}")

    # ------------------------------------------------------------------ info
    def health(self):
        return {
            "ok": True,
            "connection_model_loaded": self.conn is not None,
            "delay_model_loaded": (self.delay_xgb is not None or self.delay is not None),
            "cancellation_model_loaded": self.cancellation_xgb is not None,
            "status": "ready" if self.conn is not None else NOT_TRAINED,
        }

    def info(self):
        if self.meta is None:
            return {"status": NOT_TRAINED, "detail": "Train or bundle the model in ml/models."}
        keys = ["model_type", "model_version", "training_timestamp", "dataset_version", "feature_version", "training_rows",
                "validation_rows", "test_rows", "metrics", "features", "label_type", "label_status", "label_note", "warnings",
                "split", "calibration", "selection_criteria"]
        out = {k: self.meta.get(k) for k in keys}
        out["calibration"] = {k: v for k, v in (out["calibration"] or {}).items() if k != "test_calibration"}
        out["delay_model"] = "aeronex_delay_xgb" if self.delay_xgb is not None else NOT_TRAINED
        out["cancellation_model"] = "aeronex_cancellation_xgb" if self.cancellation_xgb is not None else NOT_TRAINED
        return out

    # ------------------------------------------------------------------ predict operational
    def predict_operational(self, x: dict) -> dict:
        """Run XGBoost Delay and Cancellation models for a specific flight."""
        row = {
            'Airline_Name': x.get("airline") or 'Air India',
            'Origin_Airport': x.get("origin_airport") or x.get("origin") or 'MAA',
            'Destination_Airport': x.get("destination_airport") or x.get("destination") or 'DEL',
            'Distance': float(x.get("distance_km") or x.get("distance") or 1760),
            'Passenger_Count': float(x.get("passenger_count") or 180),
            'Ticket_Price': float(x.get("ticket_price") or 5500),
            'Scheduled_Departure_hour': int(x.get("hour_of_day") or 11),
            'Scheduled_Departure_minute': int(x.get("minute_of_hour") or 35),
            'Scheduled_Arrival_hour': int(x.get("arrival_hour") or 14),
            'Scheduled_Arrival_minute': int(x.get("arrival_minute") or 20),
            'month': int(x.get("month") or 10),
            'day_of_week': int(x.get("day_of_week") or 2),
            'day_of_month': int(x.get("day_of_month") or 15),
        }
        df = pd.DataFrame([row])

        predicted_delay = 0.0
        if self.delay_xgb is not None:
            try:
                predicted_delay = max(0.0, float(self.delay_xgb.predict(df)[0]))
            except Exception as e:
                print(f"[ML] Delay predict error: {e}")

        cancellation_prob = 0.0
        if self.cancellation_xgb is not None:
            try:
                cancellation_prob = float(self.cancellation_xgb.predict_proba(df)[0, 1])
            except Exception as e:
                print(f"[ML] Cancellation predict error: {e}")

        canc_risk = "CRITICAL" if cancellation_prob >= 0.8 else "HIGH" if cancellation_prob >= 0.5 else "WATCH" if cancellation_prob >= 0.2 else "SAFE"

        return {
            "predicted_delay_min": round(predicted_delay, 1),
            "cancellation_probability": round(cancellation_prob, 4),
            "cancellation_risk": canc_risk,
            "models_used": {
                "delay": "aeronex_delay_xgb.joblib",
                "cancellation": "aeronex_cancellation_xgb.joblib",
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # ------------------------------------------------------------------ connection predict
    def _estimate_arrival_delay(self, x, dq):
        if x.get("arrival_delay_min") is not None:
            dq["arrival_delay_source"] = "provided"
            return float(x["arrival_delay_min"])

        if self.delay_xgb is not None and (x.get("origin_airport") or x.get("airline")):
            try:
                op = self.predict_operational(x)
                dq["arrival_delay_source"] = "aeronex_delay_xgb_estimate"
                return op["predicted_delay_min"]
            except Exception:
                pass

        dq["arrival_delay_source"] = "assumed_zero (no delay provided)"
        return 0.0

    def predict(self, x: dict) -> dict:
        if self.conn is None:
            raise ModelNotTrained(NOT_TRAINED)
        dq = {"provided": [], "from_airport_profile_estimated": [], "unknown_imputed_by_model": []}
        airport = x.get("connection_airport")
        prof = profile_for(self.profiles, airport) if airport else profile_for(self.profiles, "DEFAULT")
        row = {}
        row["arrival_delay_min"] = self._estimate_arrival_delay(x, dq)
        for k in ("connection_time_min", "gate_walk_min", "security_time_min", "immigration_time_min", "boarding_cutoff_min",
                  "gate_change", "terminal_change", "weather_risk", "airport_congestion", "hour_of_day", "day_of_week", "is_weekend", "is_peak_hour"):
            row[k] = x.get(k)
        row["deplaning_min"] = x.get("deplaning_min")
        for k, pk in (("gate_walk_min", "gate_walk_min"), ("security_time_min", "security_time_min"),
                      ("immigration_time_min", "immigration_time_min"), ("boarding_cutoff_min", "boarding_cutoff_min"),
                      ("deplaning_min", "deplaning_min")):
            if row[k] is None:
                row[k] = prof[pk]
                dq["from_airport_profile_estimated"].append(k)
        if row["connection_time_min"] is None:
            raise ValueError("connection_time_min is required")
        if row["hour_of_day"] is not None:
            h = int(row["hour_of_day"])
            row["is_peak_hour"] = row["is_peak_hour"] if row["is_peak_hour"] is not None else float(h in self.s["common"]["peak_hours"])
        if row["day_of_week"] is not None and row["is_weekend"] is None:
            row["is_weekend"] = float(int(row["day_of_week"]) >= 5)
        row["available_time_min"] = row["connection_time_min"] - max(0.0, row["arrival_delay_min"])
        row["required_time_min"] = row["deplaning_min"] + row["immigration_time_min"] + row["security_time_min"] + row["gate_walk_min"] + row["boarding_cutoff_min"]
        row["connection_buffer_min"] = row["available_time_min"] - row["required_time_min"]
        feats = self.conn["features"]
        frame = pd.DataFrame([{f: (np.nan if row.get(f) is None else row.get(f)) for f in feats}])
        dq["provided"] = [k for k in x if x[k] is not None]
        dq["unknown_imputed_by_model"] = [f for f in feats if row.get(f) is None]
        p = float(self.conn["model"].predict_proba(frame)[:, 1][0])
        imp = [d for d in (self.meta.get("feature_importance") or []) if d["importance"] > 0][:5]
        dq["label_status"] = self.meta.get("label_status")
        dq["calibrated"] = bool((self.meta.get("calibration") or {}).get("applied"))

        # Also obtain operational XGBoost estimate if flight route info was given
        operational = None
        if self.delay_xgb is not None and (x.get("origin_airport") or x.get("airline")):
            try:
                operational = self.predict_operational(x)
            except Exception:
                operational = None

        return {
            "probability": round(p, 4),
            "risk": risk_from_probability(p, self.s["risk_bands"]),
            "model_version": self.meta["model_version"],
            "top_factors": [d["feature"] for d in imp[:3]],
            "top_factors_detail": {"method": "global permutation importance (not specific to this prediction)", "values": imp[:5]},
            "available_time_min": round(row["available_time_min"], 1),
            "required_time_min": round(row["required_time_min"], 1),
            "connection_buffer_min": round(row["connection_buffer_min"], 1),
            "probability_note": PROB_NOTE,
            "data_quality": dq,
            "operational_ml": operational,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def predict_batch(self, items):
        out = []
        for i, it in enumerate(items):
            try:
                out.append({"index": i, **self.predict(it)})
            except ValueError as e:
                out.append({"index": i, "error": str(e)})
        return out
