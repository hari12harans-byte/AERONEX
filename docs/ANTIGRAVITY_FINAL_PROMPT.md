Use the existing AeroNex project as the baseline. Do not rebuild from scratch. Preserve React/Vite, Express, Python/FastAPI ML, Leaflet/OpenStreetMap, airplanes.live, AviationStack and Open-Meteo integrations.

1. Run a full source audit before editing.
2. Verify `/api/health`, `/api/system/status`, `/api/flights/search`, `/api/live/aircraft`, `/api/ml/status`.
3. Keep live aircraft on the map when ADS-B fails; use LIVE, LAST_KNOWN and OFFLINE states with cache timestamps.
4. Keep AviationStack backend-only; never expose the API key to React.
5. Treat the Scenario Lab as controlled test data, never as live airline data.
6. Do not claim current ML accuracy as real-world accuracy. The shipped model is a derived feasibility baseline.
7. The final training pipeline must use Indian flight-level observed delays when available, with DGCA OTP used for aggregate calibration/external validation.
8. Test all provider failure cases and report exact results.
9. Do not invent live flight, baggage or passenger data.
10. Keep user-facing language professional: LIVE, REFERENCE, ESTIMATED, SCENARIO. Avoid developer-facing DEMO DATA wording on primary screens.
