"""Connection labels. NONE of these is observed passenger ground truth.

derived_deterministic   -> DERIVED PROTOTYPE LABEL: missed = (connection_buffer_min < 0)
experimental_stochastic -> SYNTHETIC / EXPERIMENTAL: transfer requirement is multiplied by a seeded
                           log-normal factor; missed = (realised_required > available).
"""
import numpy as np
import pandas as pd

LABEL_NOTES = {
    "derived_deterministic": ("DERIVED PROTOTYPE LABEL: generated from connection feasibility "
                              "(buffer < 0), not confirmed passenger-level ground truth."),
    "experimental_stochastic": ("SYNTHETIC / EXPERIMENTAL LABEL: feasibility with seeded random variation in "
                                "transfer time. Not observed and not real-world ground truth."),
}


def add_connection_math(df: pd.DataFrame) -> pd.DataFrame:
    """available = scheduled connection − arrival delay (delay clipped at 0: early arrival gives no extra time).
    required  = deplaning + immigration + security + gate walk + boarding cutoff. buffer = available − required."""
    df["available_time_min"] = df["connection_time_min"] - df["arrival_delay_min"].clip(lower=0)
    df["required_time_min"] = (df["deplaning_min"] + df["immigration_time_min"] + df["security_time_min"]
                               + df["gate_walk_min"] + df["boarding_cutoff_min"])
    df["connection_buffer_min"] = df["available_time_min"] - df["required_time_min"]
    return df


def add_label(df: pd.DataFrame, mode: str = "derived_deterministic", sigma: float = 0.25, seed: int = 42) -> pd.DataFrame:
    if mode == "derived_deterministic":
        df["derived_connection_outcome"] = (df["connection_buffer_min"] < 0).astype(int)
    elif mode == "experimental_stochastic":
        rng = np.random.default_rng(seed)
        realised = df["required_time_min"] * rng.lognormal(0.0, sigma, len(df))
        df["derived_connection_outcome"] = (realised > df["available_time_min"]).astype(int)
    else:
        raise ValueError(f"unknown label_mode {mode}")
    df["missed_connection"] = df["derived_connection_outcome"]
    df["label_type"] = mode
    df["label_note"] = LABEL_NOTES[mode]
    return df
