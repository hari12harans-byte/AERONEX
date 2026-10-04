# Data provenance

- `Airlines_Dataset.csv`: supplied by project owner; used for delay/cancellation model training.
- `india_flight_delays_2025.csv`: supplied Indian reference/validation dataset.
- `AeroNex_Indian_Combined.csv`: supplied combined Indian schedule dataset.
- `OurAirports_India_IN.csv`: supplied airport/geospatial reference.
- `AeroNex_Routes.csv.csv`: supplied route reference.
- `AeroNex_Runways_Raw.csv.csv`: supplied runway reference.
- `mtc value.json`: supplied detailed MAA MCT data.
- Selected additional MCT seed values were verified against MinimumConnectionTime.com public pages on 2026-10-04.

MCT values should be treated as planning data, not an airline guarantee. Passenger-level connection outcomes were not present in the supplied data, so the connection model uses a clearly labelled synthetic operational-feasibility proxy rather than pretending it is trained on real passenger outcomes.
