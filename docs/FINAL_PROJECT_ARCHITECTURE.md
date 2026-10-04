# AeroNex — Final Project

## Purpose
AeroNex is a passenger connection-intelligence platform. It combines live flight information, ADS-B airspace, weather, airport transfer estimates and predictive connection risk into one workflow.

## Production-style architecture

React/Vite + Leaflet/OpenStreetMap
→ Express API
→ provider adapters + cache
→ AviationStack / airplanes.live / Open-Meteo
→ Python FastAPI ML service
→ Delay Prediction → Connection Risk → Connection Guardian

## Data states
- LIVE: provider-backed current information.
- REFERENCE: airport/schedule information used when a provider does not supply a field.
- ESTIMATED: calculated walking/processing/arrival-risk information.
- SCENARIO: controlled testing in the Scenario Lab; never presented as a live airline event.

## ML architecture
1. Indian flight-level observed delays are the intended primary training source.
2. The delay model estimates arrival delay.
3. The connection model estimates missed-connection risk using the predicted delay plus transfer constraints.
4. The deterministic Connection Guardian remains as an explainable safety baseline.
5. DGCA aggregate OTP statistics are used for calibration/external validation, not fabricated flight-level labels.

## Current model limitation
The shipped connection model is a feasibility baseline based on derived labels. It must not be presented as measured passenger-outcome accuracy until genuine observed flight-level labels are available.

## Live Airspace resilience
The backend keeps a short fresh cache and a stale cache. If the ADS-B provider fails, the UI remains on the map and labels cached aircraft as LAST KNOWN. No stale aircraft are presented as LIVE.

## Secrets
Keep `AVIATIONSTACK_API_KEY` only in the backend environment. Rotate any key that has been exposed in chat, screenshots or source control.
