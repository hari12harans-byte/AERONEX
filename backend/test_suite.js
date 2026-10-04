// Automated Verification Test Suite for AeroNex
async function testAll() {
  const base = 'http://localhost:4000/api';
  console.log('Testing AeroNex Production Endpoints on', base);

  // 1. Search Chennai
  const r1 = await (await fetch(`${base}/flights/search?q=chennai`)).json();
  console.log('\n[TEST 1] Search "chennai":');
  console.log(`- Total flights returned: ${r1.results?.length}`);
  console.log(`- Data source: ${r1.source}`);
  console.log(`- Sample flight: ${r1.results?.[0]?.flightNumber} (${r1.results?.[0]?.origin} -> ${r1.results?.[0]?.destination}) [${r1.results?.[0]?.source}]`);

  // 2. Search MAA
  const r2 = await (await fetch(`${base}/airports/resolve?q=MAA`)).json();
  console.log('\n[TEST 2] Resolve "MAA":');
  console.log(`- Resolved to: ${r2.airport?.name} (${r2.airport?.city}) IATA: ${r2.airport?.iata} / ICAO: ${r2.airport?.icao}`);

  // 3. Search VOMM
  const r3 = await (await fetch(`${base}/airports/resolve?q=VOMM`)).json();
  console.log('\n[TEST 3] Resolve "VOMM":');
  console.log(`- Resolved to: ${r3.airport?.name} (${r3.airport?.city}) IATA: ${r3.airport?.iata} / ICAO: ${r3.airport?.icao}`);

  // 4. Search AI255
  const r4 = await (await fetch(`${base}/flights/search?q=AI255`)).json();
  console.log('\n[TEST 4] Search "AI255":');
  console.log(`- Found flight: ${r4.results?.[0]?.flightNumber} (${r4.results?.[0]?.airline}) status: ${r4.results?.[0]?.status} source: ${r4.results?.[0]?.source}`);

  // 5. Nearest Airport
  const r5 = await (await fetch(`${base}/airports/nearest?lat=12.994&lon=80.170`)).json();
  console.log('\n[TEST 5] Nearest Airport for (12.994, 80.170):');
  console.log(`- Nearest: ${r5.nearest?.name} (${r5.nearest?.iata}/${r5.nearest?.icao}) distance: ${r5.nearest?.distanceKm} km`);

  // 6. Search Invalid / Empty with Suggestions
  const r6 = await (await fetch(`${base}/flights/search?q=UnknownCityXYZ`)).json();
  console.log('\n[TEST 6] Search unknown route "UnknownCityXYZ":');
  console.log(`- Results count: ${r6.results?.length}`);
  console.log(`- Recognized airport: ${r6.recognizedAirport}`);
  console.log(`- Suggestions: ${r6.suggestions?.join(', ')}`);

  // 7. Gate Navigation B06 -> A18
  const r7 = await (await fetch(`${base}/gate/route?from=B06&to=A18`)).json();
  console.log('\n[TEST 7] Gate Navigation "B06" -> "A18":');
  console.log(`- Distance: ${r7.metrics?.gate_distance_meters} m`);
  console.log(`- Walking: ${r7.metrics?.walking_minutes} min`);
  console.log(`- Security: ${r7.metrics?.security_minutes} min`);
  console.log(`- Terminal transfer: ${r7.metrics?.terminal_transfer_minutes} min`);
  console.log(`- Total: ${r7.metrics?.total_estimated_transfer_minutes} min`);
  console.log(`- Transfer note: ${r7.note}`);

  // 8. Airport Twin MAA
  const r8 = await (await fetch(`${base}/airport/twin?airport=MAA`)).json();
  console.log('\n[TEST 8] Airport Digital Twin "MAA":');
  console.log(`- Name: ${r8.airport?.name} (${r8.airport?.iata})`);
  console.log(`- Runways: ${r8.runways?.map(rw => rw.id).join(', ')}`);
  console.log(`- Terminals: ${r8.terminals?.map(t => t.name).join(' | ')}`);

  // 9. Operational ML XGBoost
  const r9 = await (await fetch(`${base}/flights/ml-predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      airline: 'Air India',
      origin: 'MAA',
      destination: 'DEL',
      distance_km: 1760,
      hour_of_day: 11,
      minute_of_hour: 35,
      month: 10,
      day_of_week: 2
    })
  })).json();
  console.log('\n[TEST 9] XGBoost Operational ML Prediction:');
  console.log(JSON.stringify(r9, null, 2));

  console.log('\nAll tests completed successfully!');
}

testAll().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
