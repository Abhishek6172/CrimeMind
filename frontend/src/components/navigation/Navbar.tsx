import React from 'react';
import { CrimeMindLogoIcon, BellIcon, BotIcon, SearchIcon } from '../icons/Icons';
import { Button } from '../common/Button';

export interface NavbarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  unreadAlertCount?: number;
  onOpenAssistantModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onNavigate,
  unreadAlertCount = 4,
  onOpenAssistantModal,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'investigations', label: 'Investigations' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'graph', label: 'Relationship Graph' },
    { id: 'locations', label: 'Locations' },
    { id: 'cctv', label: 'CCTV' },
    { id: 'alerts', label: 'Alerts', badge: unreadAlertCount },
    { id: 'analytics', label: 'Analytics' },
    { id: 'agents', label: 'Agents' },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 800,
        height: 'var(--navbar-height)',
        backgroundColor: 'rgba(7, 8, 11, 0.88)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        boxSizing: 'border-box',
      }}
    >
      {/* Brand & Logo */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
        onClick={() => onNavigate('landing')}
      >
        <CrimeMindLogoIcon size={32} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em', color: '#FFF' }}>
              CRIME<span style={{ color: 'var(--crimson-neon)' }}>MIND</span>
            </span>
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                color: 'var(--crimson-bright)',
                backgroundColor: 'rgba(255, 42, 66, 0.15)',
                border: '1px solid rgba(255, 42, 66, 0.35)',
                padding: '0.1rem 0.35rem',
                borderRadius: 'var(--radius-xs)',
                letterSpacing: '0.05em',
              }}
            >
              INTELLIGENCE v2.4
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isActive ? 'rgba(255, 42, 66, 0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(255, 42, 66, 0.4)' : '1px solid transparent',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  style={{
                    backgroundColor: 'var(--crimson-neon)',
                    color: '#FFF',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '0.05rem 0.35rem',
                    borderRadius: 'var(--radius-full)',
                    boxShadow: '0 0 8px rgba(255, 42, 66, 0.5)',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Action CTA & Assistant Launch */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => onNavigate('alerts')}
          style={{
            position: 'relative',
            padding: '0.5rem',
            color: 'var(--text-secondary)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            display: 'flex',
          }}
          title="Tactical Alerts"
        >
          <BellIcon size={18} />
          {unreadAlertCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 5,
                right: 5,
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: 'var(--crimson-neon)',
                boxShadow: '0 0 6px var(--crimson-neon)',
              }}
            />
          )}
        </button>

        <Button
          variant="crimson"
          size="sm"
          icon={<BotIcon size={16} />}
          onClick={onOpenAssistantModal || (() => onNavigate('assistant'))}
        >
          Launch Assistant
        </Button>
      </div>
    </header>
  );
};
