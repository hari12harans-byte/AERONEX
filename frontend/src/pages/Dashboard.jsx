import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plane, Building2, Luggage, Bus, BedDouble, CheckCircle2, AlertTriangle, MapPin, Bell, Clock, Phone, Bot, HeartHandshake } from 'lucide-react';
import HeroScene from '../components/HeroScene.jsx';
import FlightSearch from '../components/FlightSearch.jsx';
import Airspace from '../components/Airspace.jsx';
import Guardian from '../components/Guardian.jsx';
import { api } from '../api.js';
import { useAsync } from '../hooks.js';
import { Card, State, StatusPill, RiskBadge, SourceBadge, fmtTime } from '../components/ui.jsx';

const CARDS = [
  ['/flight-status', 'Flight Status', 'Live updates, delays, gates', Plane, 'fc-flight'],
  ['/airport-twin', 'Airport Digital Twin', 'Navigate inside the airport', Building2, 'fc-twin'],
  ['/baggage', 'Baggage Tracking', 'Track your bags in real-time', Luggage, 'fc-bag'],
  ['/transport', 'Ground Transport', 'Buses, taxis, train & more', Bus, 'fc-bus'],
  ['/hotels', 'Hotels Near Airport', 'Stay close, travel easy', BedDouble, 'fc-hotel'],
];

export default function Dashboard() {
  const trip = useAsync(() => api('/trip'));
  const alerts = useAsync(() => api('/notifications'));
  const [count, setCount] = useState(null);
  const t = trip.data;
  return (
    <div className="dash">
      <div className="scene-bg"><HeroScene /></div>
      <div className="stage">
        <div className="hero-col">
          <h1 className="hero-title">Aero<span>Nex</span></h1>
          <h2 className="hero-line">Your Next Connection,<br />Always On Time.</h2>
          <p className="hero-sub">Real-time flights. Smarter connections. Seamless journeys.</p>
        </div>
        <div className="search-col"><FlightSearch compactAircraft={count} /></div>
        <div className="air-col"><Airspace compact trip={t} onCount={setCount} /></div>
        <div className="cards-col">
          {CARDS.map(([to, title, desc, Icon, cls]) => (
            <Link key={to} to={to} className={`fcard ${cls}`}>
              <div className="fimg" />
              <div className="fbody"><span className="ficon"><Icon size={22} /></span><div><b>{title}</b><small>{desc}</small></div><ArrowRight size={18} /></div>
            </Link>
          ))}
        </div>
      </div>

      <div className="sections">
        <State s={trip}>
          {(tr) => (
            <>
              <Card title="Journey at a glance" right={<SourceBadge kind={tr.source} />} className="glance">
                <div className="glance-grid">
                  <Tile icon={Plane} q="What flight am I taking?" a={`${tr.legs[0].flightNumber} · ${tr.legs[0].airline}`} />
                  <Tile icon={MapPin} q="Where am I going?" a={`${tr.route.join(' → ')}`} />
                  <Tile icon={Clock} q="Is my flight on time?" a={<><StatusPill status={tr.legs[0].status} /> {tr.legs[0].delayMinutes ? `${tr.legs[0].delayMinutes} min late` : ''}</>} />
                  <Tile icon={Clock} q="Connection time" a={`${tr.connection.availableMin} min available`} />
                  <Tile icon={tr.connection.risk === 'LOW' ? CheckCircle2 : AlertTriangle} q="Connection at risk?" a={<RiskBadge risk={tr.connection.risk} />} />
                  <Tile icon={MapPin} q="Next gate" a={`Gate ${tr.connection.departureGate} · ${fmtTime(tr.connection.boardingCloses)} cut-off`} />
                  <Tile icon={Luggage} q="Where is my baggage?" a={`${tr.baggage.status} · ${tr.baggage.location}`} />
                  <Tile icon={Bell} q="Alerts" a={`${tr.unreadAlerts} unread`} />
                </div>
                <p className="next-action"><b>What should I do next?</b> {tr.nextAction}</p>
              </Card>
              <Guardian trip={tr} />
            </>
          )}
        </State>
        <Card title="Latest alerts" right={<Link className="textlink" to="/notifications">All notifications</Link>}>
          <State s={alerts} isEmpty={(d) => !d.items.length} empty="No notifications yet.">
            {(d) => <ul className="alist">{d.items.slice(0, 4).map((n) => <li key={n.id} className={n.read ? '' : 'unread'}><b>{n.title}</b><small>{n.body}</small></li>)}</ul>}
          </State>
        </Card>
        <div className="quick">
          <Link to="/care" className="card qlink"><HeartHandshake size={26} className="blue" /><div><b>CARE & Safety</b><small>Accessibility and passenger assistance</small></div></Link>
          <Link to="/assistant" className="card qlink"><Bot size={26} className="blue" /><div><b>Travel Assistant</b><small>Ask about your gate, delay or baggage</small></div></Link>
          <Link to="/emergency" className="card qlink danger-edge"><Phone size={26} className="red" /><div><b>Emergency</b><small>Call 112 · request assistance</small></div></Link>
        </div>
      </div>
    </div>
  );
}

function Tile({ icon: I, q, a }) {
  return <div className="tile"><I size={20} className="blue" /><div><small>{q}</small><b>{a}</b></div></div>;
}
