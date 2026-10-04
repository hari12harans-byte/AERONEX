import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Footprints, Shield, ArrowRight, Clock, Building2, MapPin, AlertCircle } from 'lucide-react';
import { api } from '../api.js';
import { useAsync, useAirports } from '../hooks.js';
import { Card, PageHeader, State, SourceBadge } from '../components/ui.jsx';
import TwinMap, { TYPE_LABEL } from '../components/TwinMap.jsx';

export default function GateNavigation() {
  const [sp, setSp] = useSearchParams();
  const airports = useAirports();

  const currentAirport = (sp.get('airport') || 'MAA').toUpperCase();
  const twin = useAsync(() => api(`/airport/twin?airport=${currentAirport}`), [currentAirport]);
  const trip = useAsync(() => api('/trip'));

  const [from, setFrom] = useState('');
  const [to, setTo] = useState(sp.get('to') || '');
  const [sec, setSec] = useState(true);

  // Initialize gates from trip context or defaults
  useEffect(() => {
    if (twin.data) {
      const bp = twin.data.blueprint || twin.data;
      const pois = bp.pois || [];
      const gates = pois.filter((p) => p.type === 'gate');
      if (gates.length >= 2) {
        if (!from) {
          const tripArr = trip.data?.connection?.arrivalGate;
          const matchedArr = gates.find((g) => g.id === tripArr);
          setFrom(matchedArr ? matchedArr.id : gates[0].id);
        }
        if (!to) {
          const tripDep = trip.data?.connection?.departureGate;
          const matchedDep = gates.find((g) => g.id === tripDep);
          setTo(matchedDep ? matchedDep.id : gates[gates.length - 1].id);
        }
      }
    }
  }, [twin.data, trip.data]); // eslint-disable-line

  const route = useAsync(
    () =>
      from && to && from !== to
        ? api(`/gate/route?airport=${currentAirport}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${sec ? '&via=security' : ''}`)
        : Promise.resolve(null),
    [currentAirport, from, to, sec]
  );

  const all = new Set(Object.keys(TYPE_LABEL));

  return (
    <>
      <PageHeader
        title="Gate Navigation"
        sub="Turn-by-turn walking route between terminal gates and facilities."
        badge="ESTIMATED"
      />

      <State s={twin}>
        {(tw) => {
          const bp = tw.blueprint || tw;
          const pois = bp.pois || [];

          return (
            <div className="stack">
              <Card>
                <div className="row gap wrap">
                  <label className="field">
                    <span>Airport</span>
                    <select
                      value={currentAirport}
                      onChange={(e) => {
                        setSp({ airport: e.target.value });
                        setFrom('');
                        setTo('');
                      }}
                    >
                      {airports.map((a) => (
                        <option key={a.iata} value={a.iata}>
                          {a.iata} - {a.city} ({a.icao || a.iata})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Starting location (FROM)</span>
                    <select value={from} onChange={(e) => setFrom(e.target.value)}>
                      {pois.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label} {p.terminal ? `(${p.terminal})` : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Destination (TO)</span>
                    <select value={to} onChange={(e) => setTo(e.target.value)}>
                      {pois.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label} {p.terminal ? `(${p.terminal})` : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="check" style={{ alignSelf: 'center', marginTop: 18 }}>
                    <input type="checkbox" checked={sec} onChange={(e) => setSec(e.target.checked)} />
                    Transfer security screening on route
                  </label>
                </div>
              </Card>

              <State s={route} isEmpty={(d) => !d} empty="Select two different locations to compute the transfer path.">
                {(r) => (
                  <div className="split wide">
                    <Card title={`Walking Schematic — ${r.from.label} → ${r.to.label}`}>
                      <TwinMap
                        twin={bp}
                        layers={all}
                        route={r}
                        highlight={{
                          [r.from.id]: { color: '#4fd1a5', text: 'START' },
                          [r.to.id]: { color: '#ffb020', text: 'DESTINATION' }
                        }}
                      />
                    </Card>

                    <Card title="Transfer Route Plan" right={<SourceBadge kind="ESTIMATED" />}>
                      <ol className="steps">
                        {r.stages.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>

                      <div className="gate-metrics-grid">
                        <div className="metric-box">
                          <small>Distance</small>
                          <b>{r.meters} m</b>
                        </div>
                        <div className="metric-box">
                          <small>Walking</small>
                          <b>{r.walkMinutes} min</b>
                        </div>
                        <div className="metric-box">
                          <small>Security</small>
                          <b>{r.securityMinutes} min</b>
                        </div>
                        <div className="metric-box">
                          <small>Terminal transfer</small>
                          <b>{r.terminalTransferMinutes || 0} min</b>
                        </div>
                        <div className="metric-box total">
                          <small>Total Estimated</small>
                          <b>{r.totalMinutes} min</b>
                        </div>
                      </div>

                      <p className="notice" style={{ marginTop: 14 }}>
                        <AlertCircle size={15} /> Airport-map route (ESTIMATED). Indoor positions and walking times are approximations derived from terminal schematics.
                      </p>
                    </Card>
                  </div>
                )}
              </State>
            </div>
          );
        }}
      </State>
    </>
  );
}
