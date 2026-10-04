import React, { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Plane, Clock, Radar, Building2, MapPin, Luggage, Bus, BedDouble, Cloud, Bell, Bot, HeartHandshake, Phone, Search, ArrowRight, Menu, X, ChevronDown, LogOut, User, Sun, CloudSun, CloudRain, CloudFog, CloudLightning, Calendar } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { useClock, usePoll } from '../hooks.js';
import { Logo } from '../components/ui.jsx';

const ShellCtx = createContext({ unread: 0, refreshUnread: () => {} });
export const useShell = () => useContext(ShellCtx);

const NAV = [
  ['/dashboard', 'Home', Home], ['/trip', 'My Trip', Plane], ['/flight-status', 'Flight Status', Clock], ['/airspace', 'Live Airspace', Radar],
  ['/airport-twin', 'Airport Twin', Building2], ['/gate-navigation', 'Gate Navigation', MapPin], ['/baggage', 'Baggage', Luggage],
  ['/transport', 'Ground Transport', Bus], ['/hotels', 'Hotels', BedDouble], ['/weather', 'Weather', Cloud], ['/notifications', 'Notifications', Bell],
  ['/assistant', 'Travel Assistant', Bot], ['/care', 'CARE & Safety', HeartHandshake], ['/emergency', 'Emergency', Phone],
];

export function WeatherIcon({ code, size = 34 }) {
  const P = { size, strokeWidth: 1.7 };
  if (code === 0 || code === 1) return <Sun {...P} color="#ffc94d" />;
  if (code === 2) return <CloudSun {...P} color="#ffc94d" />;
  if (code === 45 || code === 48) return <CloudFog {...P} color="#9fb4d0" />;
  if (code >= 95) return <CloudLightning {...P} color="#ffc94d" />;
  if (code >= 51) return <CloudRain {...P} color="#6fb1ff" />;
  return <Cloud {...P} color="#c7d6ee" />;
}

function Sidebar({ open, onClose, unread }) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-top">
        <Logo />
        <button className="icon-btn only-mobile" onClick={onClose} aria-label="Close menu"><X size={20} /></button>
      </div>
      <nav>
        {NAV.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={label}>
            <Icon size={21} aria-hidden="true" />
            <span>{label}</span>
            {to === '/notifications' && unread > 0 && <b className="count" aria-label={`${unread} unread`}>{unread}</b>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function Header({ unread, onMenu }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const now = useClock();
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);
  const wx = usePoll(() => api('/weather?airport=MAA'), 600);
  const d = now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).replace(/^(\w+) /, '$1, ');
  const submit = (e) => { e.preventDefault(); if (q.trim()) nav(`/flight-status?q=${encodeURIComponent(q.trim())}`); };
  return (
    <header className="topbar">
      <button className="icon-btn only-mobile" onClick={onMenu} aria-label="Open menu"><Menu size={22} /></button>
      <form className="search" onSubmit={submit} role="search">
        <Search size={19} aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search flights, airlines, airports..." aria-label="Search flights, airlines, airports" maxLength={60} />
        <button type="submit" className="go" aria-label="Search"><ArrowRight size={18} /></button>
      </form>
      <div className="chip weather" aria-label="Weather at Chennai">
        {wx.data ? <WeatherIcon code={wx.data.current.code} /> : <Cloud size={34} color="#c7d6ee" />}
        <div>
          <b>Chennai (MAA)</b>
          {wx.data ? <><div className="big-sm">{wx.data.current.tempC}°C</div><small>{wx.data.current.condition}</small></> : <small>{wx.status === 'error' ? 'Weather unavailable' : 'Loading…'}</small>}
        </div>
      </div>
      <div className="chip clock" aria-label="Current time">
        <Clock size={30} strokeWidth={1.6} aria-hidden="true" />
        <div><small>{d}</small><div className="big">{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div></div>
      </div>
      <button className="chip bell" onClick={() => nav('/notifications')} aria-label={`Notifications, ${unread} unread`}>
        <Bell size={24} />{unread > 0 && <b className="count top">{unread}</b>}
      </button>
      <div className="profile-wrap">
        <button className="chip profile" onClick={() => setMenu((v) => !v)} aria-haspopup="menu" aria-expanded={menu}>
          <span className="avatar">{user.initials}</span>
          <div className="who"><small>Hello,</small><b>{user.name.split(' ')[0]}</b></div>
          <ChevronDown size={16} />
        </button>
        {menu && (
          <div className="menu" role="menu" onMouseLeave={() => setMenu(false)}>
            <div className="menu-head"><b>{user.name}</b><small>{user.email}</small></div>
            <button role="menuitem" onClick={() => { setMenu(false); nav('/profile'); }}><User size={16} /> Profile</button>
            <button role="menuitem" onClick={() => { setMenu(false); nav('/notifications'); }}><Bell size={16} /> Notifications</button>
            <button role="menuitem" onClick={async () => { await logout(); nav('/'); }}><LogOut size={16} /> Sign out</button>
          </div>
        )}
      </div>
    </header>
  );
}

export default function Shell() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const n = usePoll(() => api('/notifications'), 30);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  const unread = n.data?.unread ?? 0;
  return (
    <ShellCtx.Provider value={{ unread, refreshUnread: n.reload }}>
      <div className="app">
        {open && <div className="scrim" onClick={() => setOpen(false)} />}
        <Sidebar open={open} onClose={() => setOpen(false)} unread={unread} />
        <div className="main">
          <Header unread={unread} onMenu={() => setOpen(true)} />
          <main key={loc.pathname} className="page-enter"><Outlet /></main>
        </div>
      </div>
    </ShellCtx.Provider>
  );
}
