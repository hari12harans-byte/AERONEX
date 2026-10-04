import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { Search, LocateFixed, Layers, Plus, Minus, Maximize2, Radar, RefreshCw, Crosshair } from 'lucide-react';
import { api, REFRESH_SECONDS } from '../api.js';
import { useAirports } from '../hooks.js';
import { State } from './ui.jsx';

// Official OpenStreetMap tile endpoint - no API key required
const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

// Default Airport: MAA / Chennai International Airport
const DEFAULT_AIRPORT = {
  iata: 'MAA',
  name: 'Chennai International Airport',
  city: 'Chennai',
  lat: 13.0827,
  lon: 80.2707
};

const fmtAlt = (a) => {
  if (a == null || a === 'Unavailable') return 'Unavailable';
  if (a === 0 || a === 'ground') return 'Ground';
  return `${Number(a).toLocaleString()} ft`;
};

// Generates directional SVG icon oriented by heading (0° = North)
function createAircraftSvg(heading = 0, isSelected = false, onGround = false) {
  const fillColor = isSelected ? '#38bdf8' : onGround ? '#94a3b8' : '#ffffff';
  const strokeColor = isSelected ? '#0284c7' : onGround ? '#475569' : '#0284c7';
  const trackDeg = Number(heading) || 0;

  return `
    <div class="ac-marker-svg ${isSelected ? 'selected' : ''}" style="transform: rotate(${trackDeg}deg);">
      <svg viewBox="0 0 32 32" width="28" height="28">
        <!-- Directional aircraft graphic pointing towards top (0 deg) -->
        <path d="M16 2 L18.5 10.5 L29 16.5 L29 19.5 L18.5 16.5 L18.5 25.5 L22.5 28.5 L22.5 30.5 L16 28.5 L9.5 30.5 L9.5 28.5 L13.5 25.5 L13.5 16.5 L3 19.5 L3 16.5 L13.5 10.5 Z"
              fill="${fillColor}"
              stroke="${strokeColor}"
              stroke-width="1.2"
              stroke-linejoin="round"/>
      </svg>
    </div>
  `;
}

// Builds useful popup info matching requirements without invented fields
function createPopupHtml(a) {
  const callsign = a.callsign || 'Unavailable';
  const reg = a.registration || 'Unavailable';
  const type = a.aircraft_type || a.type || 'Unavailable';
  const alt = fmtAlt(a.altitude ?? a.altFt);
  const spd = (a.speed ?? a.spdKt ?? a.speedKt) != null ? `${a.speed ?? a.spdKt ?? a.speedKt} kt` : 'Unavailable';
  const track = (a.heading ?? a.track) != null ? `${Math.round(a.heading ?? a.track)}°` : 'Unavailable';
  const vr = (a.vertical_rate != null) ? `${a.vertical_rate > 0 ? '+' : ''}${Math.round(a.vertical_rate)} ft/min` : 'Unavailable';
  const lat = (a.latitude ?? a.lat) != null ? Number(a.latitude ?? a.lat).toFixed(4) : 'Unavailable';
  const lon = (a.longitude ?? a.lon) != null ? Number(a.longitude ?? a.lon).toFixed(4) : 'Unavailable';
  const squawk = a.squawk || 'Unavailable';
  const lastSeen = a.last_seen || 'Unavailable';
  const source = a.source || 'Airplanes.live';

  return `
    <div class="ac-pop-header">
      <div>
        <div class="ac-pop-callsign">${callsign}</div>
        <div style="font-size: 10.5px; color: #94a3b8;">Reg: <b>${reg}</b></div>
      </div>
      <span class="ac-pop-type">${type}</span>
    </div>
    <div class="ac-pop-grid">
      <div class="ac-pop-item"><span class="ac-pop-lbl">Altitude</span><span class="ac-pop-val">${alt}</span></div>
      <div class="ac-pop-item"><span class="ac-pop-lbl">Speed</span><span class="ac-pop-val">${spd}</span></div>
      <div class="ac-pop-item"><span class="ac-pop-lbl">Heading</span><span class="ac-pop-val">${track}</span></div>
      <div class="ac-pop-item"><span class="ac-pop-lbl">Vert Rate</span><span class="ac-pop-val">${vr}</span></div>
      <div class="ac-pop-item"><span class="ac-pop-lbl">Coordinates</span><span class="ac-pop-val">${lat}, ${lon}</span></div>
      <div class="ac-pop-item"><span class="ac-pop-lbl">Squawk</span><span class="ac-pop-val">${squawk}</span></div>
    </div>
    <div class="ac-pop-footer">
      <span>Seen: ${lastSeen}</span>
      <span>Src: ${source}</span>
    </div>
  `;
}

export default function Airspace({ compact = false, trip, onCount }) {
  const nav = useNavigate();
  const airports = useAirports();

  const [code, setCode] = useState('MAA');
  const [radius, setRadius] = useState(50);
  const [sel, setSel] = useState(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [find, setFind] = useState(null);
  const [note, setNote] = useState('');

  // Layer Visibility Controls
  const [layers, setLayers] = useState({
    aircraft: true,
    airports: true,
    routes: true,
    darkMode: true
  });

  // Aircraft feed data and state
  const [feedState, setFeedState] = useState({
    status: 'connecting', // 'live' | 'degraded' | 'cached' | 'unavailable' | 'connecting'
    aircraft: [],
    source: 'Airplanes.live',
    lastUpdated: null,
    cacheAge: 0,
    airport: DEFAULT_AIRPORT
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nowSec, setNowSec] = useState(Date.now());

  // Leaflet DOM and Layer references
  const div = useRef(null);
  const map = useRef(null);
  const tileLayerRef = useRef(null);
  const aircraftLayerRef = useRef(null);
  const airportLayerRef = useRef(null);
  const routesLayerRef = useRef(null);
  const selectedFlightLayerRef = useRef(null);
  const markersRef = useRef({});

  // Active Airport resolution
  const ap = airports.find((a) => a.iata === code) || DEFAULT_AIRPORT;

  // Clock interval for real dynamic timestamp computation
  useEffect(() => {
    const timer = setInterval(() => setNowSec(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch aircraft data from backend with retry and backoff awareness
  const fetchAirspace = useCallback(async (forceRefresh = false) => {
    setIsRefreshing(true);
    try {
      const q = `/airspace?airport=${encodeURIComponent(code)}&lat=${ap.lat}&lon=${ap.lon}&radius=${radius}${forceRefresh ? '&force=1' : ''}`;
      const data = await api(q);
      setFeedState({
        status: (data.status || 'live').toLowerCase(),
        aircraft: Array.isArray(data.aircraft) ? data.aircraft : [],
        source: data.source || 'Airplanes.live',
        lastUpdated: data.last_updated ? new Date(data.last_updated).getTime() : Date.now(),
        cacheAge: data.cache_age_seconds || 0,
        airport: data.airport || ap
      });
    } catch (err) {
      // Keep existing cache if available, else mark as unavailable
      setFeedState((prev) => ({
        ...prev,
        status: prev.aircraft.length > 0 ? 'cached' : 'unavailable',
        source: 'Airplanes.live (Offline)'
      }));
    } finally {
      setIsRefreshing(false);
    }
  }, [code, ap.lat, ap.lon, radius]); // eslint-disable-line

  // Regular polling interval
  useEffect(() => {
    fetchAirspace(false);
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchAirspace(false);
      }
    }, (REFRESH_SECONDS || 30) * 1000);
    return () => clearInterval(interval);
  }, [fetchAirspace]);

  const list = feedState.aircraft;
  useEffect(() => {
    onCount?.(feedState.status === 'unavailable' && !list.length ? null : list.length);
  }, [list.length, feedState.status, onCount]);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!div.current || map.current) return;

    const initialLat = ap.lat || DEFAULT_AIRPORT.lat;
    const initialLon = ap.lon || DEFAULT_AIRPORT.lon;

    const m = L.map(div.current, {
      zoomControl: false,
      attributionControl: true,
      worldCopyJump: true
    }).setView([initialLat, initialLon], compact ? 6 : 7);

    // Primary OpenStreetMap Tile Layer
    const tl = L.tileLayer(OSM_URL, {
      maxZoom: 18,
      attribution: OSM_ATTRIBUTION
    }).addTo(m);

    let okTiles = 0;
    let errTiles = 0;
    tl.on('tileload', () => {
      okTiles++;
      setTilesFailed(false);
    });
    tl.on('tileerror', () => {
      errTiles++;
      if (okTiles === 0 && errTiles >= 4) {
        setTilesFailed(true);
      }
    });

    tileLayerRef.current = tl;
    routesLayerRef.current = L.layerGroup().addTo(m);
    airportLayerRef.current = L.layerGroup().addTo(m);
    selectedFlightLayerRef.current = L.layerGroup().addTo(m);
    aircraftLayerRef.current = L.layerGroup().addTo(m);

    map.current = m;
    setTimeout(() => m.invalidateSize(), 200);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // eslint-disable-line

  // Pan map when active airport changes
  useEffect(() => {
    if (!map.current) return;
    map.current.setView([ap.lat, ap.lon], compact ? 6 : 7);
  }, [ap.lat, ap.lon, compact]);

  // Update Airport Markers
  useEffect(() => {
    const ag = airportLayerRef.current;
    if (!ag) return;
    ag.clearLayers();

    if (!layers.airports) return;

    airports.forEach((a) => {
      const isSelected = a.iata === code;
      const marker = L.circleMarker([a.lat, a.lon], {
        radius: isSelected ? 7 : 4,
        color: isSelected ? '#38bdf8' : '#168FFF',
        weight: isSelected ? 3 : 1.5,
        fillColor: isSelected ? '#0369a1' : '#061B38',
        fillOpacity: 1
      });
      marker.bindTooltip(`${a.iata} · ${a.city}`, {
        permanent: isSelected,
        direction: 'right',
        className: 'ap-tip'
      });
      marker.on('click', () => setCode(a.iata));
      marker.addTo(ag);
    });
  }, [airports, code, layers.airports]);

  // Update Trip Routes
  useEffect(() => {
    const rg = routesLayerRef.current;
    if (!rg) return;
    rg.clearLayers();

    if (!layers.routes || !trip) return;

    const pts = trip.route
      .map((c) => airports.find((a) => a.iata === c))
      .filter(Boolean)
      .map((a) => [a.lat, a.lon]);

    if (pts.length > 1) {
      L.polyline(pts, {
        color: '#38bdf8',
        weight: 2.5,
        dashArray: '6 8',
        opacity: 0.85
      }).bindTooltip('Your Trip Route').addTo(rg);
    }
  }, [trip, airports, layers.routes]);

  // Update Aircraft Markers Independently (No Map Recreation)
  useEffect(() => {
    const acLayer = aircraftLayerRef.current;
    if (!acLayer) return;

    if (!layers.aircraft || feedState.status === 'unavailable') {
      acLayer.clearLayers();
      markersRef.current = {};
      return;
    }

    const currentHexes = new Set();

    list.forEach((a) => {
      const hex = a.hex || a.callsign;
      if (!hex || hex === 'Unavailable') return;
      currentHexes.add(hex);

      const lat = a.latitude ?? a.lat;
      const lon = a.longitude ?? a.lon;
      if (lat == null || lon == null) return;

      const track = a.heading ?? a.track ?? 0;
      const isSel = sel?.hex === a.hex;
      const onGround = Boolean(a.onGround || a.altitude === 0 || a.altFt === 0);

      const icon = L.divIcon({
        className: 'ac-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        html: createAircraftSvg(track, isSel, onGround)
      });

      const popupHtml = createPopupHtml(a);

      if (markersRef.current[hex]) {
        // Smoothly update existing marker
        const marker = markersRef.current[hex];
        marker.setLatLng([lat, lon]);
        marker.setIcon(icon);
        marker.setPopupContent(popupHtml);
        marker.setTooltipContent(`${a.callsign} · ${a.aircraft_type || a.type || ''} · ${fmtAlt(a.altitude ?? a.altFt)}`);
      } else {
        // Create new marker once
        const marker = L.marker([lat, lon], { icon, keyboard: false });
        marker.bindPopup(popupHtml);
        marker.bindTooltip(`${a.callsign} · ${a.aircraft_type || a.type || ''} · ${fmtAlt(a.altitude ?? a.altFt)}`);
        marker.on('click', () => setSel(a));
        marker.addTo(acLayer);
        markersRef.current[hex] = marker;
      }
    });

    // Remove disappeared aircraft from layer and dictionary
    Object.keys(markersRef.current).forEach((hex) => {
      if (!currentHexes.has(hex)) {
        markersRef.current[hex].remove();
        delete markersRef.current[hex];
      }
    });
  }, [list, layers.aircraft, sel, feedState.status]);

  // Update Selected Flight Projected Track
  useEffect(() => {
    const sg = selectedFlightLayerRef.current;
    if (!sg) return;
    sg.clearLayers();

    if (sel && sel.latitude != null && sel.longitude != null) {
      const liveAc = list.find((x) => x.hex === sel.hex) || sel;
      const trk = liveAc.heading ?? liveAc.track;
      if (trk != null) {
        const rad = (trk * Math.PI) / 180;
        const dist = 0.5;
        const lat = liveAc.latitude ?? liveAc.lat;
        const lon = liveAc.longitude ?? liveAc.lon;
        const latEnd = lat + dist * Math.cos(rad);
        const lonEnd = lon + (dist * Math.sin(rad)) / Math.cos((lat * Math.PI) / 180);

        L.polyline([[lat, lon], [latEnd, lonEnd]], {
          color: '#38bdf8',
          weight: 2,
          dashArray: '4 6'
        }).bindTooltip(`Projected Track: ${Math.round(trk)}°`).addTo(sg);
      }
    }
  }, [sel, list]);

  // Actions
  const flyToAircraft = (a) => {
    setSel(a);
    const lat = a.latitude ?? a.lat;
    const lon = a.longitude ?? a.lon;
    if (lat != null && lon != null) {
      map.current?.flyTo([lat, lon], Math.max(map.current.getZoom(), 8), { duration: 0.8 });
      const hex = a.hex || a.callsign;
      if (markersRef.current[hex]) {
        markersRef.current[hex].openPopup();
      }
    }
  };

  const locateUser = () => {
    if (!navigator.geolocation) return setNote('Geolocation is not available in this browser');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { latitude, longitude } = p.coords;
        map.current?.flyTo([latitude, longitude], 9);
        L.circleMarker([latitude, longitude], {
          radius: 8,
          color: '#ffffff',
          fillColor: '#10b981',
          fillOpacity: 1,
          weight: 3
        }).addTo(map.current).bindTooltip('Your Location').openTooltip();
        setNote('');
      },
      () => setNote('Location permission denied')
    );
  };

  const doFind = (e) => {
    e.preventDefault();
    const q = (find || '').trim().toUpperCase();
    if (!q) return;

    const matchedAirport = airports.find((x) => x.iata === q || x.city.toUpperCase() === q);
    const matchedAc = list.find((x) => x.callsign.toUpperCase().includes(q) || x.registration?.toUpperCase() === q);

    if (matchedAirport) {
      setCode(matchedAirport.iata);
      setNote('');
      setFind(null);
    } else if (matchedAc) {
      flyToAircraft(matchedAc);
      setNote('');
      setFind(null);
    } else {
      setNote(`No airport or aircraft matches “${q}”`);
    }
  };

  const handleRetry = () => {
    fetchAirspace(true);
  };

  const retryTiles = () => {
    setTilesFailed(false);
    tileLayerRef.current?.redraw();
  };

  // Timestamp formatting
  const relativeUpdated = useMemo(() => {
    if (!feedState.lastUpdated) return 'Connecting…';
    const diffSec = Math.max(0, Math.floor((nowSec - feedState.lastUpdated) / 1000));
    if (diffSec < 5) return 'Just now';
    if (diffSec < 60) return `${diffSec} sec ago`;
    const min = Math.floor(diffSec / 60);
    if (min < 60) return `${min} min ago`;
    return `${Math.floor(min / 60)} hr ago`;
  }, [nowSec, feedState.lastUpdated]);

  const rows = useMemo(() => (compact ? list.slice(0, 5) : list.slice(0, 60)), [list, compact]);

  // State-aware live dot and header title
  const statusInfo = useMemo(() => {
    switch (feedState.status) {
      case 'live':
        return {
          title: 'LIVE AIRSPACE',
          badge: '● LIVE ADS-B',
          dotClass: 'live',
          banner: 'Live ADS-B data'
        };
      case 'degraded':
        return {
          title: 'AIRSPACE',
          badge: '● ADS-B DELAYED',
          dotClass: 'degraded',
          banner: 'ADS-B feed delayed — showing latest available aircraft'
        };
      case 'cached':
        return {
          title: 'AIRSPACE',
          badge: '● CACHED AIRCRAFT',
          dotClass: 'cached',
          banner: `Live feed unavailable — showing cached aircraft (${feedState.cacheAge || 0}s old)`
        };
      case 'unavailable':
      default:
        return {
          title: 'AIRSPACE',
          badge: '● AIRSPACE DATA UNAVAILABLE',
          dotClass: 'unavailable',
          banner: 'Aircraft tracking temporarily unavailable'
        };
    }
  }, [feedState.status, feedState.cacheAge]);

  return (
    <section className={`airspace card ${compact ? 'compact' : ''}`} aria-label="Live Airspace">
      <header className="card-h">
        <h2><Radar size={24} className="blue" /> {statusInfo.title}</h2>
        <div className="row gap" style={{ alignItems: 'center' }}>
          {!compact && (
            <>
              <select
                aria-label="Airport"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{ minWidth: 100 }}
              >
                {airports.map((a) => (
                  <option key={a.iata} value={a.iata}>
                    {a.iata} · {a.city}
                  </option>
                ))}
              </select>
              <select
                aria-label="Radius"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              >
                {[50, 100, 150, 250].map((r) => (
                  <option key={r} value={r}>{r} nm</option>
                ))}
              </select>
            </>
          )}

          <span className={`livedot ${statusInfo.dotClass}`} title={feedState.source}>
            {statusInfo.badge}
            <span className="time-ago">
              {feedState.status === 'cached'
                ? ` · Last data: ${relativeUpdated}`
                : ` · ${relativeUpdated}`}
            </span>
          </span>

          <button
            type="button"
            className="icon-btn"
            onClick={handleRetry}
            disabled={isRefreshing}
            title="Retry and refresh live aircraft"
            aria-label="Refresh live aircraft data"
          >
            <RefreshCw size={16} className={isRefreshing ? 'pulse' : ''} />
          </button>

          {compact && (
            <button
              className="icon-btn"
              onClick={() => nav('/airspace')}
              aria-label="Expand Live Airspace"
            >
              <Maximize2 size={18} />
            </button>
          )}
        </div>
      </header>

      <div className={`mapwrap ${layers.darkMode ? 'dark-osm-tiles' : ''}`}>
        <div
          ref={div}
          className="map"
          role="application"
          aria-label="Interactive OpenStreetMap of live airspace"
        />

        {/* Map Control Bar */}
        <div className="mapctl">
          <button
            type="button"
            onClick={() => setFind(find === null ? '' : null)}
            aria-label="Search airport or callsign"
            title="Search airport or aircraft"
          >
            <Search size={17} />
          </button>
          <button
            type="button"
            onClick={locateUser}
            aria-label="Show my location"
            title="Locate me (GPS)"
          >
            <LocateFixed size={17} />
          </button>
          <button
            type="button"
            onClick={() => map.current?.setView([ap.lat, ap.lon], compact ? 6 : 8)}
            aria-label="Center on airport"
            title={`Center on ${code}`}
          >
            <Crosshair size={17} />
          </button>
          <button
            type="button"
            onClick={() => setShowLayers(!showLayers)}
            aria-label="Toggle layer visibility"
            title="Layer controls"
            className={showLayers ? 'active' : ''}
          >
            <Layers size={17} />
          </button>
          <button
            type="button"
            onClick={() => map.current?.zoomIn()}
            aria-label="Zoom in"
          >
            <Plus size={17} />
          </button>
          <button
            type="button"
            onClick={() => map.current?.zoomOut()}
            aria-label="Zoom out"
          >
            <Minus size={17} />
          </button>
        </div>

        {/* Layer Control Panel */}
        {showLayers && (
          <div className="layer-menu" role="menu" aria-label="Map Layer Settings">
            <div className="layer-menu-title">Map Layers</div>
            <label>
              <input
                type="checkbox"
                checked={layers.aircraft}
                onChange={(e) => setLayers({ ...layers, aircraft: e.target.checked })}
              />
              Aircraft ({list.length})
            </label>
            <label>
              <input
                type="checkbox"
                checked={layers.airports}
                onChange={(e) => setLayers({ ...layers, airports: e.target.checked })}
              />
              Airports ({airports.length})
            </label>
            <label>
              <input
                type="checkbox"
                checked={layers.routes}
                onChange={(e) => setLayers({ ...layers, routes: e.target.checked })}
              />
              Flight Routes
            </label>
            <label>
              <input
                type="checkbox"
                checked={layers.darkMode}
                onChange={(e) => setLayers({ ...layers, darkMode: e.target.checked })}
              />
              Dark Radar Style
            </label>
          </div>
        )}

        {/* Airport / Callsign Search */}
        {find !== null && (
          <form className="mapfind" onSubmit={doFind}>
            <input
              autoFocus
              value={find}
              onChange={(e) => setFind(e.target.value)}
              placeholder="Airport code (e.g. DXB, DEL) or Callsign"
              aria-label="Airport code or callsign"
              maxLength={15}
            />
          </form>
        )}

        {/* Status Message Banners */}
        {feedState.status === 'degraded' && (
          <div className="mapmsg" role="status">
            <span>{statusInfo.banner}</span>
            <button className="btn ghost sm" onClick={handleRetry}>Retry</button>
          </div>
        )}

        {feedState.status === 'cached' && (
          <div className="mapmsg" role="status">
            <span>{statusInfo.banner}</span>
            <button className="btn ghost sm" onClick={handleRetry}>Retry</button>
          </div>
        )}

        {feedState.status === 'unavailable' && (
          <div className="mapmsg" role="alert">
            <span>{statusInfo.banner}. The OpenStreetMap base layer remains active.</span>
            <button className="btn ghost sm" onClick={handleRetry}>Retry</button>
          </div>
        )}

        {feedState.status === 'live' && list.length === 0 && (
          <div className="mapmsg" role="status">
            No aircraft currently received near {code} ({radius} nm radius).
          </div>
        )}

        {tilesFailed && (
          <div className="mapmsg tiles" role="alert">
            <span>Map tiles temporarily unavailable</span>
            <button className="btn ghost sm" onClick={retryTiles}>Retry</button>
          </div>
        )}

        {note && <div className="mapnote" role="status">{note}</div>}
      </div>

      {/* Aircraft Table */}
      <div className="tablewrap">
        <State
          s={{
            status: feedState.status === 'unavailable' && !list.length ? 'error' : 'ok',
            error: 'Aircraft tracking temporarily unavailable',
            data: { aircraft: list }
          }}
          isEmpty={(d) => !d?.aircraft?.length}
          empty={`No aircraft currently received near ${code}`}
        >
          {() => (
            <table className="actable">
              <thead>
                <tr>
                  <th>CALLSIGN</th>
                  <th>REG</th>
                  <th>TYPE</th>
                  <th>ALTITUDE</th>
                  <th>SPEED</th>
                  <th>HEADING</th>
                  <th>LAST SEEN</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const isSel = sel?.hex === a.hex;
                  return (
                    <tr
                      key={a.hex || a.callsign}
                      className={isSel ? 'on' : ''}
                      onClick={() => flyToAircraft(a)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && flyToAircraft(a)}
                    >
                      <td><b>{a.callsign || 'Unavailable'}</b></td>
                      <td>{a.registration || 'Unavailable'}</td>
                      <td>{a.aircraft_type || a.type || 'Unavailable'}</td>
                      <td>{fmtAlt(a.altitude ?? a.altFt)}</td>
                      <td>{(a.speed ?? a.spdKt) != null ? `${a.speed ?? a.spdKt} kt` : 'Unavailable'}</td>
                      <td>{(a.heading ?? a.track) != null ? `${Math.round(a.heading ?? a.track)}°` : 'Unavailable'}</td>
                      <td>{a.last_seen || 'Unavailable'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </State>
      </div>
    </section>
  );
}
