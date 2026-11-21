import { FunctionalComponent } from 'preact';
import { useState } from 'preact/hooks';

interface FooterProps {
  compact?: boolean;
}

export const Footer: FunctionalComponent<FooterProps> = ({ compact = false }) => {
  const [showContacts, setShowContacts] = useState(false);

  const words = ['ANALYSE', 'DECODE', 'PROMPT', 'CAPTURE', 'MERGE', 'OVERRIDE'];

  return (
    <footer
      style={{
        background: 'var(--bg2)',
        borderTop: '1px solid var(--line)',
        padding: compact ? '12px 16px' : '24px 16px 20px',
        textAlign: 'center',
        color: 'var(--muted)',
        fontSize: '12px'
      }}
    >
      {/* 6 Words Row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px 12px',
          fontWeight: 700,
          letterSpacing: '1px',
          fontSize: '11px',
          marginBottom: compact && !showContacts ? '0' : '16px'
        }}
      >
        {words.map((w, idx) => (
          <span key={w} style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: idx === words.length - 1 ? 'var(--cyan)' : 'var(--txt)' }}>
              {w}
            </span>
            {idx < words.length - 1 && <span style={{ color: 'var(--line)' }}>|</span>}
          </span>
        ))}
      </div>

      {compact && (
        <div style={{ marginTop: '6px' }}>
          <button
            onClick={() => setShowContacts(!showContacts)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontSize: '11px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {showContacts ? 'Hide links ▲' : 'Follow us ▼'}
          </button>
        </div>
      )}

      {(!compact || showContacts) && (
        <div style={{ marginTop: '16px' }}>
          {/* Contacts Grid */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '16px 24px',
              fontSize: '12px',
              marginBottom: '16px'
            }}
          >
            {/* Instagram */}
            <a
              href="https://instagram.com/theinvictors.vvce"
              target="_blank"
              rel="noreferrer"
              style={{
                color: 'var(--txt)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              @theinvictors.vvce
            </a>

            {/* LinkedIn */}
            <a
              href="https://linkedin.com/company/invictors-club"
              target="_blank"
              rel="noreferrer"
              style={{
                color: 'var(--txt)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
              invictors-club
            </a>

            {/* Email */}
            <a
              href="mailto:invictorsofficial@gmail.com"
              style={{
                color: 'var(--txt)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              invictorsofficial@gmail.com
            </a>

            {/* Website */}
            <a
              href="https://invictors-vvce.vercel.app/"
              target="_blank"
              rel="noreferrer"
              style={{
                color: 'var(--txt)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              invictors-vvce.vercel.app
            </a>
          </div>

          {/* Last line in gold caps */}
          <div
            style={{
              color: 'var(--gold)',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '1.5px',
              textTransform: 'uppercase'
            }}
          >
            FOR FURTHER UPDATES, DO FOLLOW OUR ACCOUNTS
          </div>
        </div>
      )}
    </footer>
  );
};
