import React from 'react';

/**
 * Airport dusk scene built from SVG/CSS. If you drop a real photo at
 * frontend/public/hero/aeronex-airport-hero.png it is layered on top automatically.
 */
function Airliner() {
  return (
    <svg viewBox="0 0 520 170" className="airliner" aria-hidden="true">
      <defs>
        <linearGradient id="fus" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".6" stopColor="#e4ecf7" /><stop offset="1" stopColor="#a9bbd3" /></linearGradient>
        <linearGradient id="wing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f4f8fd" /><stop offset="1" stopColor="#8ea6c6" /></linearGradient>
      </defs>
      <path d="M392 70 470 6l22 2-34 66z" fill="#0b4f93" />
      <path d="M440 70 500 20l12 2-26 52z" fill="url(#wing)" opacity=".9" />
      <path d="M150 92 300 150l30 6-18-62z" fill="url(#wing)" />
      <path d="M170 100 262 150l22 2-30-56z" fill="#6f87a8" opacity=".55" />
      <path d="M20 86C40 66 110 58 250 58l180 6c44 2 74 10 84 22-10 12-40 20-84 22l-180 6C110 114 40 106 20 86z" fill="url(#fus)" />
      <path d="M40 88c50-6 300-8 470-2" stroke="#168FFF" strokeWidth="3" fill="none" opacity=".8" />
      <path d="M24 84c8-10 26-17 52-20l-6 18z" fill="#2b4466" />
      <ellipse cx="238" cy="118" rx="34" ry="12" fill="#c6d3e4" />
      <ellipse cx="206" cy="118" rx="6" ry="11" fill="#566b8a" />
      {Array.from({ length: 22 }).map((_, i) => <circle key={i} cx={100 + i * 14} cy="78" r="2.2" fill="#2b4466" opacity=".7" />)}
    </svg>
  );
}

export default function HeroScene() {
  const lights = Array.from({ length: 60 });
  return (
    <div className="scene" aria-hidden="true">
      <div className="sky" />
      <div className="glow" />
      <svg className="skyline" viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="term" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a5483" /><stop offset="1" stopColor="#14274a" /></linearGradient>
          <linearGradient id="win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd58a" /><stop offset="1" stopColor="#f59f3b" /></linearGradient>
        </defs>
        <rect x="0" y="330" width="1600" height="90" fill="#16233f" />
        <path d="M0 330h1600v10H0z" fill="#2a3f63" opacity=".6" />
        {/* terminal */}
        <path d="M60 330V230L260 190H980l180 40v100z" fill="url(#term)" />
        {Array.from({ length: 44 }).map((_, i) => <rect key={i} x={90 + i * 24} y="236" width="14" height="70" fill="url(#win)" opacity={0.55 + ((i * 37) % 10) / 25} />)}
        <rect x="60" y="312" width="1100" height="6" fill="#ffb74d" opacity=".7" />
        {/* tower */}
        <rect x="1220" y="150" width="18" height="180" fill="#16294a" />
        <path d="M1195 150h68l-8-38h-52z" fill="#1d3558" />
        <rect x="1207" y="118" width="44" height="18" fill="#ffd58a" opacity=".85" />
        {/* distant aircraft on apron */}
        <path d="M1320 322c20-12 80-14 140-6l-30 8z" fill="#c9d6e8" opacity=".85" />
        <path d="M1440 318l26-26 8 2-12 26z" fill="#0b4f93" />
        <path d="M1700 330" />
      </svg>
      <div className="runway">
        {lights.map((_, i) => <i key={i} style={{ left: `${(i / 59) * 100}%`, animationDelay: `${(i % 10) * 0.2}s` }} />)}
      </div>
      <div className="photo" />
      <div className="plane-track">
        <div className="plane">
          <div className="trail t1" /><div className="trail t2" />
          <Airliner />
        </div>
      </div>
      <div className="shade" />
    </div>
  );
}
