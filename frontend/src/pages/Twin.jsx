import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Map, Layers, Satellite, Compass, LocateFixed, Search, Building2, Plane, Navigation, Shield, Users, Luggage, Coffee, PhoneCall, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../api.js';
import { useAsync, useAirports } from '../hooks.js';
import { Card, PageHeader, State, SourceBadge } from '../components/ui.jsx';
import TwinMap, { TYPE_COLOR, TYPE_LABEL } from '../components/TwinMap.jsx';
import AirportGeoMap from '../components/AirportGeoMap.jsx';

const VIEW_TABS = [
  ['real', 'Real Map', Map],
  ['blueprint', 'Blueprint', Building2],
  ['satellite', 'Satellite', Satellite]
];

export default function Twin() {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const airports = useAirports();

  const currentCode = (sp.get('airport') || 'MAA').toUpperCase();
  const [viewTab, setViewTab] = useState('real');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchErr, setSearchErr] = useState('');
  const [layers, setLayers] = useState(new Set(Object.keys(TYPE_LABEL)));
  const [selId, setSelId] = useState(null);
  const [userLoc, setUserLoc] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState('');

  // Fetch Airport Twin data
  const s = useAsync(() => api(`/airport/twin?airport=${currentCode}`), [currentCode]);
  const trip = useAsync(() => api('/trip'));

  const toggleLayer = (k) => {
    const n = new Set(layers);
    n.has(k) ? n.delete(k) : n.add(k);
    setLayers(n);
  };

  const handleAirportSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearchErr('');
    try {
      const res = await api(`/airports?q=${encodeURIComponent(q)}`);
      if (res.airports && res.airports.length > 0) {
        const found = res.airports[0];
        setSp({ airport: found.iata });
        setSearchQuery('');
        setSelId(null);
      } else {
        setSearchErr(`No airport matching "${q}". Try: Chennai, MAA, VOMM, Delhi, BLR.`);
      }
    } catch {
      setSearchErr('Failed to search airport.');
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      return setLocErr('Geolocation is not supported by your browser.');
    }
    setLocating(true);
    setLocErr('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const nearest = await api(`/airports/nearest?lat=${latitude}&lon=${longitude}`);
          setUserLoc({
            lat: latitude,
            lon: longitude,
            distance_km: nearest.distance_km,
            nearest_name: nearest.airport_name,
            nearest_iata: nearest.iata,
            nearest_icao: nearest.icao
          });
          // Switch to the nearest airport
          if (nearest.iata) {
            setSp({ airport: nearest.iata });
          }
        } catch {
          setLocErr('Could not calculate nearest airport.');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocErr('LOCATION PERMISSION REQUIRED — Please enable location in your browser settings.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const t = trip.data;
  const hl = t ? { [t.connection.arrivalGate]: { color: '#4fd1a5', text: 'ARRIVAL' }, [t.connection.departureGate]: { color: '#ffb020', text: 'CONNECTING' } } : {};

  return (
    <>
      <PageHeader
        title="Airport Digital Twin"
        sub="Geographic airport infrastructure, terminal blueprints and facility navigation."
        badge={viewTab === 'real' ? 'OPENSTREETMAP' : viewTab === 'satellite' ? 'OFFICIAL' : 'ESTIMATED'}
      >
        <div className="row gap">
          <button
            type="button"
            className="btn ghost sm"
            onClick={handleLocateMe}
            disabled={locating}
            title="Detect nearest airport via GPS"
          >
            <LocateFixed size={16} /> {locating ? 'Locating…' : 'Locate Me'}
          </button>
        </div>
      </PageHeader>

      <State s={s}>
        {(twin) => {
          const bp = twin.blueprint || twin;
          const pois = bp.pois || [];
          const selPoi = pois.find((p) => p.id === selId);

          return (
            <div className="stack">
              {/* Airport Bar & Mode Switcher */}
              <div className="card twin-header-bar">
                <div className="twin-top-row">
                  <div className="twin-airport-title">
                    <div className="ap-code-badge">{twin.iata}</div>
                    <div>
                      <h2>{twin.name}</h2>
                      <p className="muted small">
                        ICAO: <b>{twin.icao}</b> · {twin.city}, {twin.country} · Elev: {twin.elevation_ft} ft
                      </p>
                    </div>
                  </div>

                  {/* Search Airport Form */}
                  <form className="twin-search-form" onSubmit={handleAirportSearch}>
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search airport (e.g. Chennai, VOMM, DEL)..."
                      maxLength={40}
                    />
                    <button type="submit" className="btn ghost sm" aria-label="Search Airport">
                      <Search size={16} />
                    </button>
                  </form>

                  {/* Airport Select Dropdown */}
                  <div className="field inline ap-quick-select">
                    <select
                      value={twin.iata}
                      onChange={(e) => {
                        setSp({ airport: e.target.value });
                        setSelId(null);
                      }}
                    >
                      {airports.map((a) => (
                        <option key={a.iata} value={a.iata}>
                          {a.iata} - {a.city} ({a.icao || a.iata})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {searchErr && <p className="form-err">{searchErr}</p>}
                {locErr && <p className="notice warn"><AlertCircle size={16} /> {locErr}</p>}
                {userLoc && (
                  <p className="notice ok">
                    <b>YOUR LOCATION DETECTED:</b> {userLoc.distance_km} km to {userLoc.nearest_name} ({userLoc.nearest_iata} / {userLoc.nearest_icao}).
                  </p>
                )}

                {/* 3 View Mode Switch Tabs */}
                <div className="twin-view-tabs" role="tablist">
                  {VIEW_TABS.map(([k, label, Icon]) => (
                    <button
                      key={k}
                      role="tab"
                      aria-selected={viewTab === k}
                      className={`twin-view-btn ${viewTab === k ? 'on' : ''}`}
                      onClick={() => setViewTab(k)}
                    >
                      <Icon size={18} /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* View 1: REAL MAP & View 3: SATELLITE MAP */}
              {(viewTab === 'real' || viewTab === 'satellite') && (
                <Card title={viewTab === 'real' ? 'Real Airport Map (OpenStreetMap Geographic)' : 'Aerial Satellite View'} right={<SourceBadge kind={viewTab === 'real' ? 'OPENSTREETMAP' : 'LIVE'} />}>
                  <AirportGeoMap
                    airportData={twin}
                    mode={viewTab}
                    userLocation={userLoc}
                    onLocate={handleLocateMe}
                    locating={locating}
                    onSelectTerminal={(term) => {
                      setViewTab('blueprint');
                    }}
                  />
                  <div className="row gap wrap between muted small" style={{ marginTop: 12 }}>
                    <span>Active Runways: {twin.runways ? twin.runways.map((r) => `${r.name} (${r.length_m}m)`).join(', ') : 'Primary runway'}</span>
                    <span>Terminals: {twin.terminals ? twin.terminals.map((t) => t.name).join(' · ') : 'Integrated'}</span>
                  </div>
                </Card>
              )}

              {/* View 2: BLUEPRINT MODE */}
              {viewTab === 'blueprint' && (
                <>
                  <div className="chips" role="group" aria-label="Blueprint layers">
                    {Object.entries(TYPE_LABEL).map(([k, l]) => (
                      <button
                        key={k}
                        className={`chipbtn ${layers.has(k) ? 'on' : ''}`}
                        onClick={() => toggleLayer(k)}
                        aria-pressed={layers.has(k)}
                      >
                        <i style={{ background: TYPE_COLOR[k] }} />
                        {l}
                      </button>
                    ))}
                  </div>

                  <Card title={`Terminal Concourse Blueprint — ${twin.name} (${twin.iata})`} right={<SourceBadge kind="ESTIMATED" />}>
                    <TwinMap
                      twin={bp}
                      layers={layers}
                      highlight={hl}
                      selected={selId}
                      onSelect={(p) => setSelId(p.id)}
                    />
                    <p className="notice" style={{ marginTop: 12 }}>
                      {bp.note || 'Terminal blueprint schematic (estimate). Indoor positioning and walking paths are approximations and do not claim live GPS accuracy.'}
                    </p>
                  </Card>
                </>
              )}

              {/* Selected POI Details Card */}
              {selPoi && (
                <Card
                  title={`${selPoi.label} (${selPoi.terminal || 'Concourse'})`}
                  right={
                    <button
                      className="btn primary"
                      onClick={() => nav(`/gate-navigation?airport=${twin.iata}&to=${selPoi.id}`)}
                    >
                      Navigate here <ArrowRight size={16} />
                    </button>
                  }
                >
                  <p className="muted">
                    Category: <b>{TYPE_LABEL[selPoi.type] || selPoi.type}</b> · Terminal: <b>{selPoi.terminal || 'Central Spine'}</b> · Schematic Location: ({selPoi.x}, {selPoi.y})
                  </p>
                </Card>
              )}
            </div>
          );
        }}
      </State>
    </>
  );
}
