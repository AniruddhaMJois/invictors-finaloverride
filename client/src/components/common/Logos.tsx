import { FunctionalComponent } from 'preact';

interface LogoProps {
  size?: number;
  className?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

// VVCE Gear & Torch Crest Logo
export const VvceLogo: FunctionalComponent<LogoProps> = ({ size = 56, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={className}
    style={{ display: 'block', flexShrink: 0 }}
  >
    <defs>
      <radialGradient id="vvceGold" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff3b0" />
        <stop offset="60%" stop-color="#ffb81f" />
        <stop offset="100%" stop-color="#ff8a00" />
      </radialGradient>
      <linearGradient id="vvceBlue" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#27b4ff" />
        <stop offset="100%" stop-color="#1d4f8f" />
      </linearGradient>
    </defs>
    {/* Outer Gear */}
    <circle cx="50" cy="50" r="46" fill="#08142c" stroke="url(#vvceGold)" stroke-width="3" />
    <g stroke="url(#vvceGold)" stroke-width="4" stroke-linecap="round">
      <line x1="50" y1="2" x2="50" y2="8" />
      <line x1="50" y1="92" x2="50" y2="98" />
      <line x1="2" y1="50" x2="8" y2="50" />
      <line x1="92" y1="50" x2="98" y2="50" />
      <line x1="16" y1="16" x2="21" y2="21" />
      <line x1="79" y1="79" x2="84" y2="84" />
      <line x1="16" y1="84" x2="21" y2="79" />
      <line x1="79" y1="21" x2="84" y2="16" />
    </g>
    {/* Inner Crest Shield */}
    <path
      d="M32 28 H68 V56 Q68 74 50 82 Q32 74 32 56 Z"
      fill="url(#vvceBlue)"
      stroke="url(#vvceGold)"
      stroke-width="2"
    />
    {/* Torch of Knowledge */}
    <path d="M46 44 L54 44 L52 64 L48 64 Z" fill="#ffb81f" />
    <path d="M50 32 Q56 38 50 44 Q44 38 50 32 Z" fill="#ff5d6c" />
    {/* VVCE Acronym */}
    <text
      x="50"
      y="91"
      text-anchor="middle"
      fill="#e8f1ff"
      font-size="8"
      font-weight="bold"
      letter-spacing="1"
      font-family="sans-serif"
    >
      VVCE
    </text>
  </svg>
);

// Department of Computer Science & Engineering Hexagon Logo
export const CsLogo: FunctionalComponent<LogoProps> = ({ size = 56, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={className}
    style={{ display: 'block', flexShrink: 0 }}
  >
    <defs>
      <linearGradient id="csCyan" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#6fe3ff" />
        <stop offset="100%" stop-color="#27b4ff" />
      </linearGradient>
    </defs>
    {/* Hexagon */}
    <polygon
      points="50,4 92,26 92,74 50,96 8,74 8,26"
      fill="#08142c"
      stroke="url(#csCyan)"
      stroke-width="3"
    />
    <polygon
      points="50,12 84,30 84,70 50,88 16,70 16,30"
      fill="none"
      stroke="#1d4f8f"
      stroke-width="1.5"
    />
    {/* Circuit Matrix & Monogram */}
    <circle cx="50" cy="36" r="3" fill="#6fe3ff" />
    <circle cx="34" cy="62" r="3" fill="#6fe3ff" />
    <circle cx="66" cy="62" r="3" fill="#6fe3ff" />
    <path d="M50 36 L34 62 H66 Z" fill="none" stroke="#27b4ff" stroke-width="1.5" />
    <text
      x="50"
      y="54"
      text-anchor="middle"
      fill="#ffffff"
      font-size="14"
      font-weight="800"
      font-family="monospace"
      letter-spacing="0.5"
    >
      CSE
    </text>
  </svg>
);

// Invictors Club Circular Logo with Gold Ring & Float Animation Hook
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
        userSelect: 'none'
      }}
      onClick={onClick}
      onDblClick={onDoubleClick}
      onTouchEnd={handleTouchEnd}
      title="Invictors Club VVCE"
    >
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }}>
      <defs>
        <radialGradient id="invGoldGlow" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stop-color="#ffb81f" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#ff8a00" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="invRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fff3b0" />
          <stop offset="50%" stop-color="#ffb81f" />
          <stop offset="100%" stop-color="#ff8a00" />
        </linearGradient>
      </defs>
      {/* Outer Golden Ring */}
      <circle cx="50" cy="50" r="47" fill="none" stroke="url(#invRing)" stroke-width="3" />
      <circle cx="50" cy="50" r="44" fill="#08142c" />
      {/* Inner Shield / Eagle Wings / "I" Monogram */}
      <polygon points="50,14 78,38 64,82 50,72 36,82 22,38" fill="#061226" stroke="#27b4ff" stroke-width="1.5" />
      {/* Invictors Phoenix Chevron */}
      <path d="M50 24 L68 44 L50 62 L32 44 Z" fill="url(#invRing)" />
      <path d="M50 34 L60 44 L50 54 L40 44 Z" fill="#030813" />
      <circle cx="50" cy="44" r="3" fill="#27b4ff" />
      {/* Club Name Arc Accent */}
      <text
        x="50"
        y="92"
        text-anchor="middle"
        fill="#ffb81f"
        font-size="6"
        font-weight="bold"
        letter-spacing="1.5"
        font-family="sans-serif"
      >
        INVICTORS
      </text>
    </svg>
  </div>
  );
};
