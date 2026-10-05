import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
  className = '',
}) => {
  return (
    <div
      className={`glass-panel ${className}`}
      style={{
        padding: '3.5rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        width: '100%',
      }}
    >
      {icon && (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 42, 66, 0.08)',
            border: '1px solid rgba(255, 42, 66, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--crimson-neon)',
            marginBottom: '1.25rem',
            boxShadow: '0 0 20px rgba(255, 42, 66, 0.15)',
          }}
        >
          {icon}
        </div>
      )}

      <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p style={{ maxWidth: '420px', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: (actionLabel || action) ? '1.5rem' : 0 }}>
        {description}
      </p>

      {action ? (
        action
      ) : (
        actionLabel && onAction && (
          <Button variant="crimson" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
};
