from .base_adapter import BaseAdapter, AdapterResult
from .csv_adapter import CsvAdapter
from .xlsx_adapter import XlsxAdapter
from .json_adapter import JsonAdapter
from .huggingface_adapter import HuggingFaceAdapter
from .schedule_adapter import ScheduleAdapter
from .dgca_adapter import DgcaAdapter
from .indian_schedule_adapter import IndianScheduleCsvAdapter

ADAPTERS = {"csv": CsvAdapter, "xlsx": XlsxAdapter, "json": JsonAdapter, "huggingface": HuggingFaceAdapter,
            "schedule": ScheduleAdapter, "dgca": DgcaAdapter,
            "indian_schedule_csv": IndianScheduleCsvAdapter}
