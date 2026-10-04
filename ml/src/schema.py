"""Canonical AeroNex schema (documented in docs/CANONICAL_SCHEMA.md) and column alias maps.

The alias lists are BEST-EFFORT GUESSES at common column names. They have not been checked
against any specific Indian dataset. Adapters report which canonical columns could not be mapped.
"""
import re

CANONICAL_COLUMNS = [
    "flight_id", "airline", "flight_number",
    "origin_airport", "connection_airport", "destination_airport",
    "scheduled_departure", "scheduled_arrival", "actual_departure", "actual_arrival",
    "departure_delay_min", "arrival_delay_min", "flight_distance_km",
    "cancelled", "diverted",
    "connection_time_min", "gate_walk_min", "security_time_min", "immigration_time_min", "boarding_cutoff_min",
    "gate_change", "terminal_change", "weather_risk", "airport_congestion",
    "hour_of_day", "day_of_week", "is_weekend", "is_peak_hour",
    "available_time_min", "required_time_min", "connection_buffer_min",
    "missed_connection",
]
# Extra flight-level columns the pipeline keeps when present.
EXTRA_COLUMNS = ["origin_terminal", "destination_terminal", "flight_date", "scheduled_duration_min"]

DATETIME_COLUMNS = ["scheduled_departure", "scheduled_arrival", "actual_departure", "actual_arrival"]
NUMERIC_COLUMNS = ["departure_delay_min", "arrival_delay_min", "flight_distance_km", "scheduled_duration_min"]
BOOL_COLUMNS = ["cancelled", "diverted"]


def norm(s):
    return re.sub(r"[^a-z0-9]+", "_", str(s).strip().lower()).strip("_")


ALIASES = {
    "flight_id": ["flight_id", "id", "flightid"],
    "airline": ["airline", "carrier", "airline_name", "airline_code", "operator"],
    "flight_number": ["flight_number", "flightnumber", "flight_no", "flight_num", "flight", "flight_code"],
    "origin_airport": ["origin_airport", "origin", "from", "source", "source_airport", "dep_airport",
                       "departure_airport", "origin_iata", "source_city", "from_city"],
    "destination_airport": ["destination_airport", "destination", "to", "dest", "arr_airport",
                            "arrival_airport", "destination_iata", "destination_city", "to_city"],
    "scheduled_departure": ["scheduled_departure", "scheduleddeparturetime", "scheduled_departure_time",
                            "sched_dep", "std", "departure_time", "dep_time_scheduled"],
    "scheduled_arrival": ["scheduled_arrival", "scheduledarrivaltime", "scheduled_arrival_time",
                          "sched_arr", "sta", "arrival_time", "arr_time_scheduled"],
    "actual_departure": ["actual_departure", "actualdeparturetime", "atd", "actual_departure_time"],
    "actual_arrival": ["actual_arrival", "actualarrivaltime", "ata", "actual_arrival_time"],
    "departure_delay_min": ["departure_delay_min", "departure_delay", "dep_delay", "depdelay",
                            "departure_delay_minutes"],
    "arrival_delay_min": ["arrival_delay_min", "arrival_delay", "arr_delay", "arrdelay", "delay_minutes",
                          "delay", "arrival_delay_minutes"],
    "flight_distance_km": ["flight_distance_km", "distance_km", "distance"],
    "cancelled": ["cancelled", "canceled", "is_cancelled"],
    "diverted": ["diverted", "is_diverted"],
    "flight_date": ["flight_date", "date", "date_of_journey", "dep_date", "fl_date"],
    "origin_terminal": ["origin_terminal", "dep_terminal", "departure_terminal"],
    "destination_terminal": ["destination_terminal", "arr_terminal", "arrival_terminal"],
    "scheduled_duration_min": ["scheduled_duration_min", "duration_min", "scheduled_duration"],
}

# Normalisation helpers (name -> IATA). Only normalisation; not a statement about any dataset.
CITY_TO_IATA = {
    "delhi": "DEL", "new delhi": "DEL", "mumbai": "BOM", "bombay": "BOM", "bengaluru": "BLR", "bangalore": "BLR",
    "chennai": "MAA", "madras": "MAA", "hyderabad": "HYD", "kolkata": "CCU", "calcutta": "CCU",
    "kochi": "COK", "cochin": "COK", "pune": "PNQ", "ahmedabad": "AMD", "goa": "GOI",
    "jaipur": "JAI", "lucknow": "LKO", "thiruvananthapuram": "TRV", "trivandrum": "TRV",
    "madurai": "IXM", "bhubaneswar": "BBI", "guwahati": "GAU", "patna": "PAT", "nagpur": "NAG",
    "varanasi": "VNS",
}
AIRLINE_TO_CODE = {
    "indigo": "6E", "interglobe aviation": "6E", "air india": "AI", "air india express": "IX",
    "airasia india": "I5", "air asia": "I5", "spicejet": "SG", "spice jet": "SG", "akasa air": "QP", "akasa": "QP",
    "vistara": "UK", "go first": "G8", "goair": "G8", "go air": "G8", "alliance air": "9I",
    "star air": "S5", "fly91": "IC", "flybig": "S9",
}

# Added for AeroNex_Indian_Combined.csv (city / airport names -> IATA). Normalisation only.
# "mihan" is the Nagpur airport site, so it is mapped to NAG (assumption, noted in DATASET_SELECTION_REPORT).
CITY_TO_IATA.update({
    "adampur": "AIP", "agartala": "IXA", "agatti": "AGX", "agra": "AGR", "aizwal": "AJL", "allahabad": "IXD",
    "amritsar": "ATQ", "aurangabad": "IXU", "bagdogra": "IXB", "bathinda": "BUP", "belgaum": "IXG",
    "bhavnagar": "BHU", "bhopal": "BHO", "bhuj": "BHJ", "bidar": "IXX", "bikaner": "BKB", "bilaspur": "PAB",
    "calicut": "CCJ", "chandigarh": "IXC", "coimbatore": "CJB", "cooch-behar": "COH", "darbhanga": "DBR",
    "dehradun": "DED", "dibrugarh": "DIB", "dimapur": "DMU", "diu": "DIU", "gaya": "GAY", "gorakhpur": "GOP",
    "gwalior": "GWL", "hubli": "HBX", "imphal": "IMF", "indore": "IDR", "jabalpur": "JLR", "jaisalmer": "JSA",
    "jalgaon": "JLG", "jammu": "IXJ", "jamnagar": "JGA", "jharsuguda": "JRG", "jodhpur": "JDH", "jorhat": "JRH",
    "kadapa": "CDP", "kalaburgi (gulbarga)": "GBI", "kandla": "IXY", "kangra": "DHM", "kannur": "CNN",
    "kannur international airport": "CNN", "kanpur": "KNU", "keshod": "IXK", "khajuraho": "HJR",
    "kishangarh": "KQH", "kolhapur": "KLH", "kullu": "KUU", "kushinagar": "KBK", "leh": "IXL", "lilabari": "IXI",
    "ludhiana": "LUH", "mihan": "NAG", "mangalore": "IXE", "mysore": "MYQ", "nanded": "NDC", "nasik": "ISK",
    "pakyong": "PYG", "pantnagar": "PGH", "passighat": "IXT", "pathankot": "IXP", "pithoragarh": "NMN",
    "pondicherry": "PNY", "port blair": "IXZ", "raipur": "RPR", "rajahmundry": "RJA", "rajkot": "RAJ",
    "ranchi": "IXR", "rupsi": "RUP", "salem": "SXV", "shillong": "SHL", "shimla": "SLV", "shirdi": "SAG",
    "shirdi airport": "SAG", "silchar": "IXS", "srinagar": "SXR", "surat": "STV", "tezpur": "TEZ", "tezu": "TEI",
    "tiruchirappalli": "TRZ", "tirupati": "TIR", "tuticorin": "TCR", "udaipur": "UDR", "vadodara": "BDQ",
    "vidyanagar": "VDY", "vijayawada": "VGA", "visakhapatnam": "VTZ",
})
AIRLINE_TO_CODE.update({"alliance air (india)": "9I", "jet airways": "9W", "air india express": "IX"})
