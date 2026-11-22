'use client';

import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

// VVCE Gear & Torch Crest Logo (from Reference Poster 2)
export const VvceLogo: React.FC<LogoProps> = ({ size = 56, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={className}
    style={{ display: 'block', flexShrink: 0, filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6))' }}
  >
    <defs>
      <radialGradient id="vvceGold" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fff8cc" />
        <stop offset="50%" stopColor="#ffd700" />
        <stop offset="85%" stopColor="#ffb81f" />
        <stop offset="100%" stopColor="#cc8800" />
      </radialGradient>
      <linearGradient id="vvceGreen" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#16a34a" />
        <stop offset="100%" stopColor="#0f5132" />
      </linearGradient>
    </defs>
    {/* Outer Gear Rim */}
    <circle cx="50" cy="50" r="46" fill="#040c1a" stroke="url(#vvceGold)" strokeWidth="2.5" />
    {/* Cogwheel Teeth */}
    <g stroke="url(#vvceGold)" strokeWidth="3" strokeLinecap="round">
      <line x1="50" y1="3" x2="50" y2="8" />
      <line x1="50" y1="92" x2="50" y2="97" />
      <line x1="3" y1="50" x2="8" y2="50" />
      <line x1="92" y1="50" x2="97" y2="50" />
      <line x1="17" y1="17" x2="21" y2="21" />
      <line x1="79" y1="79" x2="83" y2="83" />
      <line x1="17" y1="83" x2="21" y2="79" />
      <line x1="79" y1="21" x2="83" y2="17" />
    </g>
    {/* Inner Laurel / Green Ring */}
    <circle cx="50" cy="50" r="38" fill="none" stroke="url(#vvceGreen)" strokeWidth="3" strokeDasharray="4 2" />
    {/* Inner Shield */}
    <path
      d="M32 26 H68 V54 Q68 74 50 82 Q32 74 32 54 Z"
      fill="#061226"
      stroke="url(#vvceGold)"
      strokeWidth="2"
    />
    {/* Torch / Flame of Knowledge */}
    <path d="M46 44 L54 44 L52 64 L48 64 Z" fill="url(#vvceGold)" />
    <path d="M50 30 Q56 36 50 44 Q44 36 50 30 Z" fill="#ff435a" />
    <circle cx="50" cy="38" r="3" fill="#ffd700" />
    {/* VVCE Acronym */}
    <text
      x="50"
      y="91"
      textAnchor="middle"
      fill="url(#vvceGold)"
      fontSize="8.5"
      fontWeight="900"
      letterSpacing="1.2"
      fontFamily="'Rajdhani', sans-serif"
    >
      VVCE
    </text>
  </svg>
);

// Department of Computer Science & Engineering Hexagon Logo (from Reference Poster 2)
export const CsLogo: React.FC<LogoProps> = ({ size = 56, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={className}
    style={{ display: 'block', flexShrink: 0, filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.4))' }}
  >
    <defs>
      <linearGradient id="csCyan" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#bbf2ff" />
        <stop offset="50%" stopColor="#00f0ff" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
    </defs>
    {/* Outer Double Cyber Hexagon */}
    <polygon
      points="50,4 92,26 92,74 50,96 8,74 8,26"
      fill="#040b18"
      stroke="url(#csCyan)"
      strokeWidth="3"
    />
    <polygon
      points="50,11 85,29 85,71 50,89 15,71 15,29"
      fill="none"
      stroke="rgba(0, 240, 255, 0.4)"
      strokeWidth="1.2"
      strokeDasharray="6 3"
    />
    {/* Circuit nodes & tracks */}
    <circle cx="50" cy="22" r="2.5" fill="#00f0ff" />
    <circle cx="28" cy="74" r="2.5" fill="#00f0ff" />
    <circle cx="72" cy="74" r="2.5" fill="#00f0ff" />
    <line x1="50" y1="22" x2="50" y2="30" stroke="#00f0ff" strokeWidth="1.5" />
    
    {/* Monogram Box with CS */}
    <rect x="26" y="34" width="48" height="32" rx="4" fill="rgba(0, 240, 255, 0.08)" stroke="url(#csCyan)" strokeWidth="1.5" />
    <text
      x="50"
      y="57"
      textAnchor="middle"
      fill="#ffffff"
      fontSize="20"
      fontWeight="900"
      fontFamily="'Orbitron', 'Rajdhani', sans-serif"
      letterSpacing="1"
      filter="drop-shadow(0 0 6px #00f0ff)"
    >
      CS
    </text>
    {/* Subtitle */}
    <text
      x="50"
      y="82"
      textAnchor="middle"
      fill="#00f0ff"
      fontSize="6.5"
      fontWeight="700"
      fontFamily="'Rajdhani', sans-serif"
      letterSpacing="1"
    >
      VVCE MYSURU
    </text>
  </svg>
);

// Official Invictors Club 3D Metallic Medallion Emblem
export const InvictorsLogo: React.FC<LogoProps> = ({
  size = 88,
  className = '',
  onClick,
  onDoubleClick
}) => {
  return (
    <div
      className={`invictors-logo-wrap ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        cursor: onClick ? 'pointer' : 'default',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        borderRadius: '50%',
        overflow: 'hidden',
        boxShadow: '0 0 16px rgba(255, 184, 31, 0.45)',
        flexShrink: 0
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title="Invictors Club · Dept. of CSE, VVCE Mysuru"
    >
      <img
        src="/assets/invictors-logo.jpg"
        alt="Invictors Club VVCE"
        width={size}
        height={size}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          borderRadius: '50%'
        }}
      />
    </div>
  );
};
