import { FunctionalComponent } from 'preact';
import { VvceLogo, CsLogo, InvictorsLogo } from '../common/Logos';

interface HeaderProps {
  compact?: boolean;
  onAdminClick?: () => void;
}

export const Header: FunctionalComponent<HeaderProps> = ({ compact = false, onAdminClick }) => {
  if (compact) {
    return (
      <header
        style={{
          height: '52px',
          maxHeight: '56px',
          background: 'rgba(6, 18, 38, 0.95)',
          borderBottom: '1px solid var(--line)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <VvceLogo size={32} />
          <InvictorsLogo size={34} onDoubleClick={onAdminClick} />
          <div>
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 800,
                fontSize: '15px',
                background: 'var(--grad-title)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '0.5px',
                lineHeight: 1.1
              }}
            >
              FINAL OVERRIDE
            </div>
            <div style={{ fontSize: '10px', color: 'var(--muted)', lineHeight: 1 }}>
              VVCE Mysuru · CSE
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CsLogo size={32} />
        </div>
      </header>
    );
  }

  // Full Header for Landing & Registration
  return (
    <header
      style={{
        background: 'linear-gradient(180deg, rgba(6, 18, 38, 0.98) 0%, rgba(3, 8, 19, 0.95) 100%)',
        borderBottom: '1px solid var(--line)',
        padding: '20px 16px 28px',
        textAlign: 'center',
        position: 'relative'
      }}
    >
      {/* Top Banner Row with Logos & College Text */}
      <div
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <VvceLogo size={56} />

        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1
            style={{
              color: '#ffffff',
              fontSize: 'clamp(14px, 3.2vw, 20px)',
              fontWeight: 800,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              lineHeight: 1.2
            }}
          >
            VIDYAVARDHAKA COLLEGE OF ENGINEERING
          </h1>
          <p style={{ color: 'var(--txt)', fontSize: '11px', marginTop: '2px', opacity: 0.9 }}>
            Autonomous Institute | Affiliated to Visvesvaraya Technological University, Belagavi
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '10px', marginTop: '1px' }}>
            Gokulam 3rd Stage, Mysuru - 02 | Ph: (0821) 4276200
          </p>
          <div
            style={{
              color: 'var(--cyan)',
              fontSize: '12px',
              fontWeight: 700,
              marginTop: '4px',
              letterSpacing: '0.2px'
            }}
          >
            Department of Computer Science and Engineering
          </div>
        </div>

        <CsLogo size={56} />
      </div>

      {/* Decorative Divider */}
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--line), transparent)',
          margin: '18px auto 14px'
        }}
      />

      {/* Invictors Presents & Big Hero Title */}
      <div style={{ marginTop: '6px' }}>
        <div
          style={{
            color: 'var(--gold)',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            marginBottom: '10px'
          }}
        >
          INVICTORS CLUB PRESENTS
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <div className="animate-float">
            <InvictorsLogo size={88} onDoubleClick={onAdminClick} />
          </div>
        </div>

        <h2
          style={{
            fontSize: 'var(--fs-hero)',
            fontWeight: 900,
            background: 'var(--grad-title)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            lineHeight: 1.1,
            filter: 'drop-shadow(0 0 20px rgba(39, 180, 255, 0.4))'
          }}
        >
          FINAL OVERRIDE
        </h2>
      </div>
    </header>
  );
};
