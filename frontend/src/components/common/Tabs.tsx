import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'underline' | 'pill' | 'crimson';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className = '',
}) => {
  return (
    <div
      className={`tabs-nav ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: variant === 'pill' ? '0.5rem' : '1.5rem',
        borderBottom: variant === 'underline' ? '1px solid var(--border-subtle)' : 'none',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        if (variant === 'pill') {
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.875rem',
                fontWeight: 600,
                backgroundColor: isActive ? 'var(--crimson-neon)' : 'rgba(255, 255, 255, 0.04)',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                border: isActive ? '1px solid var(--crimson-bright)' : '1px solid var(--border-subtle)',
                boxShadow: isActive ? '0 0 14px rgba(255, 42, 66, 0.4)' : 'none',
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  style={{
                    backgroundColor: isActive ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        }

        // Default 'underline' variant
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.85rem 0.25rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
              borderBottom: isActive ? '2px solid var(--crimson-neon)' : '2px solid transparent',
              marginBottom: -1,
              transition: 'all var(--transition-fast)',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon && <span style={{ color: isActive ? 'var(--crimson-neon)' : 'inherit' }}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                style={{
                  backgroundColor: isActive ? 'rgba(255, 42, 66, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  color: isActive ? '#FF667A' : 'var(--text-tertiary)',
                  padding: '0.1rem 0.45rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  border: isActive ? '1px solid rgba(255, 42, 66, 0.3)' : 'none',
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
