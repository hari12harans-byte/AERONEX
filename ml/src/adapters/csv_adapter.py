from pathlib import Path
import pandas as pd
from .base_adapter import BaseAdapter


class CsvAdapter(BaseAdapter):
    name = "csv"

    def load_raw(self):
        p = Path(self.cfg["path"])
        if not p.exists():
            raise FileNotFoundError(f"DATA SOURCE UNAVAILABLE: {p} not found")
        df = pd.read_csv(p, low_memory=False, sep=None, engine="python") if self.cfg.get("sniff") else pd.read_csv(p, low_memory=False)
        return df, {"source_file": p.name}
