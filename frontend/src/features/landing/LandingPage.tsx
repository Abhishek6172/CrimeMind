import React from 'react';
import { NetworkCube3D } from '../../components/visualizer/NetworkCube3D';
import { Button } from '../../components/common/Button';
import { ArrowRightIcon, BrainIcon, NetworkGraphIcon, ActivityIcon, ShieldIcon } from '../../components/icons/Icons';
import { useApp } from '../../store/AppContext';

export const LandingPage: React.FC = () => {
  const { setActivePage, setIsAssistantOpen } = useApp();

  return (
    <div style={{ minHeight: 'calc(100vh - var(--navbar-height))', display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <section
        style={{
          position: 'relative',
          padding: '4rem 2rem 5rem',
          maxWidth: '1440px',
          margin: '0 auto',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
          alignItems: 'center',
          gap: '3rem',
          boxSizing: 'border-box',
        }}
      >
        {/* Left Column: Headlines & CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', zIndex: 2 }}>
          {/* Eyebrow badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'rgba(255, 42, 66, 0.12)',
                border: '1px solid rgba(255, 42, 66, 0.4)',
                padding: '0.3rem 0.8rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'var(--crimson-bright)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#FF2A42' }} className="animate-pulse-crimson" />
              Autonomous LangGraph Swarm Active
            </span>
          </div>

          <h1 className="text-title-hero">
            CrimeMind <br />
            <span className="text-gradient-crimson">Intelligence</span> Assistant
          </h1>

          <p
            style={{
              fontSize: '1.2rem',
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
              maxWidth: '560px',
              margin: 0,
            }}
          >
            Multimodal crime intelligence across CCTV, audio, digital evidence and structured investigation data.
          </p>

          {/* Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.5rem' }}>
            <Button
              variant="crimson"
              size="lg"
              icon={<ArrowRightIcon size={18} />}
              iconPosition="right"
              onClick={() => setActivePage('investigations')}
            >
              Start Investigation
            </Button>

            <Button
              variant="secondary"
              size="lg"
              icon={<ActivityIcon size={18} />}
              onClick={() => setActivePage('dashboard')}
            >
              View Live Intelligence
            </Button>
          </div>

          {/* Quick Metrics Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2.5rem',
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFF', fontFamily: 'var(--font-heading)' }}>
                10,000+
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Synthesized Profiles
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--crimson-bright)', fontFamily: 'var(--font-heading)' }}>
                50,000+
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Graph Relations
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#00E699', fontFamily: 'var(--font-heading)' }}>
                100,000+
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>
                CCTV Detections
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 3D Glowing Network Cube with Floating Cards */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1 }}>
          <NetworkCube3D />
        </div>
      </section>

      {/* Bottom Feature Cards (Matching prompt: Multimodal Analysis, Real-time Events, Evidence Graph) */}
      <section
        style={{
          marginTop: 'auto',
          backgroundColor: 'rgba(11, 14, 22, 0.65)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border-subtle)',
          padding: '2.5rem 2rem',
        }}
      >
        <div
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '2rem',
          }}
        >
          {/* Feature Card 1: Multimodal Analysis */}
          <div
            className="glass-panel glass-panel-interactive"
            style={{ padding: '1.75rem', borderLeft: '3px solid var(--crimson-neon)' }}
            onClick={() => setActivePage('evidence')}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 42, 66, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--crimson-neon)',
                marginBottom: '1rem',
              }}
            >
              <BrainIcon size={24} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: '#FFF' }}>
              Multimodal Analysis
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Deep correlation fusing intercepted audio transcripts, CCTV facial & plate detection, ballistic files, and encrypted banking records.
            </p>
          </div>

          {/* Feature Card 2: Real-time Events */}
          <div
            className="glass-panel glass-panel-interactive"
            style={{ padding: '1.75rem', borderLeft: '3px solid var(--accent-cyan)' }}
            onClick={() => setActivePage('dashboard')}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
                marginBottom: '1rem',
              }}
            >
              <ActivityIcon size={24} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: '#FFF' }}>
              Real-time Events
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Unified chronological timeline streaming raw sensor pings, police field interrogations, and automated security alarms into a single pane.
            </p>
          </div>

          {/* Feature Card 3: Evidence Graph */}
          <div
            className="glass-panel glass-panel-interactive"
            style={{ padding: '1.75rem', borderLeft: '3px solid var(--accent-emerald)' }}
            onClick={() => setActivePage('graph')}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(0, 230, 153, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-emerald)',
                marginBottom: '1rem',
              }}
            >
              <NetworkGraphIcon size={24} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: '#FFF' }}>
              Evidence Graph
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Interactive relational graph linking persons, shell accounts, getaway vehicles, and cross-case evidence with bi-directional path discovery.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
