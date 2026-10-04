import os
from pathlib import Path
import yaml

# AERONEX_ML_ROOT lets tests run against a scratch copy; default is the ml/ folder.
ROOT = Path(os.environ.get("AERONEX_ML_ROOT") or Path(__file__).resolve().parents[1])
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
FEATURES = ROOT / "data" / "features"
REPORTS = ROOT / "data" / "reports"
REFERENCE = ROOT / "data" / "reference"
METADATA = ROOT / "data" / "metadata"
MODELS = ROOT / "models"
CONFIG = ROOT / "config"


def load_yaml(name):
    with open(CONFIG / name, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def settings():
    return load_yaml("settings.yaml")


def resolve_path(p):
    """Config paths are written relative to the repo root (e.g. ml/data/raw/x.csv)."""
    p = Path(p)
    if p.is_absolute():
        return p
    repo_root = ROOT.parent
    cand = repo_root / p
    return cand if cand.exists() or str(p).startswith("ml") else ROOT / p
