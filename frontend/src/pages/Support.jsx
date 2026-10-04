import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mic, Volume2, VolumeX, Send, Phone, Accessibility, ShieldAlert, Info, LifeBuoy } from 'lucide-react';
import { api } from '../api.js';
import { useAsync } from '../hooks.js';
import { useAuth } from '../auth.jsx';
import { useShell } from '../layouts/Shell.jsx';
import { Card, PageHeader, State, RiskBadge, fmtAgo, fmtTime } from '../components/ui.jsx';

export function Notifications() {
  const s = useAsync(() => api('/notifications'));
  const { refreshUnread } = useShell();
  const [type, setType] = useState('All');
  const mark = async (id) => {
    await api('/notifications/read', { method: 'POST', body: id ? { id } : {} });
    await s.reload();
    refreshUnread();
  };
  const types = ['All', 'Flight delay', 'Gate change', 'Boarding', 'Connection risk', 'Baggage', 'Transport', 'Airport updates', 'Emergency assistance'];
  const keep = (n) => type === 'All' || n.type === type;
  return (
    <>
      <PageHeader title="Notifications" sub="Flight, connection, baggage and airport alerts." badge="REFERENCE"><button className="btn ghost" onClick={() => mark()}>Mark all read</button></PageHeader>
      <div className="chips">{types.map((t) => <button key={t} className={`chipbtn ${type === t ? 'on' : ''}`} onClick={() => setType(t)}>{t}</button>)}</div>
      <State s={s} isEmpty={(d) => !d.items.filter(keep).length} empty="No notifications for this filter.">
        {(d) => (
          <ul className="nlist">
            {d.items.filter(keep).map((n) => (
              <li key={n.id} className={n.read ? '' : 'unread'}>
                <span className="ntype">{n.type}</span>
                <div className="grow"><b>{n.title}</b><small>{n.body}</small></div>
                <small>{fmtAgo(n.time)}</small>
                {!n.read && <button className="btn ghost sm" onClick={() => mark(n.id)}>Mark read</button>}
              </li>
            ))}
          </ul>
        )}
      </State>
    </>
  );
}

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const SUGGEST = ['Where is my gate?', 'What is my connection time?', 'Is my flight delayed?', 'Where is my baggage?', 'How much time do I have?', 'How do I reach my next gate?'];

export function Assistant() {
  const [msgs, setMsgs] = useState([{ from: 'bot', text: 'Hi! Ask me about your gate, connection time, delays or baggage.' }]);
  const [text, setText] = useState('');
  const [speak, setSpeak] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef(null);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [msgs]);
  const ask = async (q) => {
    const m = q.trim();
    if (!m || busy) return;
    setMsgs((x) => [...x, { from: 'me', text: m }]);
    setText('');
    setBusy(true);
    try {
      const r = await api('/assistant', { method: 'POST', body: { message: m } });
      setMsgs((x) => [...x, { from: 'bot', text: r.reply }]);
      if (speak && 'speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(r.reply));
    } catch (e) {
      setMsgs((x) => [...x, { from: 'bot', text: `Sorry — ${e.message}`, err: true }]);
    } finally { setBusy(false); }
  };
  const listen = () => {
    const r = new SR();
    r.lang = 'en-IN';
    r.onresult = (e) => ask(e.results[0][0].transcript);
    r.start();
  };
  return (
    <>
      <PageHeader title="Travel Assistant" sub="Answers come from your AeroNex trip data." badge="USER">
        {'speechSynthesis' in window && <button className="btn ghost" onClick={() => setSpeak(!speak)} aria-pressed={speak}>{speak ? <Volume2 size={16} /> : <VolumeX size={16} />} Voice replies</button>}
      </PageHeader>
      <Card className="chat">
        <div className="msgs" aria-live="polite" ref={box}>
          {msgs.map((m, i) => <div key={i} className={`msg ${m.from} ${m.err ? 'err' : ''}`}>{m.text}</div>)}
        </div>
        <div className="chips">{SUGGEST.map((s) => <button key={s} className="chipbtn" onClick={() => ask(s)}>{s}</button>)}</div>
        <form className="chat-in" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about your journey…" aria-label="Your question" maxLength={300} />
          {SR && <button type="button" className="icon-btn" onClick={listen} aria-label="Speak your question"><Mic size={19} /></button>}
          <button className="btn primary" disabled={busy}><Send size={16} /> Send</button>
        </form>
      </Card>
    </>
  );
}

function AssistForm({ categories, onDone }) {
  const [v, setV] = useState({ category: categories[0], location: '', notes: '' });
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setRes(null);
    try {
      const r = await api('/assistance', { method: 'POST', body: v });
      setRes(r);
      setV({ ...v, notes: '' });
      onDone?.();
    } catch (x) { setErr(x.message); }
  };
  return (
    <form className="stack" onSubmit={submit}>
      <label className="field"><span>Type of assistance</span><select value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label className="field"><span>Where are you? (terminal, gate or area)</span><input value={v.location} onChange={(e) => setV({ ...v, location: e.target.value })} required maxLength={120} /></label>
      <label className="field"><span>Notes (optional)</span><textarea rows={3} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} maxLength={500} /></label>
      {err && <p className="form-err" role="alert">{err}</p>}
      {res && <p className="notice ok" role="status"><b>{res.request.id}</b> — {res.message}</p>}
      <button className="btn primary">Request assistance</button>
    </form>
  );
}

export function Care() {
  return (
    <>
      <PageHeader title="CARE & Safety" sub="Accessibility, passenger assistance and safety information." />
      <div className="grid3">
        <Card title="Accessibility" right={<Accessibility className="blue" />}><ul className="bul"><li>Request wheelchair or mobility assistance below.</li><li>Ask your airline for assistance at least 48 hours before travel where possible.</li><li>Ask staff for step-free routes at your airport.</li></ul></Card>
        <Card title="Passenger assistance" right={<LifeBuoy className="blue" />}><ul className="bul"><li>The assistance desk is shown on the Airport Twin map.</li><li>Uniformed staff can help with directions and transfers.</li></ul></Card>
        <Card title="Safety information" right={<ShieldAlert className="blue" />}><ul className="bul"><li>Keep belongings with you; report unattended items to staff.</li><li>Follow crew and airport staff instructions.</li><li>In any emergency call <b>112</b>.</li></ul></Card>
      </div>
      <Card title="Request special assistance"><AssistForm categories={['Wheelchair / mobility', 'Special assistance', 'Lost or separated', 'Other']} /></Card>
      <p className="notice"><Info size={15} /> Airport-specific contacts depend on the airport or provider and are not configured here. Contact your airline or the airport information desk.</p>
    </>
  );
}

export function Emergency() {
  const s = useAsync(() => api('/emergency'));
  return (
    <>
      <PageHeader title="Emergency" sub="Get help quickly." />
      <State s={s}>
        {(d) => (
          <div className="stack">
            <a className="sos" href="tel:112"><Phone size={30} /><div><b>Call 112</b><small>India’s national emergency number — police, fire, ambulance</small></div></a>
            <div className="grid3">
              {d.contacts.slice(1).map((c) => <a key={c.number} className="card qlink" href={`tel:${c.number}`}><Phone size={22} className="blue" /><div><b>{c.label}</b><small>{c.number}</small></div></a>)}
            </div>
            <Card title="Request assistance"><AssistForm categories={['Medical', 'Security', 'Wheelchair / mobility', 'Lost or separated', 'Other']} onDone={s.reload} /></Card>
            {d.requests.length > 0 && <Card title="Your recent requests"><ul className="alist">{d.requests.map((r) => <li key={r.id}><b>{r.id} · {r.category}</b><small>{r.location} · {fmtAgo(r.time)} · {r.status}</small></li>)}</ul></Card>}
            <p className="notice">{d.disclaimer}</p>
          </div>
        )}
      </State>
    </>
  );
}

export function Recovery() {
  const s = useAsync(() => api('/recovery'));
  return (
    <>
      <PageHeader title="Recovery Center" sub="Options when a connection is disrupted." badge="REFERENCE" />
      <State s={s}>
        {(r) => (
          <div className="stack">
            <Card title={r.disrupted ? 'Connection disrupted' : 'Connection on track'} right={<RiskBadge risk={r.risk} big />}>
              <p>{r.reason}</p>
              <p className="muted">Current safety buffer: <b>{r.bufferMin} min</b>. Affected flight: <b>{r.affectedFlight.flightNumber}</b> ({r.affectedFlight.origin} → {r.affectedFlight.destination}, departs {fmtTime(r.affectedFlight.estimatedDeparture)}).</p>
              {!r.disrupted && <Link className="btn ghost" to="/trip">Open Scenario Lab to test a disruption</Link>}
            </Card>
            {r.disrupted && (
              <Card title="Alternative journeys">
                {r.alternatives.length === 0
                  ? <p className="muted">No later same-route flight data is currently available. Contact the operating airline for rebooking.</p>
                  : <ul className="alist">{r.alternatives.map((f) => <li key={f.flightNumber}><b>{f.flightNumber} · {f.airline}</b><small>{f.origin} → {f.destination} · departs {fmtTime(f.estimatedDeparture)} · arrives {fmtTime(f.estimatedArrival)}</small></li>)}</ul>}
              </Card>
            )}
            <div className="grid3">
              <Card title="Baggage"><p className="muted">{r.baggage}</p></Card>
              <Card title="Hotel & transport"><p className="muted">{r.hotelTransport}</p><div className="row gap"><Link className="textlink" to="/hotels?airport=DEL">Hotels</Link><Link className="textlink" to="/transport?airport=DEL">Transport</Link></div></Card>
              <Card title="Assistance"><p className="muted">{r.assistance}</p><div className="row gap"><Link className="textlink" to="/care">CARE & Safety</Link><Link className="textlink" to="/emergency">Emergency</Link></div></Card>
            </div>
            <p className="notice">{r.disclaimer}</p>
          </div>
        )}
      </State>
    </>
  );
}

export function Profile() {
  const { user, logout } = useAuth();
  return (
    <>
      <PageHeader title="Profile" />
      <Card>
        <div className="row gap"><span className="avatar lg">{user.initials}</span><div><b>{user.name}</b><p className="muted">{user.email}</p></div></div>
        <div className="row gap"><button className="btn ghost" onClick={logout}>Sign out</button></div>
      </Card>
    </>
  );
}
