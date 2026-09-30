import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'crimson' | 'interactive' | 'glass';
  header?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  header,
  headerAction,
  footer,
  padding = 'md',
  className = '',
  style,
  ...props
}) => {
  const getPadding = () => {
    switch (padding) {
      case 'none': return 0;
      case 'sm': return '0.75rem 1rem';
      case 'lg': return '1.5rem 1.75rem';
      case 'md':
      default: return '1.25rem 1.5rem';
    }
  };

  const getVariantClass = () => {
    switch (variant) {
      case 'elevated': return 'glass-panel-elevated';
      case 'crimson': return 'glass-panel glass-panel-crimson';
      case 'interactive': return 'glass-panel glass-panel-interactive';
      case 'glass':
      case 'default':
      default: return 'glass-panel';
    }
  };

  return (
    <div
      className={`${getVariantClass()} ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
      {...props}
    >
      {header && (
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {header}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}

      <div style={{ padding: getPadding(), flex: 1 }}>
        {children}
      </div>

      {footer && (
        <div
          style={{
            padding: '0.75rem 1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
};
