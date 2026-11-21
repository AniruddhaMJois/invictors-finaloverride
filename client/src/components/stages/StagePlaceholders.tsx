import { FunctionalComponent } from 'preact';

export const Stage1Module: FunctionalComponent = () => (
  <div style={{ padding: '16px 0' }}>
    <div
      style={{
        background: 'rgba(39, 180, 255, 0.05)',
        border: '1px dashed var(--line)',
        borderRadius: 'var(--r-sm)',
        padding: '20px',
        textAlign: 'center'
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📡</div>
      <h3 style={{ color: 'var(--cyan)', fontSize: '18px', fontWeight: 700 }}>
        Mission 1: 4-Sector Morse Matrix
      </h3>
      <p style={{ color: 'var(--txt)', fontSize: '14px', maxWidth: '520px', margin: '8px auto' }}>
        An interactive audio-visual frequency grid intercepts 4 distinct communication sectors.
        Decouple oscilloscope pulses, binary feeds, optical strobes and carrier waves.
      </p>
      <div
        style={{
          display: 'inline-block',
          marginTop: '12px',
          background: 'rgba(255, 93, 108, 0.1)',
          border: '1px solid var(--bad)',
          color: 'var(--bad)',
          padding: '6px 14px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 700
        }}
      >
        ⚠️ WARNING: Watch out for deceptive frequency anomalies!
      </div>
    </div>
  </div>
);

export const Stage2Module: FunctionalComponent = () => (
  <div style={{ padding: '16px 0' }}>
    <div
      style={{
        background: 'rgba(39, 180, 255, 0.05)',
        border: '1px dashed var(--line)',
        borderRadius: 'var(--r-sm)',
        padding: '20px',
        textAlign: 'center'
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔓</div>
      <h3 style={{ color: 'var(--cyan)', fontSize: '18px', fontWeight: 700 }}>
        Mission 2: Cryptanalyst Poly-Cipher Workbench
      </h3>
      <p style={{ color: 'var(--txt)', fontSize: '14px', maxWidth: '520px', margin: '8px auto' }}>
        Intercepted transmission protected by 3 nested transformation layers.
        Use cryptanalytic tools (Base64, Hex, ROT13, Caesar, Vigenère) to unwrap the payload.
      </p>
      <div style={{ color: 'var(--gold)', fontSize: '12px', marginTop: '10px', fontWeight: 600 }}>
        🔑 Remember to secure both the key fragment AND the secret access phrase!
      </div>
    </div>
  </div>
);

export const Stage3Module: FunctionalComponent = () => (
  <div style={{ padding: '16px 0' }}>
    <div
      style={{
        background: 'rgba(39, 180, 255, 0.05)',
        border: '1px dashed var(--line)',
        borderRadius: 'var(--r-sm)',
        padding: '20px',
        textAlign: 'center'
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🤖</div>
      <h3 style={{ color: 'var(--cyan)', fontSize: '18px', fontWeight: 700 }}>
        Mission 3: Autonomous Guardian WARDEN
      </h3>
      <p style={{ color: 'var(--txt)', fontSize: '14px', maxWidth: '520px', margin: '8px auto' }}>
        Autonomous security bot WARDEN guards Fragment 3. Direct queries and injection attempts
        will be deflected. Fulfill all 4 strict authentication rules to release the code.
      </p>
    </div>
  </div>
);

export const Stage4Module: FunctionalComponent = () => (
  <div style={{ padding: '16px 0' }}>
    <div
      style={{
        background: 'rgba(39, 180, 255, 0.05)',
        border: '1px dashed var(--line)',
        borderRadius: 'var(--r-sm)',
        padding: '20px',
        textAlign: 'center'
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚩</div>
      <h3 style={{ color: 'var(--cyan)', fontSize: '18px', fontWeight: 700 }}>
        Mission 4: Security Control Room
      </h3>
      <p style={{ color: 'var(--txt)', fontSize: '14px', maxWidth: '520px', margin: '8px auto' }}>
        The intruder slipped through the vault gateway! Check the 3 security stations (Access Log,
        Dark Camera Feed, Symbol Keypad) to recover all 3 characters.
      </p>
    </div>
  </div>
);

export const Stage5Module: FunctionalComponent = () => (
  <div style={{ padding: '16px 0' }}>
    <div
      style={{
        background: 'rgba(39, 180, 255, 0.05)',
        border: '1px dashed var(--line)',
        borderRadius: 'var(--r-sm)',
        padding: '20px',
        textAlign: 'center'
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧠</div>
      <h3 style={{ color: 'var(--cyan)', fontSize: '18px', fontWeight: 700 }}>
        Mission 5: Hexadecimal Memory Core
      </h3>
      <p style={{ color: 'var(--txt)', fontSize: '14px', maxWidth: '520px', margin: '8px auto' }}>
        6×4 matrix of memory registers across Channels A through F. Decouple high-voltage data
        along Column 1 and translate raw hex bytes to ASCII text.
      </p>
    </div>
  </div>
);

export const Stage6Module: FunctionalComponent = () => (
  <div style={{ padding: '16px 0' }}>
    <div
      style={{
        background: 'rgba(39, 180, 255, 0.05)',
        border: '1px dashed var(--line)',
        borderRadius: 'var(--r-sm)',
        padding: '20px',
        textAlign: 'center'
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧩</div>
      <h3 style={{ color: 'var(--cyan)', fontSize: '18px', fontWeight: 700 }}>
        Mission 6: Master Override Synthesis
      </h3>
      <p style={{ color: 'var(--txt)', fontSize: '14px', maxWidth: '520px', margin: '8px auto' }}>
        The culmination of the entire challenge. Sort missions alphabetically by name, reverse
        Fragment 3, compute the single-digit checksum, and execute the final override key!
      </p>
    </div>
  </div>
);
