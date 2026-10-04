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
  ['air', 'Live Airspace', Globe2]
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
    setErr('');

    // If query is provided, user can search by flight number, airline, or airport name/code
    if (query) {
      const p = new URLSearchParams();
      p.set('q', query);
      p.set('date', f.date);
      nav(`/flight-status?${p}`);
      return;
    }

    if (!f.from || !f.to || f.from === f.to) {
      return setErr('Please choose two different airports, or enter a flight number / airport name.');
    }

    const p = new URLSearchParams({ from: f.from, to: f.to, date: f.date });
    nav(`/flight-status?${p}`);
  };

  return (
    <div className="search-panel card">
      <div className="tabs" role="tablist">
        {TABS.map(([k, label, Icon]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            className={tab === k ? 'on' : ''}
            onClick={() => setTab(k)}
          >
            <Icon size={17} /> {label}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <form className="sform" onSubmit={submit}>
          {/* ROW 1: Wide Horizontal Flight Number Field Spanning 100% of Card */}
          <label className="field field-full">
            <span>Flight Number / Route / Airport</span>
            <input
              value={f.no}
              onChange={set('no')}
              placeholder="e.g. AI 255 (or airline, city e.g. Chennai, VOMM, Delhi)"
              maxLength={40}
              autoComplete="off"
            />
          </label>

          {/* ROW 2: From & To */}
          <label className="field">
            <span>From</span>
            <select value={f.from} onChange={set('from')}>
              {airports.length === 0 && <option>{f.from}</option>}
              {airports.map((a) => (
                <option key={a.iata} value={a.iata}>
                  {a.iata} - {a.city} ({a.icao || a.iata})
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>To</span>
            <select value={f.to} onChange={set('to')}>
              {airports.length === 0 && <option>{f.to}</option>}
              {airports.map((a) => (
                <option key={a.iata} value={a.iata}>
                  {a.iata} - {a.city} ({a.icao || a.iata})
                </option>
              ))}
            </select>
          </label>

          {/* ROW 3: Travel Date & Search Button */}
          <label className="field">
            <span>Travel Date</span>
            <div className="datebox">
              <Calendar size={17} />
              <input type="date" value={f.date} onChange={set('date')} required />
            </div>
          </label>

          <div className="field btn-field">
            <span className="btn-label-placeholder">&nbsp;</span>
            <button className="btn primary btn-search" type="submit">
              Search Flight <ArrowRight size={18} />
            </button>
          </div>

          {err && <p className="form-err" role="alert">{err}</p>}
        </form>
      )}

      {tab === 'trips' && <TripsTab nav={nav} />}

      {tab === 'airport' && (
        <div className="tabbody">
          <div className="sform two" style={{ marginBottom: 16 }}>
            <label className="field">
              <span>Airport</span>
              <select value={info} onChange={(e) => setInfo(e.target.value)}>
                {airports.map((a) => (
                  <option key={a.iata} value={a.iata}>
                    {a.iata} - {a.city} ({a.icao || a.iata})
                  </option>
                ))}
              </select>
            </label>
            <p className="muted" style={{ alignSelf: 'center', margin: 0 }}>
              {airports.find((a) => a.iata === info)?.name || 'Loading airport…'}
            </p>
          </div>
          <div className="row gap wrap">
            {[
              ['/airport-twin', 'Digital Twin'],
              ['/weather', 'Weather'],
              ['/transport', 'Ground Transport'],
              ['/hotels', 'Hotels']
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
          <p className="muted">
            {compactAircraft != null
              ? `${compactAircraft} aircraft currently in view on the Live Airspace radar.`
              : 'See real ADS-B traffic around the active hub airport.'}
          </p>
          <button className="btn primary" onClick={() => nav('/airspace')}>
            Open Live Airspace <ArrowRight size={17} />
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
                  <small>{fmtTime(l.estimatedDeparture)}–{fmtTime(l.estimatedArrival)}</small>{' '}
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
