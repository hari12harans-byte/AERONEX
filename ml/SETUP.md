# AeroNex ML setup
All commands run from `ml/`.

## 1. Install
```
python -m venv .venv && source .venv/bin/activate      # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```
## 2. Choose data (needs internet for Hugging Face)
```
python scripts/discover_hf.py          # candidate list only; review cards by hand
```
Edit `config/datasets.yaml` (dataset IDs / local paths + provenance) and record your choice in `../docs/DATASET_SELECTION_REPORT.md`.
You need flight-level rows with **scheduled times and observed arrival delay**. Check the adapter's reported `unmapped_canonical`
in `data/metadata/dataset_registry.json`; extend the alias lists in `src/schema.py` if your columns differ.
## 3. Build features
```
python -m src.pipeline      # → data/processed/*, data/features/*, data/reports/{cleaning,validation,build}_report.json
```
## 4. Train (prints MODEL NOT TRAINED and exits 2 if data is missing/unusable)
```
python -m src.train                      # both stages;  --stage delay|connection  --search (small RandomizedSearchCV)
```
Outputs: `models/aeronex_connection_model.joblib` + `model_metadata.json`, `models/aeronex_delay_model.joblib` + regressor +
`delay_model_metadata.json`, `data/reports/model_comparison.csv`. Read the `warnings` in the metadata before trusting any metric.
## 5. Serve
```
uvicorn src.api:app --host 127.0.0.1 --port 5000
```
## 6. Run AeroNex
```
cd ../backend && npm install && ML_API_URL=http://127.0.0.1:5000 npm start
```
Without a trained model or running service, AeroNex shows the rule-based Connection Guardian plus "AI ESTIMATE UNAVAILABLE".
Backend tests: `cd backend && npm test`.
