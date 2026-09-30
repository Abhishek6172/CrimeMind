import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  iconPosition = 'left',
  helperText,
  className = '',
  style,
  ...props
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
      {label && (
        <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        {icon && iconPosition === 'left' && (
          <span
            style={{
              position: 'absolute',
              left: '0.85rem',
              color: 'var(--text-tertiary)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {icon}
          </span>
        )}

        <input
          className={`input-glass ${className}`}
          style={{
            width: '100%',
            backgroundColor: 'rgba(13, 16, 24, 0.75)',
            border: error ? '1px solid #FF334B' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: icon && iconPosition === 'left' ? '0.65rem 0.85rem 0.65rem 2.4rem' : '0.65rem 0.85rem',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            outline: 'none',
            transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-crimson)';
            e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 42, 66, 0.2)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? '#FF334B' : 'var(--border-subtle)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          {...props}
        />

        {icon && iconPosition === 'right' && (
          <span
            style={{
              position: 'absolute',
              right: '0.85rem',
              color: 'var(--text-tertiary)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {icon}
          </span>
        )}
      </div>

      {error ? (
        <span style={{ fontSize: '0.75rem', color: '#FF4D63' }}>{error}</span>
      ) : helperText ? (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{helperText}</span>
      ) : null}
    </div>
  );
};

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className = '',
  style,
  ...props
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
      {label && (
        <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}

      <select
        className={`select-glass ${className}`}
        style={{
          width: '100%',
          backgroundColor: 'var(--bg-secondary)',
          border: error ? '1px solid #FF334B' : '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '0.65rem 0.85rem',
          color: 'var(--text-primary)',
          fontSize: '0.875rem',
          outline: 'none',
          cursor: 'pointer',
          ...style,
        }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ backgroundColor: '#0D0F15', color: '#F0F2F8' }}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span style={{ fontSize: '0.75rem', color: '#FF4D63' }}>{error}</span>}
    </div>
  );
};
