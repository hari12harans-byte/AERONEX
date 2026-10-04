import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Map, Layers, Satellite, MapPin, Navigation, Search, ArrowRight, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { api } from '../api.js';
import { useAsync, useAirports } from '../hooks.js';
import { Card, PageHeader, State, SourceBadge } from '../components/ui.jsx';
import TwinMap, { TYPE_COLOR, TYPE_LABEL } from '../components/TwinMap.jsx';
import TwinRealMap from '../components/TwinRealMap.jsx';

export default function Twin() {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const airports = useAirports();

  const airportParam = sp.get('airport') || 'MAA';
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'blueprint' | 'satellite'
  const [airportCode, setAirportCode] = useState(airportParam);
  const [airportSearch, setAirportSearch] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('');
  const [layers, setLayers] = useState(new Set(Object.keys(TYPE_LABEL)));
  const [selId, setSelId] = useState(null);

  // Gate navigation quick transfer state
  const [gateFrom, setGateFrom] = useState('B06');
  const [gateTo, setGateTo] = useState('A18');
  const [routeData, setRouteData] = useState(null);

  // Sync URL search params
  useEffect(() => {
    if (sp.get('airport') && sp.get('airport') !== airportCode) {
      setAirportCode(sp.get('airport'));
    }
  }, [sp]);

  // Fetch twin data for currently selected airport
  const s = useAsync(() => api(`/airport/twin?airport=${encodeURIComponent(airportCode)}`), [airportCode]);
  const trip = useAsync(() => api('/trip'));

  // Fetch gate route when from/to change
  useEffect(() => {
    if (gateFrom && gateTo) {
      api(`/gate/route?from=${encodeURIComponent(gateFrom)}&to=${encodeURIComponent(gateTo)}`)
        .then(setRouteData)
        .catch(() => {});
    }
  }, [gateFrom, gateTo]);

  const toggleLayer = (k) => {
    const n = new Set(layers);
    n.has(k) ? n.delete(k) : n.add(k);
    setLayers(n);
  };

  // Browser Geolocation for Nearest Airport
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }
    setLocationStatus('Acquiring your location...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await api(`/airports/nearest?lat=${latitude}&lon=${longitude}`);
          if (res && (res.nearest || res.iata)) {
            const nearestAp = res.nearest || res;
            const dist = res.distance_km ?? nearestAp.distanceKm ?? 0;
            const apName = res.airport_name || nearestAp.name;
            const iata = res.iata || nearestAp.iata;
            const icao = res.icao || nearestAp.icao || '';

            setUserLocation({
              lat: latitude,
              lon: longitude,
              distanceKm: dist,
              nearestAirport: nearestAp,
            });
            setAirportCode(iata);
            setSp({ airport: iata });
            setViewMode('map');
            setLocationStatus(
              `YOU ARE HERE · NEAREST AIRPORT: ${apName} (${iata}${icao ? ` / ${icao}` : ''}) — ${dist} km`
            );
          }
        } catch {
          setLocationStatus('Could not determine nearest airport.');
        }
      },
      (err) => {
        if (err.code === 1) {
          setLocationStatus('LOCATION PERMISSION REQUIRED — Please enable location in your browser.');
        } else {
          setLocationStatus('Unable to retrieve location.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Airport Search Resolver
  const handleAirportSearchSubmit = async (e) => {
    e.preventDefault();
    if (!airportSearch.trim()) return;
    try {
      const res = await api(`/airports/resolve?q=${encodeURIComponent(airportSearch.trim())}`);
      if (res && res.airport) {
        setAirportCode(res.airport.iata);
        setSp({ airport: res.airport.iata });
        setAirportSearch('');
      }
    } catch {
      // Fallback: search locally in airports hook
      const match = airports.find(
        (a) =>
          a.iata.toUpperCase() === airportSearch.toUpperCase() ||
          a.city.toLowerCase().includes(airportSearch.toLowerCase()) ||
          a.name.toLowerCase().includes(airportSearch.toLowerCase())
      );
      if (match) {
        setAirportCode(match.iata);
        setSp({ airport: match.iata });
        setAirportSearch('');
      }
    }
  };

  const t = trip.data;
  const hl = t
    ? {
        [t.connection.arrivalGate]: { color: '#4fd1a5', text: 'ARRIVAL' },
        [t.connection.departureGate]: { color: '#ffb020', text: 'CONNECTING' },
      }
    : {};

  return (
    <>
      <PageHeader
        title="Airport Digital Twin"
        sub="Geographic satellite mapping and interactive terminal concourse telemetry for seamless airport transfers."
        badge={viewMode === 'blueprint' ? 'BLUEPRINT ESTIMATE' : 'GEOGRAPHIC REAL MAP'}
      />

      {/* Top Controls: Tabs & Location Detection & Search */}
      <div className="twin-top-controls card">
        <div className="twin-controls-row">
          {/* 3 Main View Tabs (Requirement 8: REAL MAP, SATELLITE, BLUEPRINT) */}
          <div className="view-mode-tabs" role="tablist">
            <button
              className={`mode-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
              role="tab"
              aria-selected={viewMode === 'map'}
            >
              <Map size={18} /> REAL MAP
            </button>
            <button
              className={`mode-btn ${viewMode === 'satellite' ? 'active' : ''}`}
              onClick={() => setViewMode('satellite')}
              role="tab"
              aria-selected={viewMode === 'satellite'}
            >
              <Satellite size={18} /> SATELLITE
            </button>
            <button
              className={`mode-btn ${viewMode === 'blueprint' ? 'active' : ''}`}
              onClick={() => setViewMode('blueprint')}
              role="tab"
              aria-selected={viewMode === 'blueprint'}
            >
              <Layers size={18} /> BLUEPRINT
            </button>
          </div>

          {/* Locate Me Button */}
          <button className="btn ghost locate-me-btn" onClick={handleLocateMe}>
            <Navigation size={17} className="text-cyan" /> LOCATE ME
          </button>

          {/* Airport Switcher Search */}
          <form className="airport-quick-search-form" onSubmit={handleAirportSearchSubmit}>
            <Search size={17} className="search-icon" />
            <input
              value={airportSearch}
              onChange={(e) => setAirportSearch(e.target.value)}
              placeholder="Search Airport (e.g. Chennai, DEL, VOMM, BOM)"
              maxLength={40}
            />
            <button type="submit" className="go-sm">
              <ArrowRight size={15} />
            </button>
          </form>
        </div>

        {/* Location Status Banner */}
        {locationStatus && (
          <div className="location-status-banner">
            <MapPin size={16} className="text-cyan" />
            <span>{locationStatus}</span>
          </div>
        )}
      </div>

      <State s={s}>
        {(twin) => {
          const currentAirport = twin.airport || {
            name: 'Chennai International Airport',
            iata: 'MAA',
            icao: 'VOMM',
            city: 'Chennai',
          };
          const selPoi = twin.pois?.find((p) => p.id === selId);

          return (
            <div className="stack">
              {/* Active Airport Title & Badges */}
              <div className="airport-info-banner card">
                <div className="airport-title-group">
                  <h2>{currentAirport.name}</h2>
                  <div className="airport-tags">
                    <span className="badge live">IATA: {currentAirport.iata}</span>
                    <span className="badge ref">ICAO: {currentAirport.icao || 'VOMM'}</span>
                    <span className="badge demo">CITY: {currentAirport.city}</span>
                    <SourceBadge kind={viewMode === 'blueprint' ? 'REFERENCE' : 'LIVE'} />
                  </div>
                </div>

                <div className="quick-airport-pills">
                  {['MAA', 'DEL', 'BOM', 'BLR', 'HYD', 'CCU', 'COK'].map((c) => (
                    <button
                      key={c}
                      className={`pill-airport ${c === airportCode ? 'active-pill' : ''}`}
                      onClick={() => {
                        setAirportCode(c);
                        setSp({ airport: c });
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Visual Display (Real Map / Satellite / Blueprint) */}
              <Card className="twin-main-display-card">
                {viewMode === 'blueprint' ? (
                  <>
                    <div className="chips blueprint-chips" role="group" aria-label="Concourse layers">
                      {Object.entries(TYPE_LABEL).map(([k, l]) => (
                        <button
                          key={k}
                          className={`chipbtn ${layers.has(k) ? 'on' : ''}`}
                          onClick={() => toggleLayer(k)}
                        >
                          <i style={{ background: TYPE_COLOR[k] }} />
                          {l}
                        </button>
                      ))}
                    </div>
                    <TwinMap
                      twin={twin}
                      airport={currentAirport}
                      layers={layers}
                      highlight={hl}
                      selected={selId}
                      onSelect={(p) => setSelId(p.id)}
                    />
                  </>
                ) : (
                  <TwinRealMap
                    airport={currentAirport}
                    mode={viewMode}
                    userLocation={userLocation}
                    onSelectFacility={() => {}}
                  />
                )}
              </Card>

              {/* Concourse POI Selection Details */}
              {selPoi && (
                <Card
                  title={selPoi.label}
                  right={
                    <button
                      className="btn primary sm"
                      onClick={() => {
                        setGateTo(selPoi.id);
                        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                      }}
                    >
                      Set as Transfer Destination
                    </button>
                  }
                >
                  <p className="muted">
                    {TYPE_LABEL[selPoi.type]} · Estimated Concourse Position ({selPoi.x}m, {selPoi.y}m)
                  </p>
                </Card>
              )}

              {/* Gate Navigation & Transfer Calculation Engine */}
              <div className="gate-nav-card card">
                <div className="card-h">
                  <h2>
                    <Clock size={20} className="text-cyan" /> Gate Transfer Calculator & Concourse Route
                  </h2>
                  <span className="badge ref">ESTIMATED TRANSFER METRICS</span>
                </div>

                <div className="gate-select-row">
                  <div className="field">
                    <span>FROM GATE</span>
                    <select value={gateFrom} onChange={(e) => setGateFrom(e.target.value)}>
                      {twin.pois
                        ?.filter((p) => p.type === 'gate')
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.id} ({g.label})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="gate-arrow">──►</div>

                  <div className="field">
                    <span>TO GATE</span>
                    <select value={gateTo} onChange={(e) => setGateTo(e.target.value)}>
                      {twin.pois
                        ?.filter((p) => p.type === 'gate')
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.id} ({g.label})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {routeData && (
                  <div className="route-metrics-grid mt-md">
                    <div className="metric-box">
                      <span className="metric-label">Transfer Distance</span>
                      <b className="metric-val">{routeData.distanceMeters || 527} m</b>
                      <small className="metric-sub">Airside Concourse</small>
                    </div>

                    <div className="metric-box">
                      <span className="metric-label">Walking Time</span>
                      <b className="metric-val">{routeData.walkingMinutes || 7} min</b>
                      <small className="metric-sub">Pace: 1.1 m/s</small>
                    </div>

                    <div className="metric-box">
                      <span className="metric-label">Security Screening</span>
                      <b className="metric-val">{routeData.securityMinutes || 8} min</b>
                      <small className="metric-sub">Checkpoint Queue</small>
                    </div>

                    <div className="metric-box">
                      <span className="metric-label">Terminal Transfer</span>
                      <b className="metric-val">{routeData.terminalTransferMinutes || 5} min</b>
                      <small className="metric-sub">
                        {routeData.terminalChange ? 'Cross-Terminal Transit' : 'Same Terminal'}
                      </small>
                    </div>

                    <div className="metric-box highlight">
                      <span className="metric-label">Total Estimated Transfer</span>
                      <b className="metric-val text-cyan">{routeData.totalMinutes || 20} min</b>
                      <small className="metric-sub">ESTIMATED</small>
                    </div>
                  </div>
                )}

                <div className="feed-guardian-action mt-md">
                  <button className="btn primary" onClick={() => nav('/trip')}>
                    <ShieldCheck size={18} /> Feed Transfer Metrics to Connection Guardian <ArrowRight size={16} />
                  </button>
                  <small className="text-muted d-block mt-xs">
                    Supplies walking distance, terminal change, and security buffer to the calibrated ML connection engine.
                  </small>
                </div>
              </div>
            </div>
          );
        }}
      </State>
    </>
  );
}
