"""Dataset provenance registry -> ml/data/metadata/dataset_registry.json"""
import json
from datetime import datetime, timezone
from .paths import METADATA

REGISTRY = METADATA / "dataset_registry.json"
REQUIRED = ["name", "source_name", "source_url", "dataset_id", "license", "retrieved_at",
            "dataset_version", "record_count", "description", "limitations"]


def load():
    if REGISTRY.exists():
        return json.loads(REGISTRY.read_text(encoding="utf-8"))
    return {"datasets": []}


def upsert(entry):
    """Insert/replace by `name`. Missing provenance fields are written as 'UNKNOWN' (never invented)."""
    reg = load()
    e = {k: entry.get(k, "UNKNOWN") for k in REQUIRED}
    e["retrieved_at"] = entry.get("retrieved_at") or datetime.now(timezone.utc).isoformat()
    e.update({k: v for k, v in entry.items() if k not in e})
    reg["datasets"] = [d for d in reg["datasets"] if d.get("name") != e["name"]] + [e]
    METADATA.mkdir(parents=True, exist_ok=True)
    REGISTRY.write_text(json.dumps(reg, indent=2, default=str), encoding="utf-8")
    return e
