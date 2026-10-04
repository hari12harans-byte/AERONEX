"""Hugging Face ingestion. Imports are lazy so the rest of the pipeline runs without `datasets`."""
from __future__ import annotations


class DataSourceUnavailable(RuntimeError):
    """Raised when a provider cannot be reached or is not configured. Message starts with the required label."""

    def __init__(self, why):
        super().__init__(f"DATA SOURCE UNAVAILABLE: {why}")


_FORMATS = {"csv": "csv", "json": "json", "jsonl": "json", "parquet": "parquet", "arrow": "arrow"}


def is_configured(dataset_id):
    return bool(dataset_id) and str(dataset_id).strip().upper() != "CONFIGURE_ME"


def load_hf_dataframe(dataset_id, split="train", config_name=None, revision=None, data_files=None, fmt=None):
    """Return (DataFrame, provenance dict). Supports hub datasets and CSV/JSON/Parquet/Arrow files."""
    if not is_configured(dataset_id):
        raise DataSourceUnavailable("dataset_id is CONFIGURE_ME")
    try:
        from datasets import load_dataset
    except ImportError as e:  # pragma: no cover
        raise DataSourceUnavailable("the 'datasets' package is not installed (pip install datasets)") from e
    try:
        kwargs = {"split": split}
        if revision:
            kwargs["revision"] = revision
        if data_files:
            builder = _FORMATS.get(str(fmt or "").lower())
            if not builder:
                raise ValueError("format must be one of csv/json/parquet/arrow when data_files is set")
            ds = load_dataset(dataset_id, data_files=data_files, **kwargs)
        elif config_name:
            ds = load_dataset(dataset_id, config_name, **kwargs)
        else:
            ds = load_dataset(dataset_id, **kwargs)
        df = ds.to_pandas()
    except Exception as e:
        raise DataSourceUnavailable(f"could not load '{dataset_id}': {e}") from e
    return df, hub_provenance(dataset_id, revision)


def hub_provenance(dataset_id, revision=None):
    """Best-effort license/sha lookup. Anything unavailable stays 'UNKNOWN'."""
    prov = {"dataset_id": dataset_id, "source_url": f"https://huggingface.co/datasets/{dataset_id}",
            "license": "UNKNOWN", "dataset_version": revision or "UNKNOWN", "description": "UNKNOWN"}
    try:
        from huggingface_hub import HfApi
        info = HfApi().dataset_info(dataset_id, revision=revision)
        prov["dataset_version"] = info.sha or prov["dataset_version"]
        cd = getattr(info, "card_data", None)
        lic = getattr(cd, "license", None) if cd is not None else None
        if lic:
            prov["license"] = ", ".join(lic) if isinstance(lic, list) else str(lic)
        prov["description"] = (getattr(info, "description", None) or "UNKNOWN")[:500]
    except Exception:
        pass
    return prov
