import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/ui.jsx';
import { useDocTitle } from '../hooks.js';

const UPDATED = '3 October 2026';

function LegalPage({ title, children }) {
  useDocTitle(title);
  return (
    <div className="legal">
      <header className="row gap legal-top"><Link to="/" aria-label="AeroNex home"><Logo small /></Link></header>
      <article className="card legal-card">
        <h1>{title}</h1>
        <p className="muted">Last updated {UPDATED}</p>
        {children}
        <p className="legal-note">This page is a plain-language starting point. Have it reviewed by a qualified lawyer, and replace the contact details, before you launch publicly.</p>
      </article>
      <footer className="legal-foot"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/">Home</Link></footer>
    </div>
  );
}

export function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <h2>What we collect</h2>
      <ul>
        <li><b>Account details:</b> your name, email address and a salted, hashed password.</li>
        <li><b>Trip data:</b> your trip settings, notifications and any assistance requests you submit, including the location and notes you type in.</li>
        <li><b>Technical data:</b> your IP address, used for rate limiting and security, and a session cookie that keeps you signed in.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To sign you in, show your journey, calculate connection risk and operate the service. We do not sell your data or use it for advertising.</p>
      <h2>Third-party services</h2>
      <p>To show weather, aircraft, hotels and map tiles, your browser or our server contacts providers such as Open-Meteo, airplanes.live, OpenStreetMap, and Google Fonts. These providers receive standard request data such as your IP address. When a flight-data provider key is configured, flight searches are sent to that provider.</p>
      <h2>Cookies and storage</h2>
      <p>We use one essential, HttpOnly session cookie. If you use the mobile app or a separate-domain version, a sign-in token is kept in your device storage instead. We do not use advertising cookies.</p>
      <h2>Retention and your choices</h2>
      <p>Your data is kept while your account exists. To access, correct or delete your data, contact us using the address below.</p>
      <h2>Emergencies</h2>
      <p>AeroNex is not connected to airport dispatch or emergency services. In an emergency call 112.</p>
      <h2>Contact</h2>
      <p>Email: <a href="mailto:Configure your support/privacy contact">Configure your support/privacy contact</a> (configured by the deployment owner).</p>
    </LegalPage>
  );
}

export function Terms() {
  return (
    <LegalPage title="Terms of Service">
      <h2>Using AeroNex</h2>
      <p>AeroNex is a passenger journey and airport connection tool. You must provide accurate account details and keep your password private.</p>
      <h2>Information is guidance, not a guarantee</h2>
      <ul>
        <li>Live, reference, estimated and scenario data are identified in the application. Scenario results are for testing and must not be treated as live airline events.</li>
        <li>Live data comes from third-party providers and can be delayed, incomplete or unavailable.</li>
        <li>Walking times and gate routes are estimates on a schematic map, not live indoor positioning.</li>
        <li>Connection risk is a calculation from the times shown. Always confirm with your airline, the airport displays and official announcements.</li>
      </ul>
      <h2>No ticketing or emergency service</h2>
      <p>Rebooking is done by the airline; AeroNex cannot issue or change tickets. Assistance requests are logged in AeroNex only. For urgent help call 112.</p>
      <h2>Acceptable use</h2>
      <p>Do not attempt to break, overload or scrape the service, access other users' data, or use it for unlawful purposes.</p>
      <h2>Availability and liability</h2>
      <p>The service is provided "as is" without warranty. To the extent permitted by law, AeroNex is not liable for missed flights, delays or losses arising from use of the service.</p>
      <h2>Changes</h2>
      <p>We may update these terms. Continued use after an update means you accept the new terms.</p>
      <h2>Contact</h2>
      <p>Email: <a href="mailto:Configure your support contact">Configure your support contact</a> (configured by the deployment owner).</p>
    </LegalPage>
  );
}
