# AeroNex ML Training Report

Models in `models/` were retrained from `data/training/AeroNex_Training_Dataset.csv`.

- Delay: XGBRegressor, target `arrival_delay`.
- Cancellation: XGBClassifier, target `cancelled`.
- Connection: XGBClassifier, target `connection_feasible_proxy`.

The supplied dataset has 190 rows and only 5 cancellation positives. Cancellation metrics are therefore low-confidence and must not be presented as production accuracy.

The connection target is an operational feasibility proxy created from connection constraints. It is not a real passenger caught/missed outcome label.

The evaluation uses a chronological 80/20 split by `flight_date`, not a random split.
