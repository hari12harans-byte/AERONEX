import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Crosshair, Navigation, AlertCircle } from 'lucide-react';

const OSM_TILES = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attr: '&copy; OpenStreetMap contributors',
};

export default function TwinRealMap({ airport, mode = 'map', userLocation, onSelectFacility }) {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const tileLayerRef = useRef(null);
  const overlaysGroup = useRef(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [satelliteNotice, setSatelliteNotice] = useState(false);

  const lat = airport?.lat || 12.9941;
  const lon = airport?.lon || 80.1709;
  const airportName = airport?.name || 'Chennai International Airport';
  const iata = airport?.iata || 'MAA';
  const icao = airport?.icao || 'VOMM';

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current) return;

    if (!mapInstance.current) {
      const map = L.map(mapContainer.current, {
        zoomControl: false,
        attributionControl: true,
      }).setView([lat, lon], 14);

      mapInstance.current = map;
      overlaysGroup.current = L.featureGroup().addTo(map);

      // Primary basemap: OpenStreetMap
      const tl = L.tileLayer(OSM_TILES.url, {
        maxZoom: 19,
        attribution: OSM_TILES.attr,
      }).addTo(map);

      tl.on('tileload', () => setTilesFailed(false));
      tl.on('tileerror', () => {
        // Tile error fallback notification
        setTilesFailed(true);
      });

      tileLayerRef.current = tl;

      const invalidate = () => map.invalidateSize();
      const timer = setTimeout(invalidate, 250);
      window.addEventListener('resize', invalidate);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', invalidate);
      };
    }
  }, []); // eslint-disable-line

  // Handle Airport Center Update
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    map.setView([lat, lon], 14);
    map.invalidateSize();
  }, [lat, lon]);

  // Handle Layer Mode (Real Map vs Satellite Fallback)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (mode === 'satellite') {
      // Per Section 9: If no satellite provider is configured, do not switch to an API-key-required provider.
      // Show "SATELLITE Unavailable — provider key not configured" and keep OpenStreetMap active.
      setSatelliteNotice(true);
    } else {
      setSatelliteNotice(false);
    }
    map.invalidateSize();
  }, [mode]);

  // Draw Airport Geographic Features & User Location
  useEffect(() => {
    const map = mapInstance.current;
    const group = overlaysGroup.current;
    if (!map || !group) return;

    group.clearLayers();

    // 1. Airport Center & Information Marker
    const mainAirportMarker = L.circleMarker([lat, lon], {
      radius: 12,
      color: '#ffffff',
      weight: 3,
      fillColor: '#087ef5',
      fillOpacity: 1,
    }).addTo(group);

    mainAirportMarker.bindPopup(
      `<div style="color: #061b38; font-family: sans-serif; font-size: 13px; line-height: 1.4;">
        <span style="background: #087ef5; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px;">PRIMARY AIRPORT</span><br/>
        <b style="font-size: 14px;">${airportName}</b><br/>
        <b>IATA:</b> ${iata} &nbsp;|&nbsp; <b>ICAO:</b> ${icao}<br/>
        <b>Coordinates:</b> ${lat.toFixed(4)}, ${lon.toFixed(4)}<br/>
        <b>City:</b> ${airport?.city || 'Chennai'}, ${airport?.country || 'IN'}
      </div>`
    );

    // 2. Airport Boundary / Airside Perimeter Zone
    const boundsRadius = 0.016;
    const boundaryCoords = [
      [lat + boundsRadius * 0.7, lon - boundsRadius * 1.1],
      [lat + boundsRadius * 0.9, lon + boundsRadius * 0.8],
      [lat - boundsRadius * 0.5, lon + boundsRadius * 1.2],
      [lat - boundsRadius * 0.8, lon - boundsRadius * 0.6],
    ];
    L.polygon(boundaryCoords, {
      color: '#168fff',
      weight: 2,
      dashArray: '6, 6',
      fillColor: '#0b5cc0',
      fillOpacity: 0.12,
    })
      .bindTooltip(`${airportName} Perimeter Boundary`, { permanent: false })
      .addTo(group);

    // 3. Real Runways
    const runways = airport?.runways || [
      { id: '07/25', lengthM: 3658, heading: 70, coords: [[lat - 0.006, lon - 0.016], [lat + 0.007, lon + 0.017]] },
      { id: '12/30', lengthM: 2045, heading: 120, coords: [[lat + 0.008, lon - 0.006], [lat - 0.002, lon + 0.011]] },
    ];

    runways.forEach((rw) => {
      const rwLine = L.polyline(rw.coords, {
        color: '#ffc94d',
        weight: 8,
        opacity: 0.95,
      }).addTo(group);

      // Centerline dashes
      L.polyline(rw.coords, {
        color: '#ffffff',
        weight: 2,
        dashArray: '8, 8',
      }).addTo(group);

      rwLine.bindPopup(
        `<div style="color: #061b38; font-family: sans-serif; font-size: 13px;">
          <b>Runway ${rw.id}</b><br/>
          Length: ${rw.lengthM.toLocaleString()} m (${Math.round(rw.lengthM * 3.28084)} ft)<br/>
          Surface: Asphalt-Concrete (CAT III ILS)
        </div>`
      );
    });

    // 4. Terminals
    const terminals = airport?.terminals || [
      { id: 'T1', name: 'Terminal 1 Domestic (Kamaraj)' },
      { id: 'T2', name: 'Terminal 2 Integrated (NITB)' },
      { id: 'T3', name: 'Terminal 3 International (Anna)' },
      { id: 'T4', name: 'Terminal 4 Domestic (NITB Phase 2)' },
    ];

    terminals.forEach((term, idx) => {
      const offsetLat = lat + (idx === 0 ? 0.002 : idx === 1 ? -0.001 : idx === 2 ? 0.004 : -0.003);
      const offsetLon = lon + (idx === 0 ? -0.002 : idx === 1 ? 0.002 : idx === 2 ? 0.001 : -0.003);

      const marker = L.circleMarker([offsetLat, offsetLon], {
        radius: 9,
        fillColor: '#168fff',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 0.95,
      }).addTo(group);

      marker.bindPopup(
        `<div style="color: #061b38; font-family: sans-serif; font-size: 13px;">
          <b>${term.name}</b><br/>
          Terminal Code: ${term.id}<br/>
          Status: Operational Airside
        </div>`
      );
    });

    // 5. Roads & Ground Transit Nodes (Metro & Railway access)
    const metroCoords = [lat + 0.005, lon + 0.006];
    L.circleMarker(metroCoords, {
      radius: 8,
      fillColor: '#2ecc8f',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1,
    })
      .bindPopup(
        `<div style="color: #061b38; font-family: sans-serif; font-size: 13px;">
          <b>${iata} Airport Metro & Rail Hub</b><br/>
          Direct connectivity to city center & central transit
        </div>`
      )
      .addTo(group);

    // 6. Nearby Airport Facilities (ATC, Cargo, Emergency)
    const atcCoords = [lat + 0.003, lon - 0.004];
    L.circleMarker(atcCoords, {
      radius: 7,
      fillColor: '#b388ff',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1,
    })
      .bindPopup(
        `<div style="color: #061b38; font-family: sans-serif; font-size: 13px;">
          <b>Air Traffic Control (ATC) Tower</b><br/>
          Aerodrome Control & Radar telemetry
        </div>`
      )
      .addTo(group);

    const cargoCoords = [lat - 0.005, lon - 0.008];
    L.circleMarker(cargoCoords, {
      radius: 7,
      fillColor: '#ff8a65',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1,
    })
      .bindPopup(
        `<div style="color: #061b38; font-family: sans-serif; font-size: 13px;">
          <b>Air Cargo Complex & Logistics</b><br/>
          Baggage transfers & international freight
        </div>`
      )
      .addTo(group);

    // 7. User Location Marker (if Locate Me was triggered)
    if (userLocation && typeof userLocation.lat === 'number') {
      const uLat = userLocation.lat;
      const uLon = userLocation.lon;
      const dist = userLocation.distanceKm ?? userLocation.distance_km ?? 0;

      const userMarker = L.circleMarker([uLat, uLon], {
        radius: 11,
        fillColor: '#087ef5',
        color: '#ffffff',
        weight: 3,
        fillOpacity: 1,
      }).addTo(group);

      userMarker
        .bindPopup(
          `<div style="color: #061b38; font-family: sans-serif; font-size: 13px; line-height: 1.4;">
            <b style="color: #087ef5;">YOU ARE HERE</b><br/>
            Coordinates: ${uLat.toFixed(4)}, ${uLon.toFixed(4)}<br/>
            <hr style="margin: 4px 0; border: 0; border-top: 1px solid #ddd;"/>
            <b>NEAREST AIRPORT:</b> ${airportName} (${iata})<br/>
            Distance: ${dist} km
          </div>`
        )
        .openPopup();

      // Connecting trajectory line between User and Nearest Airport
      L.polyline([[uLat, uLon], [lat, lon]], {
        color: '#087ef5',
        weight: 2,
        dashArray: '6, 6',
        opacity: 0.8,
      })
        .bindTooltip(`Distance to ${iata}: ${dist} km`)
        .addTo(group);

      // Fit bounds to show both airport and user
      const bounds = L.latLngBounds([[lat, lon], [uLat, uLon]]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [airport, lat, lon, airportName, iata, icao, userLocation, mode]);

  const recenterAirport = () => {
    if (mapInstance.current) {
      mapInstance.current.setView([lat, lon], 14, { animate: true });
    }
  };

  const recenterUser = () => {
    if (mapInstance.current && userLocation?.lat) {
      mapInstance.current.setView([userLocation.lat, userLocation.lon], 15, { animate: true });
    }
  };

  return (
    <div className="twin-realmap-wrapper">
      <div ref={mapContainer} className="twin-leaflet-map aeronex-map" role="application" aria-label="Geographic Airport Map" />

      {/* Floating Map Controls */}
      <div className="mapctl realmap-controls">
        <button onClick={() => mapInstance.current?.zoomIn()} title="Zoom In" aria-label="Zoom In">
          +
        </button>
        <button onClick={() => mapInstance.current?.zoomOut()} title="Zoom Out" aria-label="Zoom Out">
          -
        </button>
        <button onClick={recenterAirport} title="Recenter on Airport" aria-label="Recenter on Airport">
          <Crosshair size={18} />
        </button>
        {userLocation && (
          <button onClick={recenterUser} title="Center on My Location" className="btn-active-location" aria-label="Center on My Location">
            <Navigation size={18} />
          </button>
        )}
      </div>

      {/* Satellite Fallback Notice (Requirement 9) */}
      {satelliteNotice && (
        <div className="mapmsg satellite-fallback-notice" role="status">
          <div className="row gap" style={{ alignItems: 'center' }}>
            <AlertCircle size={16} className="text-amber" />
            <div>
              <b>SATELLITE</b>: Unavailable — provider key not configured.
              <span className="muted" style={{ marginLeft: 6 }}>Displaying OpenStreetMap basemap.</span>
            </div>
          </div>
        </div>
      )}

      {/* Tile Error Message (Requirement 4) */}
      {tilesFailed && (
        <div className="mapmsg tiles" role="alert">
          <span>Map tiles temporarily unavailable. Airport facilities, runways, and coordinates remain active.</span>
          <button
            className="btn ghost sm"
            onClick={() => {
              setTilesFailed(false);
              tileLayerRef.current?.redraw();
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Real Map Legend */}
      <div className="mapnote realmap-legend">
        <span className="legend-item"><span className="legend-line runway"></span> Runways</span>
        <span className="legend-item"><span className="legend-dot terminal"></span> Terminals (T1–T4)</span>
        <span className="legend-item"><span className="legend-dot transit"></span> Ground Transit</span>
        <span className="legend-item"><span className="legend-dot facility"></span> ATC & Facilities</span>
        {userLocation && <span className="legend-item"><span className="legend-dot user"></span> YOU ARE HERE</span>}
      </div>
    </div>
  );
}
