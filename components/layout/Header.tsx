'use client';

import React from 'react';
import Link from 'next/link';
import { VvceLogo, CsLogo, InvictorsLogo } from '../common/Logos';

interface HeaderProps {
  compact?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <header
        style={{
          height: '56px',
          maxHeight: '56px',
          background: 'rgba(4, 11, 24, 0.96)',
          borderBottom: '1.5px solid var(--line-bright)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8), 0 1px 0 rgba(0, 240, 255, 0.2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <VvceLogo size={34} />
          <InvictorsLogo size={36} />
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: '16px',
                  lineHeight: 1.1,
                  letterSpacing: '1px',
                  background: 'var(--grad-title)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.6))'
                }}
              >
                FINAL OVERRIDE
              </div>
              <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--font-hud)', fontWeight: 600, letterSpacing: '0.5px' }}>
                DEPT OF CSE · VVCE MYSURU
              </div>
            </div>
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CsLogo size={34} />
        </div>
      </header>
    );
  }

  // Full Header for Landing & Registration (matching Reference Posters)
  return (
    <header
      style={{
        background: 'linear-gradient(180deg, rgba(4, 12, 28, 0.98) 0%, rgba(3, 7, 18, 0.96) 100%)',
        borderBottom: '1px solid var(--line-bright)',
        padding: '20px 16px 28px',
        textAlign: 'center',
        position: 'relative'
      }}
    >
      {/* Top Institutional Bar (from Reference Poster 2) */}
      <div
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          paddingBottom: '16px',
          borderBottom: '1px solid rgba(20, 54, 95, 0.6)'
        }}
      >
        <VvceLogo size={60} />

        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1
            style={{
              color: '#ffffff',
              fontSize: 'clamp(14px, 3.4vw, 22px)',
              fontWeight: 800,
              fontFamily: 'var(--font-hud)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              lineHeight: 1.2
            }}
          >
            VIDYAVARDHAKA COLLEGE OF ENGINEERING
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '2px', fontFamily: 'var(--font-hud)', fontWeight: 500 }}>
            Autonomous Institute | Affiliated to Visvesvaraya Technological University, Belagavi
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '10.5px', marginTop: '1px' }}>
            Gokulam 3rd Stage, Mysuru - 02 | Ph: (0821) 4276200
          </p>
          <div
            style={{
              color: 'var(--cyan)',
              fontSize: '12.5px',
              fontWeight: 700,
              fontFamily: 'var(--font-hud)',
              marginTop: '4px',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              textShadow: '0 0 8px rgba(0, 240, 255, 0.4)'
            }}
          >
            Department of Computer Science and Engineering
          </div>
        </div>

        <CsLogo size={60} />
      </div>

      {/* Center Event Metadata Pods & Medallion (from Reference Poster 2) */}
      <div
        style={{
          maxWidth: '880px',
          margin: '22px auto 8px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px 24px'
        }}
      >
        {/* Left Pod: Date & Time */}
        <div className="poster-meta-pod" style={{ minWidth: '220px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--gold)', fontWeight: 700, fontFamily: 'var(--font-hud)' }}>
              <span>📅 DATE:</span>
              <span style={{ color: '#ffffff', fontWeight: 800 }}>23rd November 2026</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--cyan)', fontWeight: 700, fontFamily: 'var(--font-hud)' }}>
              <span>🕒 TIME:</span>
              <span style={{ color: '#ffffff', fontWeight: 800 }}>4:00 PM Onwards</span>
            </div>
          </div>
        </div>

        {/* Center: The 3D Medallion Logo */}
        <div className="animate-float" style={{ margin: '0 8px' }}>
          <InvictorsLogo size={92} />
        </div>

        {/* Right Pod: Venue */}
        <div className="poster-meta-pod gold" style={{ minWidth: '220px' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700, fontFamily: 'var(--font-hud)', letterSpacing: '1px' }}>
              📍 VENUE
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--cyan)',
                letterSpacing: '1px',
                textShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
              }}
            >
              M Block 401
            </div>
          </div>
        </div>
      </div>

      {/* Signature Title Card from Reference Posters */}
      <div className="poster-title-card" style={{ marginTop: '14px' }}>
        <div className="poster-presents-text">
          INVICTORS CLUB PRESENTS
        </div>

        <div style={{ display: 'inline-block', position: 'relative' }}>
          <span className="poster-title-final">FINAL</span>
          <span className="poster-title-override">OVERRIDE</span>
        </div>

        <div>
          <div className="poster-pill-badge">
            ⚡ A TIMED TEAM ESCAPE-ROOM STYLE TECH CHALLENGE ⚡
          </div>
        </div>
      </div>
    </header>
  );
};
