import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Luggage, Check } from 'lucide-react';
import { api } from '../api.js';
import { useAirports, useAsync } from '../hooks.js';
import { WeatherIcon } from '../layouts/Shell.jsx';
import { Card, PageHeader, State, SourceBadge, AirportSelect, fmtAgo, fmtDate } from '../components/ui.jsx';

function useAirportParam(def = 'MAA') {
  const [sp, setSp] = useSearchParams();
  const code = (sp.get('airport') || def).toUpperCase();
  return [code, (c) => setSp({ airport: c })];
}

export function Baggage() {
  const s = useAsync(() => api('/baggage'));
  const [busy, setBusy] = useState(false);
  const adv = async () => {
    setBusy(true);
    try { await api('/simulation/event', { method: 'POST', body: { type: 'bag_advance' } }); await s.reload(); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Baggage Tracking" sub="Follow your bag through each stage of the journey." badge="REFERENCE" />
      <State s={s}>
        {(b) => (
          <div className="stack">
            <Card title={`Bag ${b.bagId}`} right={<b className="pill info">{b.status}</b>}>
              <dl className="dl">
                {[['Bag ID', b.bagId], ['Flight', b.flight], ['Status', b.status], ['Location', b.location], ['Last updated', fmtAgo(b.lastUpdated)], ['Transfer state', b.transferState]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
              </dl>
              <ol className="stepper" aria-label="Baggage journey">
                {b.stages.map((st, i) => <li key={st} className={i < b.stageIndex ? 'done' : i === b.stageIndex ? 'now' : ''}><span>{i < b.stageIndex ? <Check size={14} /> : <Luggage size={14} />}</span>{st}</li>)}
              </ol>
              <div className="row gap wrap"><button className="btn ghost" disabled={busy || b.stageIndex >= b.stages.length - 1} onClick={adv}>Advance scenario</button></div>
            </Card>
            <p className="notice">Airline-level baggage events are not connected for this journey. Use the Scenario Lab to test baggage workflow events.</p>
          </div>
        )}
      </State>
    </>
  );
}

export function Transport() {
  const airports = useAirports();
  const [code, setCode] = useAirportParam();
  const [mode, setMode] = useState('All');
  const s = useAsync(() => api(`/transport?airport=${code}`), [code]);
  const modes = ['All', 'Metro', 'Train', 'Bus', 'Taxi', 'Shuttle'];
  return (
    <>
      <PageHeader title="Ground Transport" sub="Ways to get to and from the airport." badge="REFERENCE"><AirportSelect airports={airports} value={code} onChange={setCode} /></PageHeader>
      <div className="chips">{modes.map((m) => <button key={m} className={`chipbtn ${mode === m ? 'on' : ''}`} onClick={() => setMode(m)}>{m}</button>)}</div>
      <State s={s} isEmpty={(d) => !d.items.filter((i) => mode === 'All' || i.mode === mode).length} empty="No services for this filter.">
        {(d) => (
          <div className="grid3">
            {d.items.filter((i) => mode === 'All' || i.mode === mode).map((i) => (
              <Card key={i.name} title={i.name} right={<b className="pill info">{i.mode}</b>}>
                <p className="muted">{i.route}</p>
                <p><b>Next in ~{i.etaMin} min</b> <SourceBadge kind="ESTIMATED" /></p>
                <small className="muted">Every ~{i.frequencyMin} min · {i.status}</small>
              </Card>
            ))}
          </div>
        )}
      </State>
    </>
  );
}

export function Hotels() {
  const airports = useAirports();
  const [code, setCode] = useAirportParam();
  const s = useAsync(() => api(`/hotels?airport=${code}`), [code]);
  return (
    <>
      <PageHeader title="Hotels Near Airport" sub="Nearby hotels from OpenStreetMap." badge="REFERENCE"><AirportSelect airports={airports} value={code} onChange={setCode} /></PageHeader>
      <State s={s} strict isEmpty={(d) => !d.hotels.length} empty="No hotels found near this airport.">
        {(d) => (
          <div className="stack">
            <p className="notice">{d.note}</p>
            <div className="grid3">
              {d.hotels.map((h) => (
                <Card key={h.name + h.lat} title={h.name}>
                  <dl className="dl one">
                    <div><dt>Distance</dt><dd>{h.distanceKm} km</dd></div>
                    <div><dt>Rating</dt><dd>{h.stars ? `${h.stars}★` : 'Not listed'}</dd></div>
                    <div><dt>Price / availability</dt><dd>Not available (no provider)</dd></div>
                  </dl>
                  <div className="row gap wrap">
                    {h.website && <a className="textlink" href={h.website} target="_blank" rel="noreferrer noopener">Website</a>}
                    {h.phone && <a className="textlink" href={`tel:${h.phone}`}>{h.phone}</a>}
                    <a className="textlink" target="_blank" rel="noreferrer noopener" href={`https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lon}#map=16/${h.lat}/${h.lon}`}>Map</a>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </State>
    </>
  );
}

export function Weather() {
  const airports = useAirports();
  const [code, setCode] = useAirportParam();
  const s = useAsync(() => api(`/weather?airport=${code}`), [code]);
  return (
    <>
      <PageHeader title="Weather" sub="Airport weather from Open-Meteo." badge="LIVE"><AirportSelect airports={airports} value={code} onChange={setCode} /></PageHeader>
      <State s={s} strict>
        {(w) => (
          <div className="stack">
            <Card title={`${w.airport.city} (${w.airport.iata})`}>
              <div className="wx-now">
                <WeatherIcon code={w.current.code} size={64} />
                <div><div className="temp">{w.current.tempC}°C</div><b>{w.current.condition}</b></div>
                <dl className="dl one">
                  <div><dt>Wind</dt><dd>{w.current.windKmh} km/h</dd></div>
                  <div><dt>Visibility</dt><dd>{w.current.visibilityKm != null ? `${w.current.visibilityKm} km` : '—'}</dd></div>
                  <div><dt>Humidity</dt><dd>{w.current.humidity}%</dd></div>
                </dl>
              </div>
            </Card>
            <Card title="7-day forecast">
              <div className="forecast">{w.forecast.map((d) => <div key={d.date}><small>{fmtDate(d.date)}</small><WeatherIcon code={d.code} size={28} /><b>{d.maxC}°</b><small>{d.minC}°</small></div>)}</div>
            </Card>
            <p className="notice">{w.note}</p>
          </div>
        )}
      </State>
    </>
  );
}
