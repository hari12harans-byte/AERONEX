from pathlib import Path
import pandas as pd
from .base_adapter import BaseAdapter


class JsonAdapter(BaseAdapter):
    name = "json"

    def load_raw(self):
        p = Path(self.cfg["path"])
        if not p.exists():
            raise FileNotFoundError(f"DATA SOURCE UNAVAILABLE: {p} not found")
        df = pd.read_json(p, lines=p.suffix.lower() == ".jsonl")
        return df, {"source_file": p.name}
