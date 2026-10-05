import React from 'react';
import { VerificationState, PriorityLevel } from '../../types';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: 
    | 'raw'
    | 'ai'
    | 'verified'
    | 'critical'
    | 'high'
    | 'medium'
    | 'low'
    | 'cyan'
    | 'neutral'
    | 'crimson'
    | 'warning'
    | 'success'
    | 'default'
    | 'info';
  verificationState?: VerificationState;
  priority?: PriorityLevel;
  size?: 'sm' | 'md' | 'small' | 'lg';
  pulse?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  verificationState,
  priority,
  size = 'sm',
  pulse = false,
  className = '',
  style,
}) => {
  // Normalize alias variants
  let normalizedVariant = variant;
  if (normalizedVariant === 'crimson') normalizedVariant = 'critical';
  else if (normalizedVariant === 'warning') normalizedVariant = 'medium';
  else if (normalizedVariant === 'success') normalizedVariant = 'verified';
  else if (normalizedVariant === 'default') normalizedVariant = 'neutral';
  else if (normalizedVariant === 'info') normalizedVariant = 'cyan';

  // Determine variant from props
  let activeVariant = normalizedVariant || 'neutral';
  let label = children;

  if (verificationState) {
    switch (verificationState) {
      case 'RAW_DATA':
        activeVariant = 'raw';
        label = label || 'RAW DATA';
        break;
      case 'AI_FINDING':
        activeVariant = 'ai';
        label = label || 'AI FINDING';
        break;
      case 'HUMAN_VERIFIED':
        activeVariant = 'verified';
        label = label || 'HUMAN VERIFIED';
        break;
    }
  } else if (priority) {
  switch (priority) {
    case 'critical':
    case 'extreme':
      activeVariant = 'critical';
      break;
    case 'high':
      activeVariant = 'high';
      break;
    case 'medium':
    case 'moderate':
      activeVariant = 'medium';
      break;
    case 'low':
      activeVariant = 'low';
      break;
  }

  label = label || priority.toUpperCase();
}

  const getStyles = (): { bg: string; text: string; border: string; glow?: string } => {
    switch (activeVariant) {
      case 'ai':
        return {
          bg: 'rgba(255, 42, 66, 0.12)',
          text: '#FF4D63',
          border: '1px solid rgba(255, 42, 66, 0.45)',
          glow: '0 0 10px rgba(255, 42, 66, 0.25)',
        };
      case 'verified':
        return {
          bg: 'rgba(0, 230, 153, 0.12)',
          text: '#00E699',
          border: '1px solid rgba(0, 230, 153, 0.45)',
          glow: '0 0 10px rgba(0, 230, 153, 0.2)',
        };
      case 'raw':
        return {
          bg: 'rgba(255, 255, 255, 0.05)',
          text: '#A6ACB9',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        };
      case 'critical':
        return {
          bg: 'rgba(229, 9, 20, 0.18)',
          text: '#FF334B',
          border: '1px solid rgba(255, 51, 75, 0.55)',
          glow: '0 0 12px rgba(255, 42, 66, 0.3)',
        };
      case 'high':
        return {
          bg: 'rgba(255, 176, 32, 0.14)',
          text: '#FFB833',
          border: '1px solid rgba(255, 184, 51, 0.45)',
        };
      case 'medium':
        return {
          bg: 'rgba(0, 212, 255, 0.12)',
          text: '#29D7FF',
          border: '1px solid rgba(0, 212, 255, 0.4)',
        };
      case 'low':
        return {
          bg: 'rgba(255, 255, 255, 0.05)',
          text: '#8E94A5',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        };
      case 'cyan':
        return {
          bg: 'rgba(0, 212, 255, 0.15)',
          text: '#00D4FF',
          border: '1px solid rgba(0, 212, 255, 0.5)',
          glow: '0 0 10px rgba(0, 212, 255, 0.25)',
        };
      case 'neutral':
      default:
        return {
          bg: 'rgba(255, 255, 255, 0.04)',
          text: 'var(--text-secondary)',
          border: '1px solid var(--border-subtle)',
        };
    }
  };

  const currentStyles = getStyles();
  const padding = size === 'sm' ? '0.18rem 0.5rem' : '0.3rem 0.75rem';
  const fontSize = size === 'sm' ? '0.6875rem' : '0.8125rem';

  return (
    <span
      className={`badge ${pulse ? 'animate-pulse-crimson' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding,
        fontSize,
        fontWeight: 700,
        fontFamily: 'var(--font-heading)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        borderRadius: 'var(--radius-xs)',
        backgroundColor: currentStyles.bg,
        color: currentStyles.text,
        border: currentStyles.border,
        boxShadow: currentStyles.glow || 'none',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {activeVariant === 'ai' && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#FF2A42', display: 'inline-block' }} />
      )}
      {activeVariant === 'verified' && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#00E699', display: 'inline-block' }} />
      )}
      {label}
    </span>
  );
};
