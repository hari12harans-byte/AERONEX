import React from 'react';

export const TYPE_COLOR = { gate: '#168FFF', security: '#ffb020', immigration: '#b388ff', baggage: '#4fd1a5', food: '#ff8a65', lounge: '#f6c177', restroom: '#9fb4d0', transport: '#5eead4', emergency: '#ff5470' };
export const TYPE_LABEL = { gate: 'Gates', security: 'Security', immigration: 'Immigration', baggage: 'Baggage', food: 'Food', lounge: 'Lounge', restroom: 'Restrooms', transport: 'Transport', emergency: 'Emergency' };

export default function TwinMap({ twin, layers, route, highlight = {}, selected, onSelect }) {
  const { w, h } = twin.viewBox;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="twin-svg" role="img" aria-label="Schematic airport terminal map">
      <rect x="40" y="60" width="920" height="80" rx="18" className="pier" />
      <rect x="40" y="360" width="920" height="80" rx="18" className="pier" />
      <rect x="40" y={twin.spineY - 28} width="920" height="56" rx="14" className="spine" />
      <rect x="380" y="440" width="240" height="70" rx="16" className="pier" />
      <text x="500" y={twin.spineY + 5} textAnchor="middle" className="twin-label">CENTRAL CONCOURSE</text>
      {route && <polyline points={route.points.map((p) => p.join(',')).join(' ')} className="route" fill="none" />}
      {twin.pois.filter((p) => layers.has(p.type)).map((p) => {
        const hl = highlight[p.id];
        const sel = selected === p.id;
        const r = p.type === 'gate' ? 8 : 12;
        return (
          <g key={p.id} tabIndex={0} role="button" aria-label={p.label} onClick={() => onSelect?.(p)} onKeyDown={(e) => e.key === 'Enter' && onSelect?.(p)} className="poi">
            {(hl || sel) && <circle cx={p.x} cy={p.y} r={r + 7} fill="none" stroke={hl?.color || '#fff'} strokeWidth="2.5" />}
            <circle cx={p.x} cy={p.y} r={r} fill={TYPE_COLOR[p.type]} stroke="#061B38" strokeWidth="2" />
            {(p.type !== 'gate' || hl || sel || ['A1', 'A12', 'A24', 'B01', 'B06', 'B12'].includes(p.id)) && (
              <text x={p.x} y={p.y + (p.y < 150 ? -16 : 26)} textAnchor="middle" className="twin-label">{p.type === 'gate' ? p.id : p.label}</text>
            )}
            {hl && <text x={p.x} y={p.y + (p.y < 150 ? -32 : 42)} textAnchor="middle" className="twin-tag" fill={hl.color}>{hl.text}</text>}
          </g>
        );
      })}
    </svg>
  );
}
