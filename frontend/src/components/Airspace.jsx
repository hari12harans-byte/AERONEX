import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { Search, LocateFixed, Plus, Minus, Maximize2, Radar } from 'lucide-react';
import { api, REFRESH_SECONDS } from '../api.js';
import { useAirports, usePoll } from '../hooks.js';
import { State } from './ui.jsx';

const PLANE = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" fill="currentColor"/></svg>';
const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR = '&copy; OpenStreetMap contributors · ADS-B: airplanes.live';
const fmtAlt = (a) => (a == null ? '—' : a === 0 ? 'Ground' : `${a.toLocaleString()} ft`);

export default function Airspace({ compact = false, trip, onCount }) {
  const nav = useNavigate();
  const airports = useAirports();
  const [code, setCode] = useState('MAA');
  const [radius, setRadius] = useState(150);
  const [sel, setSel] = useState(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const tileStats = useRef({ ok: 0, err: 0 });
  const [find, setFind] = useState(null); // null = closed
  const [note, setNote] = useState('');
  const div = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const tileLayer = useRef(null);
  const userMarkerRef = useRef(null);
  const ap = airports.find((a) => a.iata === code) || { lat: 12.9941, lon: 80.1709, city: 'Chennai', iata: 'MAA', name: 'Chennai International Airport' };

  const live = usePoll(() => api(`/live/aircraft?lat=${ap.lat}&lon=${ap.lon}&radius=${radius}`), REFRESH_SECONDS, [ap.lat, ap.lon, radius]);
  const list = live.data?.aircraft || [];
  const dataStatus = live.data?.status || (live.status === 'error' ? 'OFFLINE' : live.status === 'loading' ? 'CONNECTING' : 'LIVE');
  useEffect(() => { onCount?.(live.status === 'error' && !list.length ? null : list.length); }, [list.length, live.status]); // eslint-disable-line

  // Initialize Leaflet Map with OpenStreetMap as primary basemap
  useEffect(() => {
    if (!div.current) return;
    const m = L.map(div.current, { zoomControl: false, attributionControl: true, worldCopyJump: true }).setView([ap.lat, ap.lon], compact ? 6 : 7);
    
    const tl = L.tileLayer(OSM_URL, {
      maxZoom: 19,
      attribution: OSM_ATTR,
    }).addTo(m);

    tl.on('tileload', () => {
      tileStats.current.ok += 1;
      setTilesFailed(false);
    });
    tl.on('tileerror', () => {
      const st = tileStats.current;
      st.err += 1;
      if (st.ok === 0 && st.err >= 4) {
        setTilesFailed(true);
      }
    });

    tileLayer.current = tl;
    layer.current = L.layerGroup().addTo(m);
    map.current = m;

    const invalidate = () => m.invalidateSize();
    const timer = setTimeout(invalidate, 200);
    window.addEventListener('resize', invalidate);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', invalidate);
      m.remove();
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    map.current?.setView([ap.lat, ap.lon], compact ? 6 : 7);
    map.current?.invalidateSize();
  }, [ap.lat, ap.lon, compact]);

  // Draw aircraft, airports, selection track and the passenger's trip route
  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();

    // 1. Airports
    airports.forEach((a) => {
      const isSelected = a.iata === code;
      L.circleMarker([a.lat, a.lon], {
        radius: isSelected ? 7 : 4,
        color: '#168FFF',
        weight: 2,
        fillColor: isSelected ? '#168FFF' : '#061B38',
        fillOpacity: 1,
      })
        .bindTooltip(`${a.iata} · ${a.city}`, { permanent: isSelected, direction: 'right', className: 'ap-tip' })
        .addTo(g);
    });

    // 2. Trip route
    if (trip) {
      const pts = trip.route.map((c) => airports.find((a) => a.iata === c)).filter(Boolean).map((a) => [a.lat, a.lon]);
      if (pts.length > 1) {
        L.polyline(pts, { color: '#6fb1ff', weight: 2, dashArray: '6 8', opacity: 0.9 })
          .bindTooltip('Your trip (user data)')
          .addTo(g);
      }
    }

    // 3. Aircraft markers
    list.forEach((a) => {
      const on = sel?.hex === a.hex;
      const icon = L.divIcon({
        className: 'ac-icon',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        html: `<div style="transform:rotate(${a.track ?? 0}deg);color:${on ? '#168FFF' : a.onGround ? '#7b8da8' : '#eaf3ff'};filter:${on ? 'drop-shadow(0 0 6px #168FFF)' : 'none'}">${PLANE}</div>`,
      });
      L.marker([a.lat, a.lon], { icon, keyboard: false })
        .on('click', () => setSel(a))
        .bindTooltip(`${a.callsign} · ${a.type} · ${fmtAlt(a.altFt)}`)
        .addTo(g);
    });

    // 4. Projected track
    if (sel && sel.track != null) {
      const live1 = list.find((x) => x.hex === sel.hex) || sel;
      const r = (live1.track * Math.PI) / 180;
      const d = 0.6;
      L.polyline([[live1.lat, live1.lon], [live1.lat + d * Math.cos(r), live1.lon + (d * Math.sin(r)) / Math.cos((live1.lat * Math.PI) / 180)]], {
        color: '#168FFF',
        weight: 2,
        dashArray: '4 6',
      })
        .bindTooltip('Projected track')
        .addTo(g);
    }
  }, [list, airports, sel, code, trip]);

  const fly = (a) => {
    setSel(a);
    map.current?.flyTo([a.lat, a.lon], Math.max(map.current.getZoom(), 8), { duration: 0.8 });
  };

  const locate = () => {
    if (!navigator.geolocation) return setNote('Location is not available in this browser');
    setNote('Acquiring your location...');
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const { latitude, longitude } = p.coords;
        try {
          const res = await api(`/airports/nearest?lat=${latitude}&lon=${longitude}`);
          const apName = res?.airport_name || res?.nearest?.name || 'Nearest Airport';
          const iata = res?.iata || res?.nearest?.iata || 'MAA';
          const dist = res?.distance_km ?? res?.nearest?.distanceKm ?? 0;

          if (userMarkerRef.current && map.current) {
            map.current.removeLayer(userMarkerRef.current);
          }

          if (map.current) {
            const uMarker = L.circleMarker([latitude, longitude], {
              radius: 9,
              color: '#ffffff',
              weight: 3,
              fillColor: '#168FFF',
              fillOpacity: 1,
            }).addTo(map.current);

            uMarker.bindPopup(
              `<div style="color:#061b38;font-family:sans-serif;font-size:13px;line-height:1.4;">
                <b style="color:#087ef5;">YOU ARE HERE</b><br/>
                Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}<br/>
                <hr style="margin:4px 0;border:0;border-top:1px solid #ddd;"/>
                <b>NEAREST AIRPORT:</b> ${apName} (${iata})<br/>
                Distance: ${dist} km
              </div>`
            ).openPopup();

            userMarkerRef.current = uMarker;
            map.current.flyTo([latitude, longitude], 9);
          }

          if (iata) setCode(iata);
          setNote(`YOU ARE HERE · NEAREST AIRPORT: ${apName} (${iata}) · ${dist} km away`);
        } catch {
          if (map.current) {
            map.current.flyTo([latitude, longitude], 9);
            L.circleMarker([latitude, longitude], { radius: 7, color: '#fff', fillColor: '#168FFF', fillOpacity: 1 })
              .addTo(map.current)
              .bindTooltip('YOU ARE HERE')
              .openTooltip();
          }
          setNote(`YOU ARE HERE · Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
        }
      },
      (err) => setNote(err.code === 1 ? 'Location permission denied by browser' : 'Unable to acquire location'),
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const doFind = (e) => {
    e.preventDefault();
    const q = (find || '').trim().toUpperCase();
    if (!q) return;
    const a = airports.find((x) => x.iata === q || x.city.toUpperCase() === q);
    const c = list.find((x) => x.callsign.toUpperCase().includes(q) || x.registration?.toUpperCase() === q);
    if (a) {
      setCode(a.iata);
      setNote('');
      setFind(null);
    } else if (c) {
      fly(c);
      setNote('');
      setFind(null);
    } else {
      setNote(`No airport or aircraft matches “${q}”`);
    }
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
              <select aria-label="Airport" value={code} onChange={(e) => setCode(e.target.value)}>
                {airports.map((a) => <option key={a.iata} value={a.iata}>{a.iata} - {a.city}</option>)}
              </select>
              <select aria-label="Radius" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
                {[50, 100, 150, 250].map((r) => <option key={r} value={r}>{r} nm</option>)}
              </select>
            </>
          )}
          <span className={`livedot ${dataStatus === 'OFFLINE' ? 'off' : dataStatus === 'LAST_KNOWN' || live.status === 'loading' ? 'wait' : ''}`}>
            ● {statusText}{live.data?.lastSuccessfulAt ? ` · ${new Date(live.data.lastSuccessfulAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </span>
          {compact && <button className="icon-btn" onClick={() => nav('/airspace')} aria-label="Expand Live Airspace"><Maximize2 size={18} /></button>}
        </div>
      </header>
      <div className="mapwrap">
        <div ref={div} className="map aeronex-map" role="application" aria-label="Interactive map of live aircraft with OpenStreetMap" />
        <div className="mapctl">
          <button onClick={() => setFind(find === null ? '' : null)} aria-label="Search airport or callsign" title="Search"><Search size={17} /></button>
          <button onClick={locate} aria-label="Show my location" title="Locate Me (Nearest Airport)"><LocateFixed size={17} /></button>
          <button onClick={() => map.current?.zoomIn()} aria-label="Zoom in" title="Zoom in"><Plus size={17} /></button>
          <button onClick={() => map.current?.zoomOut()} aria-label="Zoom out" title="Zoom out"><Minus size={17} /></button>
        </div>
        {find !== null && (
          <form className="mapfind" onSubmit={doFind}>
            <input autoFocus value={find} onChange={(e) => setFind(e.target.value)} placeholder="Airport code or callsign" aria-label="Airport code or callsign" maxLength={12} />
          </form>
        )}
        {dataStatus === 'LAST_KNOWN' && (
          <div className="mapmsg" role="status">
            Live ADS-B is temporarily delayed. Showing latest cached aircraft positions.
            <button className="btn ghost sm" onClick={live.reload}>Retry</button>
          </div>
        )}
        {dataStatus === 'OFFLINE' && (
          <div className="mapmsg" role="alert">
            AIRCRAFT DATA UNAVAILABLE. The OpenStreetMap basemap remains active.
            <button className="btn ghost sm" onClick={live.reload}>Retry</button>
          </div>
        )}
        {live.status === 'ok' && list.length === 0 && <div className="mapmsg">No aircraft currently in this {radius} nm sector.</div>}
        {tilesFailed && (
          <div className="mapmsg tiles" role="alert">
            Map tiles temporarily unavailable. Airport markers and aircraft data remain active.
            <button className="btn ghost sm" onClick={() => { setTilesFailed(false); tileLayer.current?.redraw(); }}>Retry</button>
          </div>
        )}
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
