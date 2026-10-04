"""List CANDIDATE Hugging Face datasets for Indian aviation (needs internet). Selecting one is a human step.
Usage (from ml/):  python scripts/discover_hf.py [extra search terms...]
Writes ml/data/reports/hf_candidates.json. Nothing here is evaluated or endorsed; review each card by hand and
record the outcome in docs/DATASET_SELECTION_REPORT.md.
"""
import json
import sys
from pathlib import Path

TERMS = ["india flight", "indian airline", "india aviation", "DGCA", "indian domestic flights", "airsewa", "india flight delay"]


def main():
    try:
        from huggingface_hub import HfApi
    except ImportError:
        print("DATA SOURCE UNAVAILABLE: pip install huggingface_hub"); return 2
    api, seen = HfApi(), {}
    for term in TERMS + sys.argv[1:]:
        try:
            for d in api.list_datasets(search=term, limit=25, full=True):
                cd = getattr(d, "card_data", None)
                seen[d.id] = {"id": d.id, "url": f"https://huggingface.co/datasets/{d.id}", "last_modified": str(d.last_modified),
                              "downloads": d.downloads, "license": getattr(cd, "license", None) if cd else None,
                              "tags": list(d.tags or [])[:15], "matched_term": term}
        except Exception as e:
            print(f"DATA SOURCE UNAVAILABLE: search '{term}' failed: {e}"); return 2
    out = Path(__file__).resolve().parents[1] / "data" / "reports" / "hf_candidates.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(sorted(seen.values(), key=lambda x: -(x["downloads"] or 0)), indent=2), encoding="utf-8")
    print(f"{len(seen)} candidates -> {out}")


if __name__ == "__main__":
    sys.exit(main())
