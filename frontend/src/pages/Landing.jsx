import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, Radar, ShieldCheck, Luggage, Building2, Bot, LifeBuoy } from 'lucide-react';
import HeroScene from '../components/HeroScene.jsx';
import { Logo } from '../components/ui.jsx';
import { useAuth } from '../auth.jsx';

const FEATURES = [
  [ShieldCheck, 'Connection Guardian', 'Flight change → journey impact → connection risk → passenger action.'],
  [Radar, 'Live Airspace', 'Real ADS-B traffic around your airport, on an interactive map.'],
  [Building2, 'Airport Digital Twin', 'Gates, security, food and facilities with walking estimates.'],
  [Luggage, 'Baggage & transfers', 'Follow your bag through the journey stages.'],
  [Bot, 'Travel Assistant', 'Ask about your gate, delay or buffer in plain language.'],
  [LifeBuoy, 'Recovery Center', 'Clear options and next steps when a connection breaks.'],
];

export default function Landing() {
  const { user, loading, login } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" replace />;
  const demoEnter = async () => {
    try { await login('saravanan@aeronex.ai', 'demo123'); } catch (e) { console.error(e); }
  };
  return (
    <div className="landing">
      <HeroScene />
      <header className="land-top"><Logo /><div className="row gap"><button type="button" className="btn ghost" onClick={demoEnter}>Demo Console</button><Link className="btn ghost" to="/login">Log in</Link><Link className="btn primary" to="/register">Get Started</Link></div></header>
      <section className="land-hero">
        <h1 className="hero-title">Aero<span>Nex</span></h1>
        <h2 className="hero-line">Your Next Connection,<br />Always On Time.</h2>
        <p className="hero-sub">An intelligent passenger journey and airport connection platform. Real-time flights. Smarter connections. Seamless journeys.</p>
        <div className="row gap wrap">
          <button type="button" className="btn primary lg" onClick={demoEnter}>Launch Live Console <ArrowRight size={18} /></button>
          <Link className="btn ghost lg" to="/register">Get Started</Link>
          <Link className="btn ghost lg" to="/login">I already have an account</Link>
        </div>
      </section>
      <section className="land-feats">
        {FEATURES.map(([I, t, d]) => <div className="card feat" key={t}><I size={26} className="blue" /><h3>{t}</h3><p className="muted">{d}</p></div>)}
      </section>
      <footer className="site-foot"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><span className="muted">© {new Date().getFullYear()} AeroNex</span></footer>
    </div>
  );
}
