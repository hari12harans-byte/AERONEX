import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plane, Luggage, Bus, BedDouble, Bell, ArrowDown } from 'lucide-react';
import { api } from '../api.js';
import { useAsync } from '../hooks.js';
import { Card, PageHeader, State, StatusPill, fmtTime, fmtDate, fmtAgo } from '../components/ui.jsx';
import Guardian from '../components/Guardian.jsx';
import { useShell } from '../layouts/Shell.jsx';

export default function Trip() {
  const s = useAsync(() => api('/trip'));
  const [minutes, setMinutes] = useState(45);
  const [busy, setBusy] = useState(false);
  const { refreshUnread } = useShell();
  const nav = useNavigate();
  const notifs = useAsync(() => api('/notifications'));
  const sim = async (body) => {
    setBusy(true);
    try { await api('/simulation/event', { method: 'POST', body }); await s.reload(); await notifs.reload(); refreshUnread(); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="My Trip" sub="Your connecting journey, end to end." badge="REFERENCE" />
      <State s={s}>
        {(t) => (
          <div className="stack">
            <Guardian trip={t} full />
            <Card title="Journey timeline">
              <ol className="legs">
                {t.legs.map((l, i) => (
                  <React.Fragment key={l.flightNumber}>
                    <li className="leg">
                      <Plane size={22} className="blue" />
                      <div className="grow"><b>{l.flightNumber} · {l.airline}</b><small>{l.origin} → {l.destination} · {fmtDate(l.scheduledDeparture)}</small></div>
                      <div><small>Departs</small><b>{fmtTime(l.estimatedDeparture)}</b></div>
                      <div><small>Arrives</small><b>{fmtTime(l.estimatedArrival)}</b></div>
                      <div><small>Gate / Term.</small><b>{l.gate} / {l.terminal}</b></div>
                      <StatusPill status={l.status} />
                    </li>
                    {i === 0 && <li className="leg conn"><ArrowDown size={18} /> Connection at {t.connection.airport}: {t.connection.availableMin} min available · risk {t.connection.risk}</li>}
                  </React.Fragment>
                ))}
                <li className="leg conn"><ArrowDown size={18} /> Arrival {t.legs[1].destination} at {fmtTime(t.legs[1].estimatedArrival)}</li>
              </ol>
            </Card>
            <div className="grid3">
              <Card title="Baggage"><p><b>{t.baggage.status}</b></p><p className="muted">{t.baggage.location}</p><Link className="textlink" to="/baggage">Baggage details</Link></Card>
              <Card title="Transport & hotels"><p className="muted">Arrange ground transport or a nearby hotel at {t.connection.airport}.</p><div className="row gap"><Link className="textlink" to="/transport?airport=DEL"><Bus size={15} /> Transport</Link><Link className="textlink" to="/hotels?airport=DEL"><BedDouble size={15} /> Hotels</Link></div></Card>
              <Card title="Notifications"><State s={notifs} isEmpty={(d) => !d.items.length} empty="No notifications.">{(d) => <ul className="alist">{d.items.slice(0, 3).map((n) => <li key={n.id}><b>{n.title}</b><small>{fmtAgo(n.time)}</small></li>)}</ul>}</State></Card>
            </div>
            <Card title="Scenario Lab" right={<span className="badge demo">SCENARIO</span>}>
              <p className="muted">Use controlled scenarios to test how AeroNex responds to delays, gate changes and baggage events. Scenario results are not live airline events.</p>
              <div className="row gap wrap">
                <label className="field inline"><span>Delay AI 255 by</span><select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>{[15, 30, 45, 60, 75, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}</select></label>
                <button className="btn primary" disabled={busy} onClick={() => sim({ type: 'delay', leg: 0, minutes })}>Apply delay</button>
                <button className="btn ghost" disabled={busy} onClick={() => sim({ type: 'gate_change', gate: 'A22' })}>Change gate to A22</button>
                <button className="btn ghost" disabled={busy} onClick={() => sim({ type: 'reset' })}>Reset scenario</button>
                {['HIGH', 'CRITICAL'].includes(t.connection.risk) && <button className="btn danger" onClick={() => nav('/recovery')}>Open Recovery Center</button>}
              </div>
            </Card>
          </div>
        )}
      </State>
    </>
  );
}
