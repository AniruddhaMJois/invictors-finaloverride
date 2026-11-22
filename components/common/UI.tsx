'use client';

import React from 'react';

// Chamfered Cut-Corner Card
interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  style?: React.CSSProperties;
}
export const Card: React.FC<CardProps> = ({ children, className = '', glow = false, style }) => (
  <div className={`chamfered-card ${glow ? 'chamfered-card-glow' : ''} ${className}`} style={style}>
    {children}
  </div>
);

// Button with Variant & Progress bar cooldown
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'gold' | 'ghost' | 'danger';
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  cooldownProgress?: number; // 0 to 1
  style?: React.CSSProperties;
}
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  onClick,
  disabled = false,
  type = 'button',
  className = '',
  cooldownProgress,
  style
}) => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    className={`btn btn-${variant} ${className}`}
    style={style}
  >
    {children}
    {cooldownProgress !== undefined && cooldownProgress > 0 && (
      <div
        className="btn-progress"
        style={{ width: `${Math.min(100, cooldownProgress * 100)}%` }}
      />
    )}
  </button>
);

// Input Component
interface InputProps {
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInput?: (e: any) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
  autoFocus?: boolean;
  required?: boolean;
  label?: string;
  list?: string;
  style?: React.CSSProperties;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}
export const Input: React.FC<InputProps> = ({
  value,
  onChange,
  onInput,
  placeholder,
  type = 'text',
  disabled = false,
  className = '',
  maxLength,
  autoFocus = false,
  required = false,
  label,
  list,
  style,
  onKeyDown
}) => (
  <input
    type={type}
    value={value}
    list={list}
    onChange={(e) => {
      if (onChange) onChange(e);
      if (onInput) onInput(e);
    }}
    placeholder={placeholder}
    disabled={disabled}
    className={`input ${className}`}
    maxLength={maxLength}
    autoFocus={autoFocus}
    required={required}
    style={style}
    onKeyDown={onKeyDown}
  />
);

// Modal Dialog
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  onConfirm?: () => void;
  confirmVariant?: 'primary' | 'gold' | 'danger';
}
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  confirmText,
  onConfirm,
  confirmVariant = 'gold'
}) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--txt)' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              fontSize: '20px',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
        <div style={{ marginBottom: '24px', color: 'var(--txt)' }}>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {confirmText && onConfirm && (
            <Button variant={confirmVariant} onClick={onConfirm}>
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Circular Countdown Ring (SVG)
interface CountdownRingProps {
  secondsLeft: number;
  totalSeconds: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}
export const CountdownRing: React.FC<CountdownRingProps> = ({
  secondsLeft,
  totalSeconds,
  size = 48,
  strokeWidth = 4,
  color = 'var(--accent)',
  label
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = totalSeconds > 0 ? Math.max(0, secondsLeft / totalSeconds) : 0;
  const strokeDashoffset = circumference * (1 - fraction);

  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg2)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.25s' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          fontSize: `${Math.max(10, Math.floor(size * 0.28))}px`,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: 'var(--txt)'
        }}
      >
        {label || secondsLeft}
      </div>
    </div>
  );
};

// Shimmer Progress Bar
export const ProgressBar: React.FC<{ progress: number; className?: string }> = ({
  progress,
  className = ''
}) => (
  <div className={`progress-bar-wrap ${className}`}>
    <div
      className="progress-bar-fill"
      style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
    />
  </div>
);
