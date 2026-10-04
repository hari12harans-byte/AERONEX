"""Schedule-only sources: flights with scheduled times but (usually) no observed actual times.

Works on top of any loader (local file or Hugging Face): set `source` in config. Rows from a
schedule-only source have NO observed delay; they can feed congestion features and connection
pairing, but cannot be labelled or used to train the delay model.
"""
from pathlib import Path
import pandas as pd
from .base_adapter import BaseAdapter
from ..huggingface_loader import load_hf_dataframe


class ScheduleAdapter(BaseAdapter):
    name = "schedule"

    def load_raw(self):
        c = self.cfg
        if c.get("source") == "huggingface":
            return load_hf_dataframe(c.get("dataset_id"), c.get("split", "train"), c.get("config_name"),
                                     c.get("revision"), c.get("data_files"), c.get("format"))
        p = Path(c["path"])
        if not p.exists():
            raise FileNotFoundError(f"DATA SOURCE UNAVAILABLE: {p} not found")
        read = pd.read_excel if p.suffix.lower() in {".xlsx", ".xls"} else (pd.read_parquet if p.suffix == ".parquet" else pd.read_csv)
        return read(p), {"source_file": p.name}

    def normalize(self, raw):
        res = super().normalize(raw)
        if res.df["arrival_delay_min"].isna().all():
            res.notes.append("schedule-only: no observed arrival delay in this source")
        return res
