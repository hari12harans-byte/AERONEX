import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, PlaneLanding, PlaneTakeoff, ShieldCheck, Footprints, DoorOpen, Users } from 'lucide-react';
import { Card, RiskBadge, SourceBadge, fmtTime } from './ui.jsx';

const ICON = { ARRIVAL: PlaneLanding, DEPLANE: DoorOpen, IMMIGRATION: Users, SECURITY: ShieldCheck, GATE: Footprints, BOARDING: DoorOpen, CONNECTING: PlaneTakeoff };

export default function Guardian({ trip, full }) {
  const c = trip.connection;
  const ml = trip.ml || c.ml || null;
  const decision = trip.decision || null;
  const [a, b] = trip.legs;
  return (
    <Card title="Connection Guardian" right={<><SourceBadge kind={trip.source} /><RiskBadge risk={c.risk} big /></>} className="guardian">
      <div className="g-route">
        <span>CURRENT JOURNEY</span>
        <b>{trip.route.join(' → ')}</b>
      </div>
      <div className="g-grid">
        <div><small>Arrival {a.destination}</small><b>{fmtTime(a.estimatedArrival)}</b></div>
        <div><small>Connecting flight {b.flightNumber}</small><b>{fmtTime(b.estimatedDeparture)}</b></div>
        <div><small>Available connection</small><b>{c.availableMin} min</b></div>
        <div><small>Required transfer</small><b>{c.requiredMin} min</b></div>
        <div className={`buf ${c.bufferMin < 0 ? 'neg' : ''}`}><small>Safety buffer</small><b>{c.bufferMin} min</b></div>
      </div>
      <ol className="g-time" aria-label="Transfer timeline">
        {c.timeline.map((s) => {
          const Icon = ICON[s.key];
          return (
            <li key={s.key}>
              <span className="dot"><Icon size={16} /></span>
              <div><b>{s.label}</b><small>{s.minutes ? `~${s.minutes} min · ` : ''}{fmtTime(s.clock)}</small></div>
            </li>
          );
        })}
      </ol>
      {ml ? (
        <div className="g-ml">
          <small>ESTIMATED CONNECTION RISK</small>
          <b>{Math.round((ml.probability ?? ml.missed_connection_probability ?? 0) * 100)}%</b>
          <span>{ml.risk} · {ml.connection_buffer_min} min buffer</span>
          {ml.top_factors?.length > 0 && <small>Most influential model inputs overall: {ml.top_factors.join(', ')}</small>}
          <small>Decision-support estimate based on the configured AeroNex prediction engine and connection constraints.</small>
        </div>
      ) : trip.mlStatus ? (
        <div className="g-ml"><small>AI ESTIMATE UNAVAILABLE ({trip.mlStatus}) — showing the rule-based assessment.</small></div>
      ) : null}
      {decision?.reasons?.length > 0 && (
        <details className="g-why">
          <summary>Why this risk level?</summary>
          <ul>{decision.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </details>
      )}
      <p className="next-action"><b>Next:</b> {decision && decision.risk !== c.risk ? decision.recommendedAction : trip.nextAction}</p>
      <div className="row gap wrap">
        <Link className="btn ghost" to="/gate-navigation">Navigate to Gate {c.departureGate} <ArrowRight size={16} /></Link>
        {['HIGH', 'CRITICAL'].includes(c.risk) && <Link className="btn danger" to="/recovery">Open Recovery Center</Link>}
        {!full && <Link className="btn ghost" to="/trip">Full trip details</Link>}
      </div>
    </Card>
  );
}
