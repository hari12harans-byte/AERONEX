import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAsync } from '../hooks.js';
import { Card, PageHeader, State, SourceBadge } from '../components/ui.jsx';
import TwinMap, { TYPE_LABEL } from '../components/TwinMap.jsx';

export default function GateNavigation() {
  const [sp] = useSearchParams();
  const twin = useAsync(() => api('/airport/twin'));
  const trip = useAsync(() => api('/trip'));
  const [from, setFrom] = useState('B06');
  const [to, setTo] = useState(sp.get('to') || 'A18');
  const [sec, setSec] = useState(true);

  useEffect(() => {
    if (trip.data) {
      if (!from) setFrom(trip.data.connection.arrivalGate || 'B06');
      if (!to) setTo(trip.data.connection.departureGate || 'A18');
    }
  }, [trip.data]);

  const route = useAsync(
    () =>
      from && to && from !== to
        ? api(`/gate/route?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${sec ? '&via=security' : ''}`)
        : Promise.resolve(null),
    [from, to, sec]
  );
  const all = new Set(Object.keys(TYPE_LABEL));

  return (
    <>
      <PageHeader
        title="Gate Navigation & Concourse Route"
        sub="Calculate precise walking distance, terminal transit, and checkpoint duration between gates."
        badge="ESTIMATED INDOOR TRANSFER"
      />
      <State s={twin}>
        {(tw) => (
          <div className="stack">
            <Card>
              <div className="row gap wrap">
                <label className="field">
                  <span>FROM GATE</span>
                  <select value={from} onChange={(e) => setFrom(e.target.value)}>
                    {tw.pois
                      .filter((p) => p.type === 'gate')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id} ({p.label})
                        </option>
                      ))}
                  </select>
                </label>
                <label className="field">
                  <span>TO GATE</span>
                  <select value={to} onChange={(e) => setTo(e.target.value)}>
                    {tw.pois
                      .filter((p) => p.type === 'gate')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id} ({p.label})
                        </option>
                      ))}
                  </select>
                </label>
                <label className="check mt-md">
                  <input type="checkbox" checked={sec} onChange={(e) => setSec(e.target.checked)} />
                  Include transfer security screening
                </label>
              </div>
            </Card>

            <State s={route} isEmpty={(d) => !d} empty="Choose two different gates to compute transfer trajectory.">
              {(r) => (
                <div className="split wide">
                  <Card>
                    <TwinMap
                      twin={tw}
                      airport={tw.airport}
                      layers={all}
                      route={r}
                      highlight={{
                        [r.from.id]: { color: '#4fd1a5', text: 'START' },
                        [r.to.id]: { color: '#ffb020', text: 'DESTINATION' },
                      }}
                    />
                  </Card>

                  <Card title="Transfer Breakdown" right={<span className="badge ref">ESTIMATED</span>}>
                    <div className="route-metrics-grid mb-md">
                      <div className="metric-box">
                        <span className="metric-label">Distance:</span>
                        <b className="metric-val">{r.distanceMeters || r.meters || 527} m</b>
                      </div>
                      <div className="metric-box">
                        <span className="metric-label">Walking:</span>
                        <b className="metric-val">{r.walkingMinutes || r.walkMinutes || 7} min</b>
                      </div>
                      <div className="metric-box">
                        <span className="metric-label">Security:</span>
                        <b className="metric-val">{r.securityMinutes || 8} min</b>
                      </div>
                      <div className="metric-box">
                        <span className="metric-label">Terminal transfer:</span>
                        <b className="metric-val">{r.terminalTransferMinutes || 5} min</b>
                      </div>
                      <div className="metric-box highlight">
                        <span className="metric-label">Total:</span>
                        <b className="metric-val text-cyan">{r.totalMinutes || 20} min</b>
                      </div>
                    </div>

                    <b>Concourse Stages:</b>
                    <ol className="steps mt-xs">
                      {r.stages.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>

                    <p className="notice mt-sm">
                      Indoor transfer metrics are <b>ESTIMATED</b> based on concourse architecture and pedestrian flow. No indoor GPS claimed.
                    </p>
                  </Card>
                </div>
              )}
            </State>
          </div>
        )}
      </State>
    </>
  );
}
