# Canonical AeroNex schema
Defined in `ml/src/schema.py`. Adapters map raw columns via alias lists (best-effort guesses, unverified against any
specific dataset); canonical columns a source lacks stay `NaN` and are reported — never filled with random values.

| Group | Columns |
|---|---|
| Identity | flight_id, airline (IATA code), flight_number |
| Route | origin_airport, connection_airport, destination_airport (IATA) |
| Times | scheduled_departure, scheduled_arrival, actual_departure, actual_arrival |
| Delays | departure_delay_min, arrival_delay_min (observed, minutes) |
| Flight | flight_distance_km, cancelled, diverted |
| Connection inputs | connection_time_min, gate_walk_min, security_time_min, immigration_time_min, boarding_cutoff_min (+ deplaning_min) |
| Changes | gate_change, terminal_change |
| Context | weather_risk, airport_congestion |
| Time features | hour_of_day, day_of_week (Mon=0), is_weekend, is_peak_hour |
| Connection maths | available_time_min = connection_time_min − max(0, arrival_delay_min); required_time_min = deplaning + immigration + security + gate walk + boarding cutoff; connection_buffer_min = available − required |
| Label | missed_connection (+ label_type, label_note) — DERIVED PROTOTYPE LABEL unless stated otherwise |

## Where each connection-scenario value comes from
| Value | Source in training data |
|---|---|
| connection_time_min | REAL scheduled gap between two real schedule rows (same airline, airport, day) |
| arrival_delay_min | OBSERVED delay of the incoming flight (rows without it are excluded and counted) |
| deplaning/security/immigration/gate_walk/boarding_cutoff | `ml/data/reference/airport_profiles.csv` — **estimated**, not official |
| airport_congestion | Schedule density proxy (movements in that airport-hour ÷ airport's P95), only as dense as the supplied schedule |
| gate_change, terminal_change, weather_risk | **Unknown → NaN** unless the source has them (terminal_change needs terminal columns). Not randomised. |
| missed_connection | Derived from the maths above (see MODEL_CARD) |
