import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { Search, LocateFixed, Layers, Plus, Minus, Maximize2, Radar } from 'lucide-react';
import { api, REFRESH_SECONDS } from '../api.js';
import { useAirports, usePoll } from '../hooks.js';
import { State } from './ui.jsx';

const PLANE = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" fill="currentColor"/></svg>';
const TILES = [
  { name: 'Dark', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' },
  { name: 'Street', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
];
const fmtAlt = (a) => (a == null ? '—' : a === 0 ? 'Ground' : `${a.toLocaleString()} ft`);

export default function Airspace({ compact = false, trip, onCount }) {
  const nav = useNavigate();
  const airports = useAirports();
  const [code, setCode] = useState('MAA');
  const [radius, setRadius] = useState(150);
  const [sel, setSel] = useState(null);
  const [tile, setTile] = useState(0);
  const [tilesFailed, setTilesFailed] = useState(false);
  const tileIdx = useRef(0);
  const tileStats = useRef({ ok: 0, err: 0 });
  const [find, setFind] = useState(null); // null = closed
  const [note, setNote] = useState('');
  const div = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const tileLayer = useRef(null);
  const ap = airports.find((a) => a.iata === code) || { lat: 12.9941, lon: 80.1709, city: 'Chennai', iata: 'MAA' };

  const live = usePoll(() => api(`/live/aircraft?lat=${ap.lat}&lon=${ap.lon}&radius=${radius}`), REFRESH_SECONDS, [ap.lat, ap.lon, radius]);
  const list = live.data?.aircraft || [];
  const dataStatus = live.data?.status || (live.status === 'error' ? 'OFFLINE' : live.status === 'loading' ? 'CONNECTING' : 'LIVE');
  useEffect(() => { onCount?.(live.status === 'error' && !list.length ? null : list.length); }, [list.length, live.status]); // eslint-disable-line

  useEffect(() => {
    const m = L.map(div.current, { zoomControl: false, attributionControl: true, worldCopyJump: true }).setView([ap.lat, ap.lon], compact ? 6 : 7);
    const tl = L.tileLayer(TILES[0].url, { maxZoom: 12, attribution: '© OpenStreetMap · © CARTO · ADS-B: airplanes.live' }).addTo(m);
    // If the first provider never delivers a tile (blocked network, ad-blocker, outage) fall back to the next one,
    // and if every provider fails show a visible message instead of an empty panel.
    tl.on('tileload', () => { tileStats.current.ok += 1; setTilesFailed(false); });
    tl.on('tileerror', () => {
      const st = tileStats.current;
      st.err += 1;
      if (st.ok === 0 && st.err >= 3) {
        st.err = 0;
        if (tileIdx.current < TILES.length - 1) setTile(tileIdx.current + 1);
        else setTilesFailed(true);
      }
    });
    tileLayer.current = tl;
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    setTimeout(() => m.invalidateSize(), 200);
    return () => m.remove();
  }, []); // eslint-disable-line

  useEffect(() => { map.current?.setView([ap.lat, ap.lon], compact ? 6 : 7); }, [ap.lat, ap.lon]); // eslint-disable-line
  useEffect(() => {
    tileIdx.current = tile;
    tileStats.current = { ok: 0, err: 0 };
    setTilesFailed(false);
    tileLayer.current?.setUrl(TILES[tile].url);
  }, [tile]);

  // draw aircraft, airports, selection track and the passenger's trip route
  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    airports.forEach((a) => {
      L.circleMarker([a.lat, a.lon], { radius: a.iata === code ? 6 : 4, color: '#168FFF', weight: 2, fillColor: '#061B38', fillOpacity: 1 })
        .bindTooltip(`${a.iata} · ${a.city}`, { permanent: a.iata === code, direction: 'right', className: 'ap-tip' }).addTo(g);
    });
    if (trip) {
      const pts = trip.route.map((c) => airports.find((a) => a.iata === c)).filter(Boolean).map((a) => [a.lat, a.lon]);
      if (pts.length > 1) L.polyline(pts, { color: '#6fb1ff', weight: 2, dashArray: '6 8', opacity: 0.9 }).bindTooltip('Your trip (user data)').addTo(g);
    }
    list.forEach((a) => {
      const on = sel?.hex === a.hex;
      const icon = L.divIcon({
        className: 'ac-icon', iconSize: [22, 22], iconAnchor: [11, 11],
        html: `<div style="transform:rotate(${a.track ?? 0}deg);color:${on ? '#168FFF' : a.onGround ? '#7b8da8' : '#eaf3ff'};filter:${on ? 'drop-shadow(0 0 6px #168FFF)' : 'none'}">${PLANE}</div>`,
      });
      L.marker([a.lat, a.lon], { icon, keyboard: false }).on('click', () => setSel(a))
        .bindTooltip(`${a.callsign} · ${a.type} · ${fmtAlt(a.altFt)}`).addTo(g);
    });
    if (sel && sel.track != null) {
      const live1 = list.find((x) => x.hex === sel.hex) || sel;
      const r = (live1.track * Math.PI) / 180;
      const d = 0.6;
      L.polyline([[live1.lat, live1.lon], [live1.lat + d * Math.cos(r), live1.lon + (d * Math.sin(r)) / Math.cos((live1.lat * Math.PI) / 180)]], { color: '#168FFF', weight: 2, dashArray: '4 6' }).bindTooltip('Projected track').addTo(g);
    }
  }, [list, airports, sel, code, trip]); // eslint-disable-line

  const fly = (a) => { setSel(a); map.current?.flyTo([a.lat, a.lon], Math.max(map.current.getZoom(), 8), { duration: 0.8 }); };
  const locate = () => {
    if (!navigator.geolocation) return setNote('Location is not available in this browser');
    navigator.geolocation.getCurrentPosition(
      (p) => { map.current.flyTo([p.coords.latitude, p.coords.longitude], 9); L.circleMarker([p.coords.latitude, p.coords.longitude], { radius: 7, color: '#fff', fillColor: '#168FFF', fillOpacity: 1 }).addTo(map.current).bindTooltip('You'); setNote(''); },
      () => setNote('Location permission denied'),
    );
  };
  const doFind = (e) => {
    e.preventDefault();
    const q = (find || '').trim().toUpperCase();
    if (!q) return;
    const a = airports.find((x) => x.iata === q || x.city.toUpperCase() === q);
    const c = list.find((x) => x.callsign.toUpperCase().includes(q) || x.registration?.toUpperCase() === q);
    if (a) { setCode(a.iata); setNote(''); setFind(null); } else if (c) { fly(c); setNote(''); setFind(null); } else setNote(`No airport or aircraft matches “${q}”`);
  };

  const rows = useMemo(() => (compact ? list.slice(0, 5) : list.slice(0, 60)), [list, compact]);
  const statusText = dataStatus === 'LAST_KNOWN' ? 'Last known' : dataStatus === 'OFFLINE' ? 'Offline' : dataStatus === 'DELAYED' ? 'Delayed' : live.status === 'loading' ? 'Connecting' : 'Live';

  return (
    <section className={`airspace card ${compact ? 'compact' : ''}`} aria-label="Live Airspace">
      <header className="card-h">
        <h2><Radar size={24} className="blue" /> Live Airspace</h2>
        <div className="row gap">
          {!compact && (
            <>
              <select aria-label="Airport" value={code} onChange={(e) => setCode(e.target.value)}>{airports.map((a) => <option key={a.iata} value={a.iata}>{a.iata}</option>)}</select>
              <select aria-label="Radius" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>{[50, 100, 150, 250].map((r) => <option key={r} value={r}>{r} nm</option>)}</select>
            </>
          )}
          <span className={`livedot ${dataStatus === 'OFFLINE' ? 'off' : dataStatus === 'LAST_KNOWN' || live.status === 'loading' ? 'wait' : ''}`}>● {statusText}{live.data?.lastSuccessfulAt ? ` · ${new Date(live.data.lastSuccessfulAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
          {compact && <button className="icon-btn" onClick={() => nav('/airspace')} aria-label="Expand Live Airspace"><Maximize2 size={18} /></button>}
        </div>
      </header>
      <div className="mapwrap">
        <div ref={div} className="map" role="application" aria-label="Interactive map of live aircraft" />
        <div className="mapctl">
          <button onClick={() => setFind(find === null ? '' : null)} aria-label="Search airport or callsign"><Search size={17} /></button>
          <button onClick={locate} aria-label="Show my location"><LocateFixed size={17} /></button>
          <button onClick={() => setTile((tile + 1) % TILES.length)} aria-label={`Map layer: ${TILES[tile].name}. Switch`}><Layers size={17} /></button>
          <button onClick={() => map.current?.zoomIn()} aria-label="Zoom in"><Plus size={17} /></button>
          <button onClick={() => map.current?.zoomOut()} aria-label="Zoom out"><Minus size={17} /></button>
        </div>
        {find !== null && (
          <form className="mapfind" onSubmit={doFind}>
            <input autoFocus value={find} onChange={(e) => setFind(e.target.value)} placeholder="Airport code or callsign" aria-label="Airport code or callsign" maxLength={12} />
          </form>
        )}
        {dataStatus === 'LAST_KNOWN' && <div className="mapmsg" role="status">Live ADS-B is temporarily delayed. Showing the latest cached aircraft positions. <button className="btn ghost sm" onClick={live.reload}>Retry</button></div>}
        {dataStatus === 'OFFLINE' && <div className="mapmsg" role="alert">Live aircraft data is currently unavailable. The map remains available. <button className="btn ghost sm" onClick={live.reload}>Retry</button></div>}
        {live.status === 'ok' && list.length === 0 && <div className="mapmsg">No aircraft data available in this area.</div>}
        {tilesFailed && <div className="mapmsg tiles" role="alert">Map background could not be loaded. Check your connection or ad-blocker (blocked: basemaps.cartocdn.com, tile.openstreetmap.org). Aircraft and airports are still shown. <button className="btn ghost sm" onClick={() => { setTile(0); tileLayer.current?.redraw(); }}>Retry</button></div>}
        {note && <div className="mapnote" role="status">{note}</div>}
      </div>
      <div className="tablewrap">
        <State s={{ ...live, status: list.length ? 'ok' : live.status, data: { ...(live.data || {}), aircraft: list } }} isEmpty={(d) => !d?.aircraft?.length} empty="No aircraft currently visible in this area.">
          {() => (
            <table className="actable">
              <thead><tr><th>CALLSIGN</th><th>TYPE</th><th>ALTITUDE</th><th>SPEED</th><th>ROUTE</th></tr></thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.hex} className={sel?.hex === a.hex ? 'on' : ''} onClick={() => fly(a)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && fly(a)}>
                    <td><b>{a.callsign}</b></td><td>{a.type}</td><td>{fmtAlt(a.altFt)}</td><td>{a.speedKt != null ? `${a.speedKt} kt` : '—'}</td>
                    <td title="Route data is not part of the ADS-B feed">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </State>
      </div>
    </section>
  );
}
