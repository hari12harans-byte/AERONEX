from pathlib import Path
import pandas as pd
from .base_adapter import BaseAdapter


class XlsxAdapter(BaseAdapter):
    name = "xlsx"

    def load_raw(self):
        p = Path(self.cfg["path"])
        if not p.exists():
            raise FileNotFoundError(f"DATA SOURCE UNAVAILABLE: {p} not found")
        return pd.read_excel(p, sheet_name=self.cfg.get("sheet", 0)), {"source_file": p.name}
