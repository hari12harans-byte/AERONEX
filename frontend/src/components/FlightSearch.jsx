import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, Briefcase, MapPin, Globe2, ArrowRight, Calendar, Search } from 'lucide-react';
import { api } from '../api.js';
import { useAirports, useAsync } from '../hooks.js';
import { fmtTime, StatusPill, State } from './ui.jsx';

const TABS = [
  ['search', 'Flight Search', Plane],
  ['trips', 'My Trips', Briefcase],
  ['airport', 'Airport Info', MapPin],
  ['air', 'Live Airspace', Globe2],
];

const todayISO = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

export default function FlightSearch({ compactAircraft }) {
  const [tab, setTab] = useState('search');
  const nav = useNavigate();
  const airports = useAirports();
  const [f, setF] = useState({ no: '', from: 'MAA', to: 'DEL', date: todayISO() });
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('MAA');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const query = f.no.trim();
    const noClean = query.replace(/\s+/g, '').toUpperCase();

    // If user provided a query in the main flight search field
    if (query) {
      setErr('');
      const p = new URLSearchParams();
      // If it looks like a flight number (e.g. AI 255, 6E 5312)
      if (/^[A-Z0-9]{2}\s*\d{1,4}[A-Z]?$/i.test(query)) {
        p.set('flight', noClean);
      } else {
        p.set('q', query);
      }
      if (f.date) p.set('date', f.date);
      nav(`/flight-status?${p}`);
      return;
    }

    // Otherwise search using From/To pair
    if (!f.from || !f.to || f.from === f.to) {
      return setErr('Enter a flight number/airport, or choose two different route airports');
    }
    setErr('');
    const p = new URLSearchParams({ from: f.from, to: f.to, date: f.date });
    nav(`/flight-status?${p}`);
  };

  return (
    <div className="search-panel card">
      <div className="tabs" role="tablist" aria-label="Flight search tabs">
        {TABS.map(([k, label, Icon]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            className={`tab-btn ${tab === k ? 'on' : ''}`}
            onClick={() => setTab(k)}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <form className="flight-search-form" onSubmit={submit}>
          {/* Row 1: Full-width Flight Number Input (Spans both columns) */}
          <div className="form-field full-width">
            <label htmlFor="flight-no-input">Flight Number / Airport / Route</label>
            <div className="input-with-icon wide-input-wrap">
              <Search size={20} className="field-icon" aria-hidden="true" />
              <input
                id="flight-no-input"
                className="flight-number-input"
                value={f.no}
                onChange={set('no')}
                placeholder="e.g. AI 255, Chennai, MAA, or VOMM"
                maxLength={40}
                autoComplete="off"
              />
            </div>
            <span className="field-hint">Supports flight number (AI 255), airport name (Chennai), IATA (MAA), or ICAO (VOMM)</span>
          </div>

          {/* Row 2: Two-column From and To selectors */}
          <div className="form-field half-width">
            <label htmlFor="origin-select">From</label>
            <select id="origin-select" value={f.from} onChange={set('from')}>
              {airports.length === 0 && <option value={f.from}>{f.from} - Chennai</option>}
              {airports.map((a) => (
                <option key={a.iata} value={a.iata}>
                  {a.iata} - {a.city} ({a.name})
                </option>
              ))}
            </select>
          </div>

          <div className="form-field half-width">
            <label htmlFor="destination-select">To</label>
            <select id="destination-select" value={f.to} onChange={set('to')}>
              {airports.length === 0 && <option value={f.to}>{f.to} - Delhi</option>}
              {airports.map((a) => (
                <option key={a.iata} value={a.iata}>
                  {a.iata} - {a.city} ({a.name})
                </option>
              ))}
            </select>
          </div>

          {/* Row 3: Travel Date and Search Flight Button */}
          <div className="form-field half-width">
            <label htmlFor="date-input">Travel Date</label>
            <div className="datebox">
              <Calendar size={18} aria-hidden="true" />
              <input
                id="date-input"
                type="date"
                value={f.date}
                onChange={set('date')}
                required
              />
            </div>
          </div>

          <div className="form-field half-width btn-align">
            <button className="btn primary lg search-submit-btn" type="submit">
              Search Flight <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>

          {err && <p className="form-err" role="alert">{err}</p>}
        </form>
      )}

      {tab === 'trips' && <TripsTab nav={nav} />}

      {tab === 'airport' && (
        <div className="tabbody">
          <div className="airport-quick-search">
            <label className="field">
              <span>Select Airport</span>
              <select value={info} onChange={(e) => setInfo(e.target.value)}>
                {airports.map((a) => (
                  <option key={a.iata} value={a.iata}>
                    {a.iata} - {a.city} ({a.name})
                  </option>
                ))}
              </select>
            </label>
            <p className="airport-full-title">
              <b>{airports.find((a) => a.iata === info)?.name || 'Chennai International Airport'}</b>
              <small> · IATA: {info} · ICAO: {airports.find((a) => a.iata === info)?.icao || 'VOMM'}</small>
            </p>
          </div>
          <div className="row gap wrap mt-md">
            {[
              ['/airport-twin', 'Airport Digital Twin'],
              ['/weather', 'Weather Station'],
              ['/transport', 'Ground Transport'],
              ['/hotels', 'Nearby Hotels'],
            ].map(([to, l]) => (
              <button key={to} className="btn ghost" onClick={() => nav(`${to}?airport=${info}`)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'air' && (
        <div className="tabbody row gap between wrap">
          <div>
            <b>Live Airspace Surveillance</b>
            <p className="muted">
              {compactAircraft != null
                ? `${compactAircraft} active aircraft tracked in regional airspace.`
                : 'Surveillance of active commercial traffic via ADS-B telemetry.'}
            </p>
          </div>
          <button className="btn primary" onClick={() => nav('/airspace')}>
            Open Live Airspace Radar <ArrowRight size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

function TripsTab({ nav }) {
  const s = useAsync(() => api('/trip'));
  return (
    <div className="tabbody">
      <State s={s}>
        {(t) => (
          <div className="row gap between wrap">
            <div className="row gap wrap">
              {t.legs.map((l) => (
                <div key={l.flightNumber} className="mini-leg">
                  <b>{l.flightNumber}</b> {l.origin} → {l.destination}{' '}
                  <small>
                    {fmtTime(l.estimatedDeparture)}–{fmtTime(l.estimatedArrival)}
                  </small>{' '}
                  <StatusPill status={l.status} />
                </div>
              ))}
            </div>
            <button className="btn primary" onClick={() => nav('/trip')}>
              Open My Trip <ArrowRight size={17} />
            </button>
          </div>
        )}
      </State>
    </div>
  );
}
