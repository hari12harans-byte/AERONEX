// AeroNex Airport Resolver & Geospatial Database
// Resolves airport names, cities, IATA codes, ICAO codes, and historical aliases.

export const AIRPORTS = {
  MAA: {
    iata: 'MAA',
    icao: 'VOMM',
    name: 'Chennai International Airport',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'IN',
    lat: 12.9941,
    lon: 80.1709,
    elevationFt: 52,
    aliases: ['madras', 'chennai', 'meenambakkam', 'tirusulam', 'vomm', 'maa'],
    runways: [
      { id: '07/25', lengthM: 3658, widthM: 45, heading: 70, coords: [[12.9880, 80.1550], [13.0010, 80.1880]] },
      { id: '12/30', lengthM: 2045, widthM: 45, heading: 120, coords: [[13.0015, 80.1650], [12.9920, 80.1820]] },
    ],
    terminals: [
      { id: 'T1', name: 'Terminal 1 (Domestic / Kamaraj)', gates: ['A01','A02','A03','A04','A05','A06','A07','A08','A09','A10','A11','A12'] },
      { id: 'T2', name: 'Terminal 2 (NITB Phase 1)', gates: ['A13','A14','A15','A16','A17','A18','A19','A20','A21','A22','A23','A24'] },
      { id: 'T3', name: 'Terminal 3 (International / Anna)', gates: ['B01','B02','B03','B04','B05','B06','B07','B08','B09','B10','B11','B12'] },
      { id: 'T4', name: 'Terminal 4 (Domestic NITB Phase 2)', gates: ['C01','C02','C03','C04','C05','C06','C07','C08','C09','C10'] },
    ],
  },
  DEL: {
    iata: 'DEL',
    icao: 'VIDP',
    name: 'Indira Gandhi International Airport',
    city: 'Delhi',
    state: 'Delhi NCR',
    country: 'IN',
    lat: 28.5562,
    lon: 77.1000,
    elevationFt: 777,
    aliases: ['delhi', 'new delhi', 'palam', 'indira gandhi', 'vidp', 'del'],
    runways: [
      { id: '11L/29R', lengthM: 4430, widthM: 60, heading: 110, coords: [[28.568, 77.085], [28.551, 77.127]] },
      { id: '10/28', lengthM: 3810, widthM: 45, heading: 100, coords: [[28.558, 77.088], [28.544, 77.124]] },
      { id: '11R/29L', lengthM: 4400, widthM: 45, heading: 110, coords: [[28.548, 77.090], [28.532, 77.132]] },
    ],
    terminals: [
      { id: 'T1', name: 'Terminal 1 (Domestic Low-Cost)', gates: ['A01','A02','A03','A04','A05','A06','A07','A08'] },
      { id: 'T2', name: 'Terminal 2 (Domestic Secondary)', gates: ['B01','B02','B03','B04','B05','B06'] },
      { id: 'T3', name: 'Terminal 3 (Integrated International & Domestic)', gates: ['A09','A10','A11','A12','A18','A21','B07','B08','B09','B10','B11','B12'] },
    ],
  },
  BOM: {
    iata: 'BOM',
    icao: 'VABB',
    name: 'Chhatrapati Shivaji Maharaj International Airport',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'IN',
    lat: 19.0896,
    lon: 72.8656,
    elevationFt: 39,
    aliases: ['mumbai', 'bombay', 'santa cruz', 'sahar', 'vabb', 'bom'],
    runways: [
      { id: '09/27', lengthM: 3660, widthM: 60, heading: 90, coords: [[19.088, 72.850], [19.088, 72.885]] },
      { id: '14/32', lengthM: 2990, widthM: 45, heading: 140, coords: [[19.098, 72.860], [19.078, 72.875]] },
    ],
    terminals: [
      { id: 'T1', name: 'Terminal 1 (Santa Cruz Domestic)', gates: ['A01','A02','A03','A04','A05','A06'] },
      { id: 'T2', name: 'Terminal 2 (Sahar Integrated)', gates: ['C01','C02','C03','C04','C08','C12','D01','D02'] },
    ],
  },
  BLR: {
    iata: 'BLR',
    icao: 'VOBL',
    name: 'Kempegowda International Airport',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'IN',
    lat: 13.1986,
    lon: 77.7066,
    elevationFt: 3000,
    aliases: ['bengaluru', 'bangalore', 'devanahalli', 'kempegowda', 'vobl', 'blr'],
    runways: [
      { id: '09L/27R', lengthM: 4000, widthM: 45, heading: 90, coords: [[13.203, 77.690], [13.203, 77.728]] },
      { id: '09R/27L', lengthM: 4000, widthM: 45, heading: 90, coords: [[13.190, 77.690], [13.190, 77.728]] },
    ],
    terminals: [
      { id: 'T1', name: 'Terminal 1', gates: ['A01','A02','A03','A04','A05','A06','A07','A08'] },
      { id: 'T2', name: 'Terminal 2 (Garden Terminal)', gates: ['B01','B02','B03','B04','B05','B06','B07','B08','B09'] },
    ],
  },
  HYD: {
    iata: 'HYD',
    icao: 'VOHS',
    name: 'Rajiv Gandhi International Airport',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'IN',
    lat: 17.2403,
    lon: 78.4294,
    elevationFt: 2024,
    aliases: ['hyderabad', 'shamshabad', 'secunderabad', 'vohs', 'hyd'],
    runways: [
      { id: '09L/27R', lengthM: 4260, widthM: 60, heading: 90, coords: [[17.242, 78.410], [17.242, 78.450]] },
    ],
    terminals: [
      { id: 'T1', name: 'Integrated Passenger Terminal', gates: ['A01','A02','A03','A04','B01','B02','B03'] },
    ],
  },
  CCU: {
    iata: 'CCU',
    icao: 'VECC',
    name: 'Netaji Subhas Chandra Bose International Airport',
    city: 'Kolkata',
    state: 'West Bengal',
    country: 'IN',
    lat: 22.6547,
    lon: 88.4467,
    elevationFt: 16,
    aliases: ['kolkata', 'calcutta', 'dum dum', 'netaji subhash', 'vecc', 'ccu'],
    runways: [
      { id: '01R/19L', lengthM: 3627, widthM: 45, heading: 10, coords: [[22.640, 88.444], [22.670, 88.448]] },
    ],
    terminals: [
      { id: 'T2', name: 'Integrated Terminal', gates: ['A01','A02','A03','A04','B01','B02'] },
    ],
  },
  COK: {
    iata: 'COK',
    icao: 'VOCI',
    name: 'Cochin International Airport',
    city: 'Kochi',
    state: 'Kerala',
    country: 'IN',
    lat: 10.1556,
    lon: 76.4019,
    elevationFt: 30,
    aliases: ['kochi', 'cochin', 'nedumbassery', 'ernakulam', 'voci', 'cok'],
    runways: [
      { id: '09/27', lengthM: 3445, widthM: 45, heading: 90, coords: [[10.155, 76.386], [10.155, 76.417]] },
    ],
    terminals: [
      { id: 'T1', name: 'Domestic Terminal', gates: ['A01','A02','A03','A04'] },
      { id: 'T3', name: 'International Terminal', gates: ['B01','B02','B03','B04'] },
    ],
  },
  AMD: {
    iata: 'AMD',
    icao: 'VAAH',
    name: 'Sardar Vallabhbhai Patel International Airport',
    city: 'Ahmedabad',
    state: 'Gujarat',
    country: 'IN',
    lat: 23.0772,
    lon: 72.6347,
    elevationFt: 189,
    aliases: ['ahmedabad', 'ahmedabad airport', 'hansol', 'vaah', 'amd'],
    runways: [
      { id: '05/23', lengthM: 3505, widthM: 45, heading: 50, coords: [[23.067, 72.624], [23.088, 72.645]] },
    ],
    terminals: [
      { id: 'T1', name: 'Domestic Terminal', gates: ['A01','A02','A03'] },
      { id: 'T2', name: 'International Terminal', gates: ['B01','B02','B03'] },
    ],
  },
  PNQ: {
    iata: 'PNQ',
    icao: 'VAPO',
    name: 'Pune International Airport',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'IN',
    lat: 18.5822,
    lon: 73.9197,
    elevationFt: 1942,
    aliases: ['pune', 'poona', 'lohegaon', 'vapo', 'pnq'],
    runways: [
      { id: '10/28', lengthM: 2539, widthM: 45, heading: 100, coords: [[18.583, 73.908], [18.581, 73.931]] },
    ],
    terminals: [
      { id: 'T1', name: 'New Integrated Terminal', gates: ['A01','A02','A03','A04'] },
    ],
  },
  GOI: {
    iata: 'GOI',
    icao: 'VOGO',
    name: 'Dabolim Airport',
    city: 'Goa',
    state: 'Goa',
    country: 'IN',
    lat: 15.3808,
    lon: 73.8314,
    elevationFt: 184,
    aliases: ['goa', 'dabolim', 'panaji', 'vogo', 'goi'],
    runways: [
      { id: '08/26', lengthM: 3458, widthM: 45, heading: 80, coords: [[15.378, 73.816], [15.384, 73.847]] },
    ],
    terminals: [
      { id: 'T1', name: 'Integrated Terminal', gates: ['A01','A02','A03','A04'] },
    ],
  },
  JAI: {
    iata: 'JAI',
    icao: 'VIJP',
    name: 'Jaipur International Airport',
    city: 'Jaipur',
    state: 'Rajasthan',
    country: 'IN',
    lat: 26.8242,
    lon: 75.8122,
    elevationFt: 1263,
    aliases: ['jaipur', 'sanganer', 'vijp', 'jai'],
    runways: [
      { id: '09/27', lengthM: 3505, widthM: 45, heading: 90, coords: [[26.824, 75.795], [26.824, 75.830]] },
    ],
    terminals: [
      { id: 'T2', name: 'Passenger Terminal', gates: ['A01','A02','A03'] },
    ],
  },
  LKO: {
    iata: 'LKO',
    icao: 'VILK',
    name: 'Chaudhary Charan Singh International Airport',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    country: 'IN',
    lat: 26.7606,
    lon: 80.8893,
    elevationFt: 405,
    aliases: ['lucknow', 'amausi', 'vilk', 'lko'],
    runways: [
      { id: '09/27', lengthM: 2744, widthM: 45, heading: 90, coords: [[26.761, 75.876], [26.761, 75.903]] },
    ],
    terminals: [
      { id: 'T3', name: 'Integrated Terminal 3', gates: ['A01','A02','A03','A04'] },
    ],
  },
  DXB: {
    iata: 'DXB',
    icao: 'OMDB',
    name: 'Dubai International Airport',
    city: 'Dubai',
    country: 'AE',
    lat: 25.2532,
    lon: 55.3657,
    aliases: ['dubai', 'dxb', 'omdb'],
  },
  SIN: {
    iata: 'SIN',
    icao: 'WSSS',
    name: 'Singapore Changi Airport',
    city: 'Singapore',
    country: 'SG',
    lat: 1.3644,
    lon: 103.9915,
    aliases: ['singapore', 'changi', 'sin', 'wsss'],
  },
  DOH: {
    iata: 'DOH',
    icao: 'OTHH',
    name: 'Hamad International Airport',
    city: 'Doha',
    country: 'QA',
    lat: 25.2731,
    lon: 51.6081,
    aliases: ['doha', 'hamad', 'doh', 'othh'],
  },
};

/**
 * Haversine formula to compute great-circle distance between two coordinates in km.
 */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Resolve an input query string into a matched Airport object.
 * Supports:
 * - Exact IATA (e.g. 'MAA')
 * - Exact ICAO (e.g. 'VOMM')
 * - City name (e.g. 'Chennai', 'Madras', 'Bangalore', 'Bombay')
 * - Airport name substring (e.g. 'Kempegowda', 'Indira Gandhi', 'Chhatrapati')
 * - Aliases (e.g. 'tirusulam', 'palam', 'meenambakkam')
 */
export function resolveAirport(query) {
  if (!query || typeof query !== 'string') return null;
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const upper = q.toUpperCase();

  // 1. Direct IATA match
  if (AIRPORTS[upper]) return AIRPORTS[upper];

  // 2. Direct ICAO match
  for (const ap of Object.values(AIRPORTS)) {
    if (ap.icao && ap.icao.toUpperCase() === upper) return ap;
  }

  // 3. Exact alias match
  for (const ap of Object.values(AIRPORTS)) {
    if (ap.aliases && ap.aliases.includes(q)) return ap;
  }

  // 4. Exact city match
  for (const ap of Object.values(AIRPORTS)) {
    if (ap.city && ap.city.toLowerCase() === q) return ap;
  }

  // 5. Fuzzy / Substring match in name or aliases
  for (const ap of Object.values(AIRPORTS)) {
    if (ap.name && ap.name.toLowerCase().includes(q)) return ap;
    if (ap.city && ap.city.toLowerCase().includes(q)) return ap;
    if (ap.aliases && ap.aliases.some((a) => a.includes(q) || q.includes(a))) return ap;
  }

  return null;
}

/**
 * Find the nearest airport from user coordinates (lat, lon).
 */
export function findNearestAirport(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number' || Number.isNaN(lat) || Number.isNaN(lon)) {
    return null;
  }
  let best = null;
  let minDistance = Infinity;

  for (const ap of Object.values(AIRPORTS)) {
    const d = haversineKm(lat, lon, ap.lat, ap.lon);
    if (d < minDistance) {
      minDistance = d;
      best = { ...ap, distanceKm: d };
    }
  }

  return best;
}
