import { FunctionalComponent } from 'preact';

interface LogoProps {
  size?: number;
  className?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

// VVCE Gear & Torch Crest Logo (from Reference Poster 2)
export const VvceLogo: FunctionalComponent<LogoProps> = ({ size = 56, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={className}
    style={{ display: 'block', flexShrink: 0, filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6))' }}
  >
    <defs>
      <radialGradient id="vvceGold" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff8cc" />
        <stop offset="50%" stop-color="#ffd700" />
        <stop offset="85%" stop-color="#ffb81f" />
        <stop offset="100%" stop-color="#cc8800" />
      </radialGradient>
      <linearGradient id="vvceGreen" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#16a34a" />
        <stop offset="100%" stop-color="#0f5132" />
      </linearGradient>
    </defs>
    {/* Outer Gear Rim */}
    <circle cx="50" cy="50" r="46" fill="#040c1a" stroke="url(#vvceGold)" stroke-width="2.5" />
    {/* Cogwheel Teeth */}
    <g stroke="url(#vvceGold)" stroke-width="3" stroke-linecap="round">
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
    <circle cx="50" cy="50" r="38" fill="none" stroke="url(#vvceGreen)" stroke-width="3" stroke-dasharray="4 2" />
    {/* Inner Shield */}
    <path
      d="M32 26 H68 V54 Q68 74 50 82 Q32 74 32 54 Z"
      fill="#061226"
      stroke="url(#vvceGold)"
      stroke-width="2"
    />
    {/* Torch / Flame of Knowledge */}
    <path d="M46 44 L54 44 L52 64 L48 64 Z" fill="url(#vvceGold)" />
    <path d="M50 30 Q56 36 50 44 Q44 36 50 30 Z" fill="#ff435a" />
    <circle cx="50" cy="38" r="3" fill="#ffd700" />
    {/* VVCE Acronym */}
    <text
      x="50"
      y="91"
      text-anchor="middle"
      fill="url(#vvceGold)"
      font-size="8.5"
      font-weight="900"
      letter-spacing="1.2"
      font-family="'Rajdhani', sans-serif"
    >
      VVCE
    </text>
  </svg>
);

// Department of Computer Science & Engineering Hexagon Logo (from Reference Poster 2)
export const CsLogo: FunctionalComponent<LogoProps> = ({ size = 56, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={className}
    style={{ display: 'block', flexShrink: 0, filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.4))' }}
  >
    <defs>
      <linearGradient id="csCyan" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#bbf2ff" />
        <stop offset="50%" stop-color="#00f0ff" />
        <stop offset="100%" stop-color="#0284c7" />
      </linearGradient>
    </defs>
    {/* Outer Double Cyber Hexagon */}
    <polygon
      points="50,4 92,26 92,74 50,96 8,74 8,26"
      fill="#040b18"
      stroke="url(#csCyan)"
      stroke-width="3"
    />
    <polygon
      points="50,11 85,29 85,71 50,89 15,71 15,29"
      fill="none"
      stroke="rgba(0, 240, 255, 0.4)"
      stroke-width="1.2"
      stroke-dasharray="6 3"
    />
    {/* Circuit nodes & tracks */}
    <circle cx="50" cy="22" r="2.5" fill="#00f0ff" />
    <circle cx="28" cy="74" r="2.5" fill="#00f0ff" />
    <circle cx="72" cy="74" r="2.5" fill="#00f0ff" />
    <line x1="50" y1="22" x2="50" y2="30" stroke="#00f0ff" stroke-width="1.5" />
    
    {/* Monogram Box with CS */}
    <rect x="26" y="34" width="48" height="32" rx="4" fill="rgba(0, 240, 255, 0.08)" stroke="url(#csCyan)" stroke-width="1.5" />
    <text
      x="50"
      y="57"
      text-anchor="middle"
      fill="#ffffff"
      font-size="20"
      font-weight="900"
      font-family="'Orbitron', 'Rajdhani', sans-serif"
      letter-spacing="1"
      filter="drop-shadow(0 0 6px #00f0ff)"
    >
      CS
    </text>
    {/* Subtitle */}
    <text
      x="50"
      y="82"
      text-anchor="middle"
      fill="#00f0ff"
      font-size="6.5"
      font-weight="700"
      font-family="'Rajdhani', sans-serif"
      letter-spacing="1"
    >
      VVCE MYSURU
    </text>
  </svg>
);

// Invictors Club Circular 3D Metallic Medallion (from Reference Poster 2)
export const InvictorsLogo: FunctionalComponent<LogoProps> = ({
  size = 88,
  className = '',
  onClick,
  onDoubleClick
}) => {
  let lastTap = 0;
  const handleTouchEnd = () => {
    const now = Date.now();
    if (now - lastTap < 350) {
      if (onDoubleClick) onDoubleClick();
    }
    lastTap = now;
  };

  return (
    <div
      className={`invictors-logo-wrap ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        cursor: 'pointer',
        display: 'inline-block',
        userSelect: 'none',
        filter: 'drop-shadow(0 0 16px rgba(255, 184, 31, 0.45))'
      }}
      onClick={onClick}
      onDblClick={onDoubleClick}
      onTouchEnd={handleTouchEnd}
      title="Invictors Club VVCE (Double-click for Admin Access)"
    >
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }}>
        <defs>
          <radialGradient id="invGoldGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#fff8d4" />
            <stop offset="35%" stop-color="#ffd700" />
            <stop offset="70%" stop-color="#ffb81f" />
            <stop offset="100%" stop-color="#b87700" />
          </radialGradient>
          <radialGradient id="invInnerDisc" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#0a1d3d" />
            <stop offset="80%" stop-color="#040c1d" />
            <stop offset="100%" stop-color="#020611" />
          </radialGradient>
          <linearGradient id="invCyanBeam" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#99f6ff" />
            <stop offset="100%" stop-color="#00f0ff" />
          </linearGradient>
        </defs>

        {/* Outer 3D Metallic Gold Ring */}
        <circle cx="50" cy="50" r="48" fill="none" stroke="url(#invGoldGrad)" stroke-width="3.5" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="#030712" stroke-width="1" />
        <circle cx="50" cy="50" r="44" fill="url(#invInnerDisc)" />

        {/* Fine notched tick marks around ring */}
        <circle cx="50" cy="50" r="42" fill="none" stroke="url(#invGoldGrad)" stroke-width="0.8" stroke-dasharray="1.5 3" />

        {/* 3D Angled Orbital Ring with Nodes */}
        <ellipse
          cx="50"
          cy="48"
          rx="38"
          ry="17"
          fill="none"
          stroke="url(#invGoldGrad)"
          stroke-width="2"
          transform="rotate(-24 50 48)"
        />
        <circle cx="17" cy="38" r="3" fill="#00f0ff" />
        <circle cx="83" cy="58" r="3" fill="url(#invGoldGrad)" />

        {/* Gear motifs in background */}
        <g stroke="rgba(255, 184, 31, 0.4)" stroke-width="1.2" fill="none">
          <circle cx="70" cy="36" r="6" />
          <line x1="70" y1="28" x2="70" y2="44" />
          <line x1="62" y1="36" x2="78" y2="36" />
        </g>

        {/* Central Stylized 3D Metallic "I" Monogram */}
        <path
          d="M40 26 H60 L54 36 H53 V60 H58 L60 68 H40 L42 60 H47 V36 H46 Z"
          fill="url(#invGoldGrad)"
          stroke="#030712"
          stroke-width="1"
        />

        {/* Central Tech Core Crosshair */}
        <circle cx="50" cy="48" r="4" fill="#040c1d" stroke="#00f0ff" stroke-width="1.5" />
        <circle cx="50" cy="48" r="1.5" fill="#00f0ff" />

        {/* Engraved Metallic Ribbon for "INVICTORS" */}
        <path
          d="M20 70 L50 67 L80 70 L77 82 L50 80 L23 82 Z"
          fill="#040b18"
          stroke="url(#invGoldGrad)"
          stroke-width="1.5"
        />
        <text
          x="50"
          y="77"
          text-anchor="middle"
          fill="url(#invGoldGrad)"
          font-size="8"
          font-weight="900"
          font-family="'Orbitron', 'Rajdhani', sans-serif"
          letter-spacing="2"
        >
          INVICTORS
        </text>

        {/* Motto Bottom Arc */}
        <text
          x="50"
          y="91"
          text-anchor="middle"
          fill="#8ca3c7"
          font-size="4.5"
          font-weight="700"
          font-family="'Rajdhani', sans-serif"
          letter-spacing="0.8"
        >
          DECODE · INNOVATE · OVERCOME
        </text>
      </svg>
    </div>
  );
};
