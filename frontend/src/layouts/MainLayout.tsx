import React, { ReactNode } from 'react';
import { useApp } from '../store/AppContext';
import { Navbar } from '../components/navigation/Navbar';
import { Breadcrumbs } from '../components/navigation/Breadcrumbs';
import { Button } from '../components/common/Button';
import { CpuIcon, MicIcon, ShieldCheckIcon } from '../components/icons/Icons';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { currentRoute, navigateTo, selectedCaseId, selectedPersonId, unreadAlertCount, setIsAssistantOpen } = useApp();

  const isLanding = currentRoute === 'landing';

  const getBreadcrumbs = () => {
    switch (currentRoute) {
      case 'dashboard':
        return [{ label: 'Tactical Command', active: true }];
      case 'investigations':
      case 'case-detail':
        return [
          { label: 'Investigations', onClick: () => navigateTo('investigations') },
          { label: selectedCaseId ? `Case: ${selectedCaseId}` : 'Active Dossiers', active: true },
        ];
      case 'evidence':
        return [{ label: 'Evidence & Chain of Custody', active: true }];
      case 'relationship-graph':
        return [{ label: 'Relationship Graph', active: true }];
      case 'person-profile':
        return [
          { label: 'Persons of Interest', onClick: () => navigateTo('investigations') },
          { label: selectedPersonId ? `Person: ${selectedPersonId}` : 'Profile', active: true },
        ];
      case 'location-intelligence':
        return [{ label: 'Location & Geospatial Intelligence', active: true }];
      case 'cctv':
        return [{ label: 'CCTV & Vision Surveillance', active: true }];
      case 'assistant':
        return [{ label: 'AI Tactical Assistant', active: true }];
      case 'agents':
        return [{ label: 'LangGraph Swarm Orchestration', active: true }];
      case 'alerts':
        return [{ label: 'Tactical Alerts', active: true }];
      case 'analytics':
        return [{ label: 'Intelligence Analytics', active: true }];
      default:
        return [];
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary, #07080B)',
        color: 'var(--text-primary, #F0F2F8)',
        position: 'relative',
      }}
    >
      {/* Top Main Navigation Bar */}
      <Navbar
        activePage={currentRoute || 'landing'}
        onNavigate={navigateTo}
        unreadAlertCount={unreadAlertCount}
        onOpenAssistantModal={() => setIsAssistantOpen(true)}
      />

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: isLanding ? '100%' : '1520px',
          margin: '0 auto',
          padding: isLanding ? '0' : '24px 28px 48px 28px',
          boxSizing: 'border-box',
        }}
      >
        {!isLanding && (
          <div style={{ marginBottom: '16px' }}>
            <Breadcrumbs items={getBreadcrumbs()} />
          </div>
        )}

        {children}
      </main>

      {/* Floating Quick-Assistant Trigger (Only visible on non-assistant pages) */}
      {currentRoute !== 'assistant' && !isLanding && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '28px',
            zIndex: 90,
          }}
        >
          <Button
            variant="primary"
            icon={<CpuIcon size={16} />}
            onClick={() => navigateTo('assistant')}
            style={{
              padding: '12px 20px',
              borderRadius: '24px',
              boxShadow: '0 6px 20px rgba(255, 42, 66, 0.4)',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            Launch AI Assistant
          </Button>
        </div>
      )}

      {/* Global Status Bar Footer */}
      {!isLanding && (
        <footer
          style={{
            borderTop: '1px solid var(--color-glass-border)',
            background: 'rgba(5, 7, 10, 0.85)',
            backdropFilter: 'blur(12px)',
            padding: '10px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>SYSTEM OPERATIONAL</span>
            </div>
            <span>•</span>
            <span>PostgreSQL Forensic Vault: Synced</span>
            <span>•</span>
            <span>LangGraph Multi-Agent Swarm: 9 / 9 Active</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldCheckIcon size={13} color="var(--accent-emerald, #00E699)" />
            <span>FIPS 140-3 Cryptographic Audit Enforced</span>
            <span>•</span>
            <span style={{ fontFamily: 'monospace' }}>CrimeMind Enterprise Intelligence v2.4.0</span>
          </div>
        </footer>
      )}
    </div>
  );
};
