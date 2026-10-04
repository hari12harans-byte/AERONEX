// node --test backend/test   (no network, no express needed). The mock ML server below is a TEST DOUBLE, not a model.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { decide } from '../decisionEngine.js';

let mode = 'ok';
const srv = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (mode === 'untrained') { res.statusCode = 503; return res.end(JSON.stringify({ detail: { status: 'MODEL NOT TRAINED', detail: 'x' } })); }
  res.end(JSON.stringify({ probability: 0.78, risk: 'HIGH', model_version: 'test-double', top_factors: ['connection_buffer_min'], connection_buffer_min: -5, data_quality: { unknown_imputed_by_model: ['weather_risk'] } }));
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
process.env.ML_API_URL = `http://127.0.0.1:${srv.address().port}`;
const { mlPredict, istParts } = await import('../mlClient.js');
const conn = (risk, bufferMin) => ({ risk, bufferMin, availableMin: 60, requiredMin: 60 - bufferMin });

test('normalises prediction and keeps the legacy alias', async () => {
  const r = await mlPredict({ connection_time_min: 60, weather_risk: null });
  assert.equal(r.available, true);
  assert.equal(r.missed_connection_probability, 0.78);
});
test('MODEL NOT TRAINED is reported, not thrown', async () => {
  mode = 'untrained';
  const r = await mlPredict({ connection_time_min: 60 });
  assert.deepEqual([r.available, r.status], [false, 'MODEL NOT TRAINED']);
  mode = 'ok';
});
test('ML can raise but never lower the deterministic risk', async () => {
  const ml = await mlPredict({ connection_time_min: 60 });
  assert.equal(decide({ connection: conn('LOW', 40), ml }).risk, 'HIGH');
  assert.equal(decide({ connection: conn('CRITICAL', -10), ml }).risk, 'CRITICAL');
});
test('falls back to rule-based text when ML is unavailable', () => {
  const d = decide({ connection: conn('MEDIUM', 15), ml: { available: false, status: 'ML SERVICE UNAVAILABLE' }, mlStatus: 'ML SERVICE UNAVAILABLE' });
  assert.equal(d.risk, 'MEDIUM');
  assert.match(d.reasons.join(' '), /ML estimate not used/);
});
test('istParts uses IST and Monday=0', () => {
  assert.deepEqual(istParts('2026-10-05T14:20:00+05:30'), { hour_of_day: 14, day_of_week: 0 });
});
test('unreachable service degrades gracefully', async () => {
  srv.close();
  process.env.ML_API_URL = 'http://127.0.0.1:9';
  const r = await mlPredict({ connection_time_min: 60 });
  assert.equal(r.available, false);
});
