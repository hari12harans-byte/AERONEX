// Reference airport, airline and terminal data used when live providers do not supply a field.

export const AIRPORTS = {
  MAA: { iata: 'MAA', name: 'Chennai International Airport', city: 'Chennai', country: 'IN', lat: 12.9941, lon: 80.1709 },
  DEL: { iata: 'DEL', name: 'Indira Gandhi International Airport', city: 'Delhi', country: 'IN', lat: 28.5562, lon: 77.1 },
  BOM: { iata: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', country: 'IN', lat: 19.0896, lon: 72.8656 },
  BLR: { iata: 'BLR', name: 'Kempegowda International Airport', city: 'Bengaluru', country: 'IN', lat: 13.1986, lon: 77.7066 },
  HYD: { iata: 'HYD', name: 'Rajiv Gandhi International Airport', city: 'Hyderabad', country: 'IN', lat: 17.2403, lon: 78.4294 },
  CCU: { iata: 'CCU', name: 'Netaji Subhas Chandra Bose International Airport', city: 'Kolkata', country: 'IN', lat: 22.6547, lon: 88.4467 },
  DXB: { iata: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'AE', lat: 25.2532, lon: 55.3657 },
  SIN: { iata: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'SG', lat: 1.3644, lon: 103.9915 },
  DOH: { iata: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'QA', lat: 25.2731, lon: 51.6081 },
};

export const AIRLINES = {
  AI: 'Air India',
  '6E': 'IndiGo',
  IX: 'Air India Express',
  SG: 'SpiceJet',
  QP: 'Akasa Air',
};

// Reference schedule used only when no live flight provider is configured. Times are IST (+05:30).
export const REFERENCE_FLIGHTS = [
  { no: 'AI255', from: 'MAA', to: 'DEL', dep: '11:35', arr: '14:20', gate: 'A07', term: 'T1', arrGate: 'B06', arrTerm: 'T3' },
  { no: 'AI887', from: 'DEL', to: 'BOM', dep: '15:40', arr: '17:50', gate: 'A18', term: 'T3', arrGate: 'C12', arrTerm: 'T2' },
  { no: '6E5312', from: 'MAA', to: 'DEL', dep: '08:15', arr: '11:00', gate: 'A03', term: 'T1', arrGate: 'B02', arrTerm: 'T1' },
  { no: '6E2041', from: 'MAA', to: 'DEL', dep: '18:30', arr: '21:20', gate: 'A11', term: 'T1', arrGate: 'B04', arrTerm: 'T1' },
  { no: 'AI440', from: 'DEL', to: 'BOM', dep: '16:30', arr: '18:40', gate: 'A21', term: 'T3', arrGate: 'C04', arrTerm: 'T2' },
  { no: '6E6107', from: 'DEL', to: 'BOM', dep: '14:55', arr: '17:05', gate: 'A09', term: 'T1', arrGate: 'C08', arrTerm: 'T1' },
  { no: 'AI540', from: 'MAA', to: 'BOM', dep: '07:00', arr: '09:10', gate: 'A05', term: 'T1', arrGate: 'C02', arrTerm: 'T2' },
  { no: 'IX2713', from: 'MAA', to: 'BLR', dep: '09:30', arr: '10:30', gate: 'A14', term: 'T1', arrGate: 'B09', arrTerm: 'T1' },
  { no: '6E6201', from: 'MAA', to: 'HYD', dep: '12:10', arr: '13:25', gate: 'A16', term: 'T1', arrGate: 'B03', arrTerm: 'T1' },
  { no: 'AI441', from: 'DEL', to: 'MAA', dep: '19:10', arr: '21:55', gate: 'A12', term: 'T3', arrGate: 'B05', arrTerm: 'T1' },
  { no: 'QP1511', from: 'BOM', to: 'MAA', dep: '10:20', arr: '12:15', gate: 'A06', term: 'T1', arrGate: 'B08', arrTerm: 'T1' },
  { no: 'SG8169', from: 'DEL', to: 'CCU', dep: '13:05', arr: '15:20', gate: 'A04', term: 'T1', arrGate: 'B01', arrTerm: 'T2' },
];

// ---- Schematic terminal model for the Airport Digital Twin (REFERENCE / DEMO, not a surveyed plan) ----
export const TWIN_VIEWBOX = { w: 1000, h: 520 };
export const SPINE_Y = 250;
export const METERS_PER_PX = 1.0;

const pois = [];
for (let i = 1; i <= 24; i++) {
  pois.push({ id: `A${i}`, type: 'gate', label: `Gate A${i}`, x: Math.round(100 + ((i - 1) * 800) / 23), y: 100 });
}
for (let i = 1; i <= 12; i++) {
  const id = `B${String(i).padStart(2, '0')}`;
  pois.push({ id, type: 'gate', label: `Gate ${id}`, x: Math.round(100 + ((i - 1) * 800) / 11), y: 400 });
}
pois.push(
  { id: 'entrance', type: 'transport', label: 'Terminal entrance', x: 500, y: 490 },
  { id: 'ground-transport', type: 'transport', label: 'Ground transport hub', x: 880, y: 490 },
  { id: 'sec1', type: 'security', label: 'Security check 1', x: 250, y: 250 },
  { id: 'sec2', type: 'security', label: 'Security check 2', x: 750, y: 250 },
  { id: 'immigration', type: 'immigration', label: 'Immigration', x: 500, y: 300 },
  { id: 'baggage-claim', type: 'baggage', label: 'Baggage claim', x: 880, y: 320 },
  { id: 'food1', type: 'food', label: 'Food court West', x: 300, y: 180 },
  { id: 'food2', type: 'food', label: 'Food court East', x: 700, y: 320 },
  { id: 'lounge1', type: 'lounge', label: 'Lounge', x: 150, y: 310 },
  { id: 'rest1', type: 'restroom', label: 'Restrooms (West)', x: 200, y: 180 },
  { id: 'rest2', type: 'restroom', label: 'Restrooms (Centre)', x: 500, y: 190 },
  { id: 'rest3', type: 'restroom', label: 'Restrooms (East)', x: 800, y: 180 },
  { id: 'medical', type: 'emergency', label: 'First aid / medical', x: 120, y: 200 },
  { id: 'assist-desk', type: 'emergency', label: 'Passenger assistance desk', x: 500, y: 380 },
);
export const TWIN_POIS = pois;
export const poiById = Object.fromEntries(pois.map((p) => [p.id, p]));

/** Schematic walking route: poi -> spine -> poi. Returns polyline, distance (m) and minutes (with allowance). */
export function walkRoute(fromId, toId) {
  const a = poiById[fromId];
  const b = poiById[toId];
  if (!a || !b) return null;
  const pts = [[a.x, a.y]];
  if (a.y !== SPINE_Y) pts.push([a.x, SPINE_Y]);
  if (a.x !== b.x) pts.push([b.x, SPINE_Y]);
  if (b.y !== SPINE_Y) pts.push([b.x, b.y]);
  let px = 0;
  for (let i = 1; i < pts.length; i++) px += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
  const meters = Math.round(px * METERS_PER_PX);
  // 1.1 m/s walking pace x1.5 allowance for crowds, signage and level changes
  const minutes = Math.max(1, Math.ceil((meters / 1.1) * 1.5 / 60));
  return { points: pts, meters, minutes, from: a, to: b };
}

export const TRANSPORT = {
  MAA: [
    { mode: 'Metro', name: 'Chennai Metro (Airport station)', route: 'Airport → City Centre', frequencyMin: 8 },
    { mode: 'Train', name: 'Suburban rail (Tirusulam)', route: 'Tirusulam → Beach / Tambaram', frequencyMin: 20 },
    { mode: 'Bus', name: 'MTC airport buses', route: 'Airport → Koyambedu / T. Nagar', frequencyMin: 25 },
    { mode: 'Taxi', name: 'Prepaid taxi counter', route: 'On demand', frequencyMin: 3 },
    { mode: 'Shuttle', name: 'Hotel shuttle bay', route: 'Partner hotels', frequencyMin: 30 },
  ],
  DEL: [
    { mode: 'Metro', name: 'Airport Express Line', route: 'T3 → New Delhi', frequencyMin: 15 },
    { mode: 'Bus', name: 'DTC / airport coaches', route: 'Airport → city points', frequencyMin: 30 },
    { mode: 'Taxi', name: 'Prepaid taxi counter', route: 'On demand', frequencyMin: 3 },
    { mode: 'Shuttle', name: 'Inter-terminal shuttle', route: 'T1 ↔ T3', frequencyMin: 20 },
  ],
  BOM: [
    { mode: 'Bus', name: 'BEST airport buses', route: 'Airport → Andheri / Bandra', frequencyMin: 20 },
    { mode: 'Taxi', name: 'Prepaid taxi counter', route: 'On demand', frequencyMin: 3 },
    { mode: 'Train', name: 'Suburban rail (via Andheri)', route: 'Andheri → CSMT', frequencyMin: 10 },
    { mode: 'Shuttle', name: 'Inter-terminal shuttle', route: 'T1 ↔ T2', frequencyMin: 25 },
  ],
  DEFAULT: [
    { mode: 'Taxi', name: 'Airport taxi rank', route: 'On demand', frequencyMin: 5 },
    { mode: 'Bus', name: 'Airport bus', route: 'City centre', frequencyMin: 30 },
    { mode: 'Shuttle', name: 'Hotel shuttle', route: 'Partner hotels', frequencyMin: 30 },
  ],
};
