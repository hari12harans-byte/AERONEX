import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Layers, LocateFixed, Navigation, Maximize2, Building2, Train, Radio } from 'lucide-react';

const TILE_PROVIDERS = {
  real: {
    name: 'Carto Dark Aviation',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors · © CARTO'
  },
  satellite: {
    name: 'Satellite Aerial Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri · DigitalGlobe, GeoEye, Earthstar Geographics'
  }
};

export default function AirportGeoMap({ airportData, mode = 'real', userLocation, onLocate, locating, onSelectTerminal }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const tileLayerRef = useRef(null);
  const vectorLayerRef = useRef(null);

  const center = airportData?.center || [12.990005, 80.169296];
  const zoom = airportData?.zoom || 14;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: true,
        worldCopyJump: true
      }).setView(center, zoom);

      const provider = TILE_PROVIDERS[mode] || TILE_PROVIDERS.real;
      const tileLayer = L.tileLayer(provider.url, {
        maxZoom: 18,
        attribution: provider.attribution
      }).addTo(map);

      tileLayerRef.current = tileLayer;
      vectorLayerRef.current = L.layerGroup().addTo(map);
      mapInstance.current = map;

      setTimeout(() => map.invalidateSize(), 250);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []); // eslint-disable-line

  // Update Tile Layer on Mode Change
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const provider = TILE_PROVIDERS[mode] || TILE_PROVIDERS.real;
    tileLayerRef.current.setUrl(provider.url);
  }, [mode]);

  // Update View & Draw Layers on Data Change
  useEffect(() => {
    const map = mapInstance.current;
    const g = vectorLayerRef.current;
    if (!map || !g || !airportData) return;

    g.clearLayers();
    map.setView(center, zoom);

    // 1. Draw Runways (Geographic alignment with threshold numbers and centerline)
    if (airportData.runways && airportData.runways.length > 0) {
      airportData.runways.forEach((rw) => {
        if (!rw.points || rw.points.length < 2) return;

        // Asphalt runway surface outline
        const runwayPolyline = L.polyline(rw.points, {
          color: '#ffd073',
          weight: 12,
          opacity: 0.85,
          lineCap: 'square'
        }).addTo(g);

        // Centerline dashes
        L.polyline(rw.points, {
          color: '#ffffff',
          weight: 2,
          dashArray: '8, 12',
          opacity: 0.95
        }).addTo(g);

        runwayPolyline.bindTooltip(
          `<b>${rw.name}</b><br/>Length: ${rw.length_m?.toLocaleString()} m (${Math.round(rw.length_m * 3.28084)} ft)<br/>Heading: ${rw.heading_deg}° · ${rw.surface}`,
          { direction: 'top', className: 'ap-tip' }
        );

        // Runway thresholds
        const [pt1, pt2] = rw.points;
        const [id1, id2] = (rw.ident || '').split('/');
        if (id1) {
          L.circleMarker(pt1, { radius: 5, color: '#ffd073', fillColor: '#061B38', fillOpacity: 1, weight: 2 })
            .bindTooltip(`Rwy ${id1}`, { permanent: true, direction: 'left', className: 'ap-tip' }).addTo(g);
        }
        if (id2) {
          L.circleMarker(pt2, { radius: 5, color: '#ffd073', fillColor: '#061B38', fillOpacity: 1, weight: 2 })
            .bindTooltip(`Rwy ${id2}`, { permanent: true, direction: 'right', className: 'ap-tip' }).addTo(g);
        }
      });
    }

    // 2. Draw Terminals
    if (airportData.terminals) {
      airportData.terminals.forEach((term) => {
        if (!term.pos) return;
        const marker = L.circleMarker(term.pos, {
          radius: 9,
          color: '#168FFF',
          fillColor: '#0a3066',
          fillOpacity: 1,
          weight: 2.5
        }).addTo(g);

        marker.bindTooltip(
          `<b>${term.name}</b><br/>Gates: ${term.gates || 'All concourses'}<br/>Type: ${term.type || 'Passenger'}`,
          { permanent: true, direction: 'top', className: 'ap-tip term-tip' }
        );

        marker.on('click', () => onSelectTerminal?.(term));
      });
    }

    // 3. Draw Metro / Ground Transport Links
    if (airportData.transport) {
      airportData.transport.forEach((tr) => {
        if (!tr.pos) return;
        L.circleMarker(tr.pos, {
          radius: 6,
          color: '#5eead4',
          fillColor: '#073330',
          fillOpacity: 1,
          weight: 2
        }).bindTooltip(`<b>${tr.name}</b><br/>${tr.info || tr.mode}`, { direction: 'bottom', className: 'ap-tip' }).addTo(g);
      });
    }

    // 4. Draw ATC Tower & Facilities
    if (airportData.facilities) {
      airportData.facilities.forEach((fac) => {
        if (!fac.pos) return;
        L.circleMarker(fac.pos, {
          radius: 5,
          color: '#ffb020',
          fillColor: '#3a2603',
          fillOpacity: 1,
          weight: 2
        }).bindTooltip(`<b>${fac.name}</b>`, { direction: 'right', className: 'ap-tip' }).addTo(g);
      });
    }

    // 5. Draw User Geolocation Marker (if detected)
    if (userLocation && userLocation.lat && userLocation.lon) {
      const userPos = [userLocation.lat, userLocation.lon];
      // Pulsing user dot
      L.circleMarker(userPos, {
        radius: 8,
        color: '#ffffff',
        fillColor: '#10b981',
        fillOpacity: 1,
        weight: 3
      }).bindTooltip(`<b>YOUR LOCATION</b><br/>${userLocation.distance_km} km to ${airportData.name}`, {
        permanent: true,
        direction: 'top',
        className: 'ap-tip user-tip'
      }).addTo(g);

      // Connect user to airport center with dashed flight corridor line
      L.polyline([userPos, center], {
        color: '#10b981',
        weight: 2.5,
        dashArray: '6, 8',
        opacity: 0.8
      }).bindTooltip(`Distance: ${userLocation.distance_km} km`, { sticky: true }).addTo(g);

      // Fit bounds to show both user and airport
      map.fitBounds([userPos, center], { padding: [50, 50], maxZoom: 15 });
    }
  }, [airportData, userLocation, center, zoom]); // eslint-disable-line

  const handleZoomIn = () => mapInstance.current?.zoomIn();
  const handleZoomOut = () => mapInstance.current?.zoomOut();
  const handleReset = () => {
    if (!mapInstance.current) return;
    mapInstance.current.flyTo(center, zoom, { duration: 0.8 });
  };

  return (
    <div className="airport-geo-map-wrap">
      <div ref={mapRef} className="airport-geo-map" />

      {/* Map Controls Floating Overlay */}
      <div className="mapctl">
        <button type="button" onClick={handleZoomIn} title="Zoom In" aria-label="Zoom in">+</button>
        <button type="button" onClick={handleZoomOut} title="Zoom Out" aria-label="Zoom out">-</button>
        <button type="button" onClick={handleReset} title="Reset Airport Center" aria-label="Reset view">
          <Navigation size={17} />
        </button>
        <button
          type="button"
          onClick={onLocate}
          disabled={locating}
          className={locating ? 'pulse' : ''}
          title="Locate Nearest Airport (GPS)"
          aria-label="Locate me"
        >
          <LocateFixed size={17} color={userLocation ? '#10b981' : '#ffffff'} />
        </button>
      </div>

      {/* Map Legend Overlay */}
      <div className="geo-legend">
        <span className="leg-item"><i className="leg-line rwy" /> Runways</span>
        <span className="leg-item"><i className="leg-dot term" /> Terminals</span>
        <span className="leg-item"><i className="leg-dot metro" /> Transport / Metro</span>
        <span className="leg-item"><i className="leg-dot fac" /> Facilities & ATC</span>
        {userLocation && <span className="leg-item"><i className="leg-dot user" /> You ({userLocation.distance_km} km)</span>}
      </div>
    </div>
  );
}
