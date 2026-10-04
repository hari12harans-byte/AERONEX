import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plane, AlertTriangle, CheckCircle2, Clock, MapPin, Sparkles, Building2, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '../api.js';
import { useAsync } from '../hooks.js';
import { Card, PageHeader, State, StatusPill, SourceBadge, fmtTime, fmtDate } from '../components/ui.jsx';

export default function FlightStatus() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const qs = sp.toString();
  const hasQuery = sp.get('flight') || sp.get('q') || (sp.get('from') && sp.get('to'));
  const [sel, setSel] = useState(0);
  const [mlResult, setMlResult] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);

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
    setMlResult(null);
  }, [qs]);

  const runMlPrediction = async (flight) => {
    setMlLoading(true);
    try {
      const depHour = flight.scheduledDeparture ? new Date(flight.scheduledDeparture).getHours() : 11;
      const depMin = flight.scheduledDeparture ? new Date(flight.scheduledDeparture).getMinutes() : 35;
      const res = await api('/flights/ml-predict', {
        method: 'POST',
        body: {
          airline: flight.airline,
          origin: flight.origin,
          destination: flight.destination,
          distance_km: flight.distanceKm || 1760,
          hour_of_day: depHour,
          minute_of_hour: depMin,
        },
      });
      setMlResult(res);
    } catch (e) {
      console.warn('ML Prediction failed:', e);
    } finally {
      setMlLoading(false);
    }
  };

  const results = s.data?.results || [];
  const recognizedAirport = s.data?.recognizedAirport;
  const queryText = sp.get('q') || sp.get('flight') || (sp.get('from') && `${sp.get('from')} → ${sp.get('to')}`) || '';

  return (
    <>
      <PageHeader
        title="Flight Status & Operations"
        sub="Search flights across Indian and international airspace with real-time, historical, and ML operational telemetry."
        badge={s.data?.source || 'OPERATIONS'}
      />

      <State
        s={s}
        isEmpty={(d) => !d.results || !d.results.length}
        empty={
          <div className="empty-results-box">
            <Plane size={48} className="empty-icon text-muted" aria-hidden="true" />
            <h3>{queryText ? `No flights found for "${queryText}"` : 'Enter a flight or airport search above'}</h3>

            {recognizedAirport && (
              <div className="recognized-airport-badge">
                <span className="badge-tag">Airport Recognized</span>
                <b>{recognizedAirport.name}</b>
                <span className="codes">IATA: {recognizedAirport.iata} · ICAO: {recognizedAirport.icao} · City: {recognizedAirport.city}</span>
              </div>
            )}

            <div className="search-suggestions">
              <span className="suggestions-title">Try searching:</span>
              <div className="pills-row">
                <button className="pill-btn" onClick={() => nav('/flight-status?q=MAA')}>MAA (Chennai)</button>
                <button className="pill-btn" onClick={() => nav('/flight-status?q=DEL')}>DEL (Delhi)</button>
                <button className="pill-btn" onClick={() => nav('/flight-status?q=AI255')}>AI 255</button>
                <button className="pill-btn" onClick={() => nav('/flight-status?q=6E5312')}>6E 5312</button>
                <button className="pill-btn" onClick={() => nav('/flight-status?from=MAA&to=DEL')}>MAA → DEL</button>
              </div>
            </div>
            {s.data?.note && <p className="muted small mt-sm">{s.data.note}</p>}
          </div>
        }
      >
        {(d) => {
          const f = d.results[sel] || d.results[0];
          return (
            <div className="split wide">
              {/* Flight List Column */}
              <div className="stack flight-results-list">
                <div className="results-header-count">
                  <b>{d.results.length} Flight{d.results.length === 1 ? '' : 's'} Found</b>
                  <SourceBadge kind={d.source || 'HISTORICAL'} />
                </div>
                {d.results.map((r, i) => (
                  <button
                    key={`${r.flightNumber}-${r.scheduledDeparture}-${i}`}
                    className={`flight-card-mini ${i === sel ? 'active-card' : ''}`}
                    onClick={() => {
                      setSel(i);
                      setMlResult(null);
                    }}
                  >
                    <div className="mini-row top">
                      <div className="airline-block">
                        <b>{r.flightNumber}</b>
                        <small>{r.airline}</small>
                      </div>
                      <StatusPill status={r.status} />
                    </div>
                    <div className="mini-row middle">
                      <span className="route-iata">{r.origin}</span>
                      <span className="route-arrow">───►</span>
                      <span className="route-iata">{r.destination}</span>
                    </div>
                    <div className="mini-row bottom">
                      <small>{fmtTime(r.scheduledDeparture)} – {fmtTime(r.scheduledArrival)}</small>
                      <SourceBadge kind={r.source} />
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected Flight Command Card */}
              <div className="flight-command-card card">
                {/* Header */}
                <div className="flight-header-bar">
                  <div className="airline-title-group">
                    <h2>{f.flightNumber}</h2>
                    <span className="airline-name-sub">{f.airline}</span>
                  </div>
                  <div className="status-badges-group">
                    <SourceBadge kind={f.source} />
                    <StatusPill status={f.status} />
                  </div>
                </div>

                {/* Main Visual Route Banner */}
                <div className="flight-route-hero">
                  <div className="route-node origin">
                    <span className="city-label">{f.originCity || f.origin}</span>
                    <span className="iata-code">{f.origin}</span>
                    <span className="flight-time">{fmtTime(f.scheduledDeparture)}</span>
                    <span className="terminal-gate">Terminal {f.terminal || 'T1'} · Gate {f.gate || 'A07'}</span>
                  </div>

                  <div className="route-path-visual">
                    <Plane size={24} className="flight-path-plane" aria-hidden="true" />
                    <div className="path-line"></div>
                    <span className="distance-badge">{f.distanceKm ? `${f.distanceKm} km` : '1,760 km'}</span>
                  </div>

                  <div className="route-node destination">
                    <span className="city-label">{f.destCity || f.destination}</span>
                    <span className="iata-code">{f.destination}</span>
                    <span className="flight-time">{fmtTime(f.scheduledArrival)}</span>
                    <span className="terminal-gate">Terminal {f.arrivalTerminal || 'T3'} · Gate {f.arrivalGate || 'B06'}</span>
                  </div>
                </div>

                {/* Operations Data Grid */}
                <div className="ops-data-grid">
                  <div className="ops-item">
                    <span className="ops-label">Departure</span>
                    <b className="ops-value">{fmtTime(f.estimatedDeparture)}</b>
                    <small className="ops-sub">Sched: {fmtTime(f.scheduledDeparture)}</small>
                  </div>
                  <div className="ops-item">
                    <span className="ops-label">Arrival</span>
                    <b className="ops-value">{fmtTime(f.estimatedArrival)}</b>
                    <small className="ops-sub">Sched: {fmtTime(f.scheduledArrival)}</small>
                  </div>
                  <div className="ops-item">
                    <span className="ops-label">Operational Status</span>
                    <b className={`ops-value ${f.status.includes('DELAYED') ? 'text-amber' : f.status.includes('CANCEL') ? 'text-bad' : 'text-ok'}`}>
                      {f.status}
                    </b>
                    <small className="ops-sub">{f.delayMinutes ? `+${f.delayMinutes} min delay` : 'On schedule'}</small>
                  </div>
                  <div className="ops-item">
                    <span className="ops-label">Data Telemetry</span>
                    <b className="ops-value">{f.source}</b>
                    <small className="ops-sub">{f.source === 'LIVE' ? 'AviationStack ADS-B' : 'AeroNex Verified DB'}</small>
                  </div>
                </div>

                {/* ML Operational Intelligence Banner */}
                <div className="ml-ops-panel">
                  <div className="ml-ops-header">
                    <div className="row gap">
                      <Sparkles size={20} className="text-cyan" />
                      <div>
                        <b>AeroNex Machine Learning Telemetry</b>
                        <small className="d-block text-muted">XGBoost Delay Regressor + Severe Delay / Cancellation Classifier</small>
                      </div>
                    </div>
                    {!mlResult && (
                      <button
                        className="btn primary sm"
                        onClick={() => runMlPrediction(f)}
                        disabled={mlLoading}
                      >
                        {mlLoading ? 'Computing ML...' : 'Run ML Forecast'}
                      </button>
                    )}
                  </div>

                  {mlResult && mlResult.available && (
                    <div className="ml-result-grid mt-sm">
                      <div className="ml-tile">
                        <span className="ml-tile-label">XGBoost Predicted Delay</span>
                        <b className="ml-tile-value">{mlResult.predicted_delay_min} min</b>
                        <small className="text-muted">Model: {mlResult.models_used?.delay || 'aeronex_delay_xgb'}</small>
                      </div>
                      <div className="ml-tile">
                        <span className="ml-tile-label">Cancellation Probability</span>
                        <b className={`ml-tile-value ${mlResult.cancellation_probability > 0.5 ? 'text-bad' : 'text-ok'}`}>
                          {(mlResult.cancellation_probability * 100).toFixed(1)}%
                        </b>
                        <small className="text-muted">Risk Category: {mlResult.cancellation_risk}</small>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="card-actions-bar">
                  <button
                    className="btn ghost"
                    onClick={() => nav(`/airport-twin?airport=${f.origin}`)}
                  >
                    <Building2 size={17} /> Digital Twin ({f.origin})
                  </button>
                  <button
                    className="btn ghost"
                    onClick={() => nav(`/airport-twin?airport=${f.destination}`)}
                  >
                    <Building2 size={17} /> Digital Twin ({f.destination})
                  </button>
                  <button
                    className="btn primary"
                    onClick={() => nav(`/trip`)}
                  >
                    <ShieldCheck size={17} /> Connection Guardian <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        }}
      </State>
    </>
  );
}
