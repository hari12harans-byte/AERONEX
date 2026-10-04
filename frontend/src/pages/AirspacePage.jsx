import React from 'react';
import Airspace from '../components/Airspace.jsx';
import { PageHeader } from '../components/ui.jsx';
import { api } from '../api.js';
import { useAsync } from '../hooks.js';

export default function AirspacePage() {
  const trip = useAsync(() => api('/trip'));
  return (
    <>
      <PageHeader title="Live Airspace" sub="Real ADS-B aircraft positions. Your trip route is drawn as a dashed line." badge="LIVE" />
      <Airspace trip={trip.data} />
    </>
  );
}
