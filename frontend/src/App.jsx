import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Shell from './layouts/Shell.jsx';
import Landing from './pages/Landing.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NotFound from './pages/NotFound.jsx';
import { Privacy, Terms } from './pages/Legal.jsx';

const Trip = lazy(() => import('./pages/Trip.jsx'));
const FlightStatus = lazy(() => import('./pages/FlightStatus.jsx'));
const AirspacePage = lazy(() => import('./pages/AirspacePage.jsx'));
const Twin = lazy(() => import('./pages/Twin.jsx'));
const GateNavigation = lazy(() => import('./pages/GateNavigation.jsx'));
const Baggage = lazy(() => import('./pages/Services.jsx').then((m) => ({ default: m.Baggage })));
const Transport = lazy(() => import('./pages/Services.jsx').then((m) => ({ default: m.Transport })));
const Hotels = lazy(() => import('./pages/Services.jsx').then((m) => ({ default: m.Hotels })));
const Weather = lazy(() => import('./pages/Services.jsx').then((m) => ({ default: m.Weather })));
const Notifications = lazy(() => import('./pages/Support.jsx').then((m) => ({ default: m.Notifications })));
const Assistant = lazy(() => import('./pages/Support.jsx').then((m) => ({ default: m.Assistant })));
const Care = lazy(() => import('./pages/Support.jsx').then((m) => ({ default: m.Care })));
const Emergency = lazy(() => import('./pages/Support.jsx').then((m) => ({ default: m.Emergency })));
const Recovery = lazy(() => import('./pages/Support.jsx').then((m) => ({ default: m.Recovery })));
const Profile = lazy(() => import('./pages/Support.jsx').then((m) => ({ default: m.Profile })));

function Protected({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="boot" role="status">Loading AeroNex…</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname + loc.search }} replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<div className="boot" role="status">Loading…</div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route element={<Protected><Shell /></Protected>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/trip" element={<Trip />} />
          <Route path="/flight-status" element={<FlightStatus />} />
          <Route path="/airspace" element={<AirspacePage />} />
          <Route path="/airport-twin" element={<Twin />} />
          <Route path="/gate-navigation" element={<GateNavigation />} />
          <Route path="/baggage" element={<Baggage />} />
          <Route path="/transport" element={<Transport />} />
          <Route path="/hotels" element={<Hotels />} />
          <Route path="/weather" element={<Weather />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/care" element={<Care />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route path="/recovery" element={<Recovery />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
