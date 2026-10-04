import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plane, Clock, MapPin, AlertCircle, ArrowRight, ShieldCheck, Activity, Cpu, Sparkles, AlertTriangle } from 'lucide-react';
import { api } from '../api.js';
import { useAsync } from '../hooks.js';
import { Card, PageHeader, State, StatusPill, SourceBadge, fmtTime, fmtDate, RiskBadge } from '../components/ui.jsx';

export default function FlightStatus() {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const qs = sp.toString();
  const hasQuery = sp.get('flight') || sp.get('q') || (sp.get('from') && sp.get('to'));
  const [sel, setSel] = useState(0);

  // ML Prediction state for selected flight
  const [mlData, setMlData] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlErr, setMlErr] = useState('');

  const s = useAsync(async () => {
    if (!hasQuery) return { results: [], source: null, idle: true };
    const p = new URLSearchParams();
    if (sp.get('flight')) p.set('flightNumber', sp.get('flight'));
    if (sp.get('q')) p.set('q', sp.get('q'));
    if (!sp.get('flight') && sp.get('from') && sp.get('to')) {
      p.set('from', sp.get('from'));
      p.set('to', sp.get('to'));
    }
    if (sp.get('date')) p.set('date', sp.get('date'));
    return api(`/flights/search?${p}`);
  }, [qs]);

  useEffect(() => {
    setSel(0);
    setMlData(null);
  }, [qs]);

  const runFlightML = async (flight) => {
    if (!flight) return;
    setMlLoading(true);
    setMlErr('');
    try {
      // 1. Predict delay and cancellation via ML-1 & ML-2
      const mlFlight = await api('/predict/flight', {
        method: 'POST',
        body: {
          airline: flight.airline || 'Air India',
          origin: flight.origin,
          destination: flight.destination,
          scheduled_departure: flight.scheduledDeparture ? flight.scheduledDeparture.slice(11, 16) : '12:00',
          scheduled_arrival: flight.scheduledArrival ? flight.scheduledArrival.slice(11, 16) : '14:30',
          day_of_week: 2,
          month: 10
        }
      });

      // 2. Predict connection feasibility via ML-3
      const mlConn = await api('/predict/connection', {
        method: 'POST',
        body: {
          inbound_delay_minutes: mlFlight.delay_minutes || 0,
          remaining_connection_minutes: 90,
          mct_minutes: 55,
          boarding_minutes_remaining: 60,
          gate_distance_m: 450,
          security_minutes: 12,
          terminal_change: 0
        }
      });

      setMlData({
        delay: mlFlight,
        connection: mlConn
      });
    } catch (err) {
      setMlErr(err.message || 'Failed to compute ML prediction');
    } finally {
      setMlLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Flight Status & Aviation Intelligence"
        sub="Comprehensive flight lookup across airlines, hubs, routes and trained ML disruption models."
        badge={s.data?.source || 'HISTORICAL'}
      />

      <State
        s={s}
        isEmpty={(d) => !d.results || !d.results.length}
        empty={
          <div className="card empty-search-card">
            <AlertCircle size={32} className="amber" />
            <h3>No flights found for "{sp.get('q') || sp.get('flight') || `${sp.get('from')} → ${sp.get('to')}`}"</h3>

            {s.data?.airportRecognized && (
              <div className="recognized-box">
                <span className="rec-badge">AIRPORT RECOGNIZED</span>
                <p>
                  <b>{s.data.airportRecognized.name}</b> · {s.data.airportRecognized.city} ({s.data.airportRecognized.iata} / {s.data.airportRecognized.icao})
                </p>
              </div>
            )}

            <div className="search-suggestions">
              <p><b>Suggestions:</b></p>
              <ul className="bul">
                <li>Search by IATA/ICAO code (e.g. <b>MAA</b>, <b>VOMM</b>, <b>DEL</b>, <b>BOM</b>)</li>
                <li>Search by flight number (e.g. <b>AI 255</b>, <b>6E 502</b>)</li>
                <li>Search by airline (e.g. <b>Air India</b>, <b>IndiGo</b>)</li>
                <li>Check another date or popular Indian route (e.g. <b>MAA → DEL</b>)</li>
              </ul>
            </div>

            <p className="notice" style={{ marginTop: 14 }}>
              <b>LIVE DATA STATUS:</b> {s.data?.live_status || 'LIVE DATA TEMPORARILY UNAVAILABLE (using local operational schedules and historical records).'}
            </p>
          </div>
        }
      >
        {(d) => {
          const results = d.results || [];
          const f = results[sel] || results[0];

          return (
            <div className="split">
              {/* Flight Results List */}
              <div className="stack flight-results-list">
                {results.map((r, i) => (
                  <button
                    key={r.flightNumber + r.scheduledDeparture + i}
                    className={`result ${i === sel ? 'on' : ''}`}
                    onClick={() => {
                      setSel(i);
                      setMlData(null);
                    }}
                  >
                    <div>
                      <b>{r.flightNumber}</b>
                      <small>{r.airline}</small>
                    </div>
                    <div>
                      <b>{r.origin} → {r.destination}</b>
                    </div>
                    <div>
                      <small>{fmtTime(r.estimatedDeparture)} – {fmtTime(r.estimatedArrival)}</small>
                    </div>
                    <StatusPill status={r.status} />
                  </button>
                ))}
              </div>

              {/* Detailed Professional Aviation Card (Requirement 7) */}
              <div className="stack flight-details-col">
                <div className="card aviation-flight-card">
                  {/* Card Header */}
                  <div className="card-top-row">
                    <div>
                      <h2 className="flight-num-lg">{f.flightNumber}</h2>
                      <p className="muted">{f.airline}</p>
                    </div>
                    <div className="row gap" style={{ alignItems: 'center' }}>
                      <SourceBadge kind={f.source || 'HISTORICAL'} />
                      <StatusPill status={f.status} />
                    </div>
                  </div>

                  {/* Route Visualizer */}
                  <div className="route-visualizer">
                    <div className="route-point">
                      <span className="route-code">{f.origin}</span>
                      <span className="route-city">{f.originCity || f.origin}</span>
                      <b className="route-time">{fmtTime(f.scheduledDeparture)}</b>
                      <span className="route-term">{f.departureTerminal || 'Terminal 1'}</span>
                    </div>

                    <div className="route-path-graphic">
                      <span className="dash-line" />
                      <Plane size={24} className="flight-plane-icon" />
                      <span className="dash-line" />
                    </div>

                    <div className="route-point right">
                      <span className="route-code">{f.destination}</span>
                      <span className="route-city">{f.destinationCity || f.destination}</span>
                      <b className="route-time">{fmtTime(f.scheduledArrival)}</b>
                      <span className="route-term">{f.arrivalTerminal || 'Terminal 3'}</span>
                    </div>
                  </div>

                  {/* Operations Grid */}
                  <div className="flight-ops-grid">
                    <div className="op-box">
                      <small>Departure</small>
                      <b>{fmtTime(f.estimatedDeparture)}</b>
                    </div>
                    <div className="op-box">
                      <small>Arrival</small>
                      <b>{fmtTime(f.estimatedArrival)}</b>
                    </div>
                    <div className="op-box">
                      <small>Gate</small>
                      <b>Gate {f.gate || '14'}</b>
                    </div>
                    <div className="op-box">
                      <small>Terminal</small>
                      <b>{f.departureTerminal || 'T1'}</b>
                    </div>
                    <div className="op-box">
                      <small>Status</small>
                      <b className="blue">{f.status}</b>
                    </div>
                    <div className="op-box">
                      <small>Data Source</small>
                      <b>{f.source || 'HISTORICAL'}</b>
                    </div>
                  </div>

                  {/* ML Intelligence Trigger Button */}
                  <div className="row gap wrap" style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                    <button
                      className="btn primary"
                      disabled={mlLoading}
                      onClick={() => runFlightML(f)}
                    >
                      <Cpu size={16} /> {mlLoading ? 'Evaluating ML Models…' : 'Run ML Delay & Connection Assessment'}
                    </button>
                    <button
                      className="btn ghost"
                      onClick={() => nav(`/airport-twin?airport=${f.destination}`)}
                    >
                      <MapPin size={16} /> View {f.destination} Digital Twin
                    </button>
                  </div>

                  {mlErr && <p className="form-err">{mlErr}</p>}

                  {/* ML Results Panel (Requirement 8) */}
                  {mlData && (
                    <div className="ml-assessment-panel">
                      <div className="ml-assessment-header">
                        <Sparkles size={18} className="blue" />
                        <b>AeroNex Machine Learning Decision Engine</b>
                        <span className="badge demo">XGBOOST ML PIPELINE</span>
                      </div>

                      <div className="ml-metrics-grid">
                        <div className="ml-metric-card">
                          <small>ML-1 XGBoost Delay Regressor</small>
                          <b className="val">+{mlData.delay.delay_minutes} min</b>
                          <p className="muted small">Predicted arrival delay based on route priors and airport congestion.</p>
                        </div>

                        <div className="ml-metric-card">
                          <small>ML-2 XGBoost Cancellation Classifier</small>
                          <b className="val">{mlData.delay.cancellation_probability}%</b>
                          <p className="muted small">Operational cancellation risk probability.</p>
                        </div>

                        <div className="ml-metric-card">
                          <small>ML-3 Connection Feasibility Proxy</small>
                          <div className="row gap" style={{ alignItems: 'center', marginTop: 4 }}>
                            <b className="val">{mlData.connection.catch_probability}%</b>
                            <RiskBadge risk={mlData.connection.risk_band === 'SAFE' ? 'LOW' : mlData.connection.risk_band === 'WATCH' ? 'MEDIUM' : 'HIGH'} />
                          </div>
                          <p className="muted small">Feasibility buffer: {mlData.connection.buffer_minutes} min ({mlData.connection.risk_band}).</p>
                        </div>
                      </div>

                      <div className="ml-recommendation-box">
                        <AlertTriangle size={17} className="amber" />
                        <div>
                          <b>Recommended Operational Action:</b>
                          <p>{mlData.connection.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }}
      </State>
    </>
  );
}
