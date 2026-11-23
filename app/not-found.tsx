import Link from 'next/link';
import { InvictorsLogo } from '@/components/common/Logos';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '24px',
        textAlign: 'center'
      }}
    >
      <InvictorsLogo size={72} />
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '48px',
          fontWeight: 900,
          color: 'var(--bad)',
          marginTop: '20px',
          letterSpacing: '2px'
        }}
      >
        404 // ANOMALY
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '16px', maxWidth: '420px', margin: '12px auto 24px' }}>
        The requested tactical frequency or sector coordinates do not exist in the FINAL OVERRIDE network matrix.
      </p>
      <Link
        href="/"
        className="btn btn-primary"
        style={{ textDecoration: 'none' }}
      >
        Return to Operational Terminal
      </Link>
    </div>
  );
}
