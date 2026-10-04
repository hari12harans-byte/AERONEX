import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('AeroNex UI error:', error, info?.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="boot crash" role="alert">
        <h1>Something went wrong</h1>
        <p className="muted">AeroNex hit an unexpected error. Your trip data is safe on the server.</p>
        <div className="row gap">
          <button className="btn primary" onClick={() => window.location.reload()}>Reload page</button>
          <a className="btn ghost" href="/">Go to home</a>
        </div>
      </div>
    );
  }
}
