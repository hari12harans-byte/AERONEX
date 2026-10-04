import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/ui.jsx';
import { useDocTitle } from '../hooks.js';

export default function NotFound() {
  useDocTitle('Page not found');
  return (
    <div className="boot notfound">
      <Logo />
      <h1>404 — Page not found</h1>
      <p className="muted">The page you are looking for does not exist or has moved.</p>
      <div className="row gap wrap"><Link className="btn primary" to="/dashboard">Go to dashboard</Link><Link className="btn ghost" to="/">Home</Link></div>
    </div>
  );
}
