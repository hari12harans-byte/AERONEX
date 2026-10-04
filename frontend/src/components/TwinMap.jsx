import React from 'react';

export const TYPE_COLOR = {
  gate: '#168FFF',
  security: '#ffb020',
  immigration: '#b388ff',
  baggage: '#4fd1a5',
  food: '#ff8a65',
  lounge: '#f6c177',
  restroom: '#9fb4d0',
  transport: '#5eead4',
  emergency: '#ff5470',
};

export const TYPE_LABEL = {
  gate: 'Gates',
  security: 'Security Screening',
  immigration: 'Immigration & Customs',
  baggage: 'Baggage Reclaim',
  food: 'Dining & Cafes',
  lounge: 'Airline Lounges',
  restroom: 'Restrooms',
  transport: 'Ground Transport',
  emergency: 'Medical & Assistance',
};

export default function TwinMap({ twin, airport, layers, route, highlight = {}, selected, onSelect }) {
  const { w, h } = twin.viewBox || { w: 1000, h: 520 };
  const spineY = twin.spineY || 250;
  const apCode = airport?.iata || 'MAA';

  return (
    <div className="twin-blueprint-container">
      <div className="blueprint-indoor-notice">
        <span className="badge ref">ESTIMATED INDOOR SCHEMATIC</span>
        <small className="text-muted">Indoor positions are estimated for concourse navigation guidance. No indoor GPS claimed.</small>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="twin-svg blueprint-svg"
        role="img"
        aria-label={`${airport?.name || 'Airport'} Terminal Blueprint`}
      >
        {/* Concourse Architectural Piers */}
        <rect x="40" y="55" width="920" height="90" rx="16" className="pier concourse-north" />
        <rect x="40" y="355" width="920" height="90" rx="16" className="pier concourse-south" />
        <rect x="40" y={spineY - 30} width="920" height="60" rx="14" className="spine central-spine" />
        <rect x="360" y="445" width="280" height="70" rx="16" className="pier transport-hub" />

        {/* Concourse Area Titles */}
        <text x="500" y="80" textAnchor="middle" className="twin-concourse-title">
          {apCode} NORTH CONCOURSE · TERMINAL 1 (DOMESTIC GATES A01–A24)
        </text>
        <text x="500" y={spineY + 5} textAnchor="middle" className="twin-label concourse-spine-label">
          CENTRAL CONNECTING SPINE · TRANSFER CONCOURSE
        </text>
        <text x="500" y="380" textAnchor="middle" className="twin-concourse-title">
          {apCode} SOUTH CONCOURSE · TERMINAL 3 (INTERNATIONAL GATES B01–B12)
        </text>
        <text x="500" y="488" textAnchor="middle" className="twin-concourse-sub">
          GROUND TRANSPORT & PASSENGER ARRIVAL TERMINAL
        </text>

        {/* Dynamic Route Polyline */}
        {route && (
          <polyline
            points={route.points.map((p) => p.join(',')).join(' ')}
            className="route animated-route"
            fill="none"
          />
        )}

        {/* POI Markers (Gates, Security, Baggage, Lounges, Food, etc.) */}
        {twin.pois
          .filter((p) => layers.has(p.type))
          .map((p) => {
            const hl = highlight[p.id];
            const sel = selected === p.id;
            const r = p.type === 'gate' ? 8 : 13;
            const isImportant =
              p.type !== 'gate' ||
              hl ||
              sel ||
              ['A01', 'A07', 'A12', 'A18', 'A24', 'B01', 'B06', 'B12'].includes(p.id);

            return (
              <g
                key={p.id}
                tabIndex={0}
                role="button"
                aria-label={p.label}
                onClick={() => onSelect?.(p)}
                onKeyDown={(e) => e.key === 'Enter' && onSelect?.(p)}
                className={`poi ${sel ? 'selected-poi' : ''}`}
              >
                {(hl || sel) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r + 8}
                    fill="none"
                    stroke={hl?.color || '#168fff'}
                    strokeWidth="3"
                    className="poi-halo"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={TYPE_COLOR[p.type] || '#168fff'}
                  stroke="#061B38"
                  strokeWidth="2.5"
                />
                {isImportant && (
                  <text
                    x={p.x}
                    y={p.y + (p.y < 160 ? -16 : 28)}
                    textAnchor="middle"
                    className={`twin-label ${sel ? 'highlighted-label' : ''}`}
                  >
                    {p.type === 'gate' ? p.id : p.label}
                  </text>
                )}
                {hl && (
                  <text
                    x={p.x}
                    y={p.y + (p.y < 160 ? -32 : 44)}
                    textAnchor="middle"
                    className="twin-tag"
                    fill={hl.color}
                  >
                    {hl.text}
                  </text>
                )}
              </g>
            );
          })}
      </svg>
    </div>
  );
}
