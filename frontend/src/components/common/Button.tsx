import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'crimson' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled,
  className = '',
  style,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
      case 'crimson':
        return {
          background: 'linear-gradient(135deg, #FF2A42 0%, #D40816 100%)',
          color: '#FFFFFF',
          border: '1px solid rgba(255, 42, 66, 0.6)',
          boxShadow: '0 0 16px rgba(255, 42, 66, 0.35)',
        };
      case 'outline':
        return {
          background: 'rgba(255, 255, 255, 0.03)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-medium)',
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--text-secondary)',
          border: '1px solid transparent',
        };
      case 'danger':
        return {
          background: 'rgba(229, 9, 20, 0.15)',
          color: '#FF4D63',
          border: '1px solid rgba(255, 77, 99, 0.4)',
        };
      case 'secondary':
      default:
        return {
          background: 'var(--glass-bg-subtle)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(10px)',
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return { padding: '0.35rem 0.75rem', fontSize: '0.8125rem', gap: '0.35rem' };
      case 'lg':
        return { padding: '0.8rem 1.6rem', fontSize: '1.05rem', gap: '0.65rem' };
      case 'md':
      default:
        return { padding: '0.55rem 1.1rem', fontSize: '0.9rem', gap: '0.5rem' };
    }
  };

  return (
    <button
      disabled={disabled || loading}
      className={`btn-${variant} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        borderRadius: 'var(--radius-md)',
        transition: 'all var(--transition-fast)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'radarSweep 0.8s linear infinite' }} />
      ) : (
        icon && iconPosition === 'left' && <span style={{ display: 'inline-flex' }}>{icon}</span>
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && <span style={{ display: 'inline-flex' }}>{icon}</span>}
    </button>
  );
};
