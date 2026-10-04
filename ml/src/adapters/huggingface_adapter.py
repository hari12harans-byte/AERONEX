from .base_adapter import BaseAdapter
from ..huggingface_loader import load_hf_dataframe


class HuggingFaceAdapter(BaseAdapter):
    name = "huggingface"

    def load_raw(self):
        c = self.cfg
        return load_hf_dataframe(c.get("dataset_id"), c.get("split", "train"), c.get("config_name"),
                                 c.get("revision"), c.get("data_files"), c.get("format"))
