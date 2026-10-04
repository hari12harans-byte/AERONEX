import React from 'react';
import { Link } from 'react-router-dom';

export const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—');
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—');
export const fmtAgo = (iso) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
};

export function Logo({ small }) {
  return (
    <div className={`logo ${small ? 'small' : ''}`}>
      <svg viewBox="0 0 64 64" width={small ? 34 : 46} height={small ? 34 : 46} aria-hidden="true">
        <path d="M14 56 32 8l18 48h-8l-3-8H25l-3 8z" fill="none" stroke="#168FFF" strokeWidth="5" strokeLinejoin="round" />
        <path d="M4 42C24 38 44 26 62 8 50 28 32 42 14 50z" fill="#fff" />
      </svg>
      <div>
        <div className="logo-name">Aero<span>Nex</span></div>
        {!small && <div className="logo-tag">YOUR NEXT CONNECTION.<br />ALWAYS ON TIME.</div>}
      </div>
    </div>
  );
}

export function SourceBadge({ kind }) {
  const cls = { LIVE: 'live', REFERENCE: 'ref', USER: 'user', ESTIMATED: 'ref', SCENARIO: 'demo', OFFLINE: 'demo', LAST_KNOWN: 'warn' }[kind] || 'ref';
  const text = ({ LIVE: 'LIVE', REFERENCE: 'REFERENCE', USER: 'YOUR DATA', ESTIMATED: 'ESTIMATED', SCENARIO: 'SCENARIO', OFFLINE: 'OFFLINE', LAST_KNOWN: 'LAST KNOWN' }[kind] || kind);
  return <span className={`badge ${cls}`}>{text}</span>;
}

export function StatusPill({ status }) {
  const cls = { 'ON TIME': 'ok', BOARDING: 'info', DELAYED: 'warn', DEPARTED: 'info', LANDED: 'ok', CANCELLED: 'bad' }[status] || 'info';
  return <span className={`pill ${cls}`}>{status}</span>;
}

export function RiskBadge({ risk, big }) {
  const cls = { LOW: 'ok', MEDIUM: 'warn', HIGH: 'hi', CRITICAL: 'bad' }[risk];
  return <span className={`risk ${cls} ${big ? 'big' : ''}`}>{risk}</span>;
}

export function PageHeader({ title, sub, badge, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      <div className="row gap">{badge && <SourceBadge kind={badge} />}{children}</div>
    </div>
  );
}

/** Renders loading / error / empty / success for any async state. */
export function State({ s, children, isEmpty, empty = 'Nothing to show yet.', strict = false }) {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (s.status === 'loading') return <div className="state skeleton" role="status" aria-live="polite"><span /><span /><span /></div>;
  if (s.status === 'error' && (strict || !s.data)) {
    return (
      <div className="state err" role="alert">
        <p>{offline ? 'You appear to be offline.' : s.error}</p>
        <button className="btn ghost" onClick={s.reload}>Retry</button>
      </div>
    );
  }
  if (isEmpty && isEmpty(s.data)) return <div className="state" role="status">{empty}</div>;
  return children(s.data);
}

export function Card({ title, right, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || right) && <header className="card-h"><h2>{title}</h2><div className="row gap">{right}</div></header>}
      {children}
    </section>
  );
}

export function AirportSelect({ airports, value, onChange, label = 'Airport', id }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {airports.length === 0 && <option value={value}>{value}</option>}
        {airports.map((a) => <option key={a.iata} value={a.iata}>{a.iata} - {a.city}</option>)}
      </select>
    </label>
  );
}

export const TextLink = ({ to, children }) => <Link className="textlink" to={to}>{children}</Link>;
