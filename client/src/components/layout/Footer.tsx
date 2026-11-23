import { FunctionalComponent } from 'preact';
import { useState } from 'preact/hooks';

interface FooterProps {
  compact?: boolean;
}

export const Footer: FunctionalComponent<FooterProps> = ({ compact = false }) => {
  const [showContacts, setShowContacts] = useState(false);

  const words = ['ANALYSE', 'DECODE', 'PROMPT', 'CAPTURE', 'MERGE', 'OVERRIDE'];

  const studentCoordinators = [
    { name: 'AKUL P YADAV', phone: '7090543876' },
    { name: 'GAGAN S URS', phone: '9108252676' },
    { name: 'ANISH S KUMAR', phone: '7975274945' }
  ];

  return (
    <footer
      style={{
        background: 'rgba(3, 7, 18, 0.98)',
        borderTop: '1.5px solid var(--line-bright)',
        padding: compact ? '12px 16px' : '24px 16px 20px',
        textAlign: 'center',
        color: 'var(--muted)',
        fontSize: '13px',
        fontFamily: 'var(--font-hud)'
      }}
    >
      {/* Student Coordinators Telemetry Bar (from Reference Poster 1) */}
      {!compact && (
        <div style={{ maxWidth: '940px', margin: '0 auto 20px' }}>
          <div className="poster-coordinators-pod">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
              <span style={{ fontSize: '18px' }}>👥</span>
              <span style={{ fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
                STUDENT COORDINATORS:
              </span>
            </div>

            {studentCoordinators.map((c, i) => (
              <div key={c.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>{c.name}</span>
                <span style={{ color: 'var(--line-bright)' }}>:</span>
                <a
                  href={`tel:${c.phone}`}
                  style={{
                    color: 'var(--gold)',
                    textDecoration: 'none',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.5px'
                  }}
                >
                  📞 {c.phone}
                </a>
                {i < studentCoordinators.length - 1 && (
                  <span style={{ color: 'var(--line)', marginLeft: '12px' }}>|</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6 Stage Motto Row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px 14px',
          fontWeight: 800,
          letterSpacing: '1.5px',
          fontSize: '12px',
          marginBottom: compact && !showContacts ? '0' : '16px'
        }}
      >
        {words.map((w, idx) => (
          <span key={w} style={{ display: 'inline-flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ color: idx === words.length - 1 ? 'var(--accent)' : '#ffffff' }}>
              {w}
            </span>
            {idx < words.length - 1 && <span style={{ color: 'var(--line-bright)' }}>·</span>}
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
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'var(--font-hud)',
              cursor: 'pointer',
              letterSpacing: '0.5px'
            }}
          >
            {showContacts ? 'Hide Coordinators & Links ▲' : '📞 Contact Coordinators & Links ▼'}
          </button>
        </div>
      )}

      {(!compact || showContacts) && (
        <div style={{ marginTop: '16px' }}>
          {/* Social Links Row */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '16px 24px',
              fontSize: '13px',
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
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
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
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
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
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2">
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
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              invictors-vvce.vercel.app
            </a>
          </div>

          {/* Last line in gold caps (from Reference Poster 1) */}
          <div
            style={{
              color: 'var(--gold)',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '2px',
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
