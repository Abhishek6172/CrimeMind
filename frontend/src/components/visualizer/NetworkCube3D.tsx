import React from 'react';
import { ActivityIcon, CameraIcon, FileTextIcon, MapPinIcon, Volume2Icon } from '../icons/Icons';

export const NetworkCube3D: React.FC = () => {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '540px',
        height: '460px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '1000px',
      }}
    >
      {/* Radial Background Glow */}
      <div
        style={{
          position: 'absolute',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 42, 66, 0.22) 0%, rgba(138, 0, 18, 0.05) 55%, transparent 70%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />

      {/* 3D Cube Container */}
      <div
        className="animate-rotate-cube"
        style={{
          width: '200px',
          height: '200px',
          position: 'relative',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Cube Face: Front */}
        <div className="cube-face cube-front" style={getFaceStyle('translateZ(100px)')}>
          <div className="cube-inner-grid" />
          <div className="cube-node" style={{ top: '25%', left: '30%' }} />
          <div className="cube-node" style={{ top: '70%', left: '65%' }} />
          <div className="cube-line" style={{ top: '40%', left: '35%', width: '50px', transform: 'rotate(45deg)' }} />
          <span style={{ fontSize: '0.65rem', color: '#FF4D63', fontFamily: 'var(--font-mono)' }}>NODE-ALPHA</span>
        </div>

        {/* Cube Face: Back */}
        <div className="cube-face cube-back" style={getFaceStyle('rotateY(180deg) translateZ(100px)')}>
          <div className="cube-inner-grid" />
          <div className="cube-node" style={{ top: '50%', left: '50%' }} />
          <span style={{ fontSize: '0.65rem', color: '#00D4FF', fontFamily: 'var(--font-mono)' }}>TELEMETRY_CORE</span>
        </div>

        {/* Cube Face: Right */}
        <div className="cube-face cube-right" style={getFaceStyle('rotateY(90deg) translateZ(100px)')}>
          <div className="cube-inner-grid" />
          <div className="cube-node" style={{ top: '35%', left: '70%' }} />
          <div className="cube-node" style={{ top: '65%', left: '25%' }} />
          <span style={{ fontSize: '0.65rem', color: '#FF4D63', fontFamily: 'var(--font-mono)' }}>CORRELATION_V9</span>
        </div>

        {/* Cube Face: Left */}
        <div className="cube-face cube-left" style={getFaceStyle('rotateY(-90deg) translateZ(100px)')}>
          <div className="cube-inner-grid" />
          <div className="cube-node" style={{ top: '40%', left: '40%' }} />
          <span style={{ fontSize: '0.65rem', color: '#00E699', fontFamily: 'var(--font-mono)' }}>EVIDENCE_SYNC</span>
        </div>

        {/* Cube Face: Top */}
        <div className="cube-face cube-top" style={getFaceStyle('rotateX(90deg) translateZ(100px)')}>
          <div className="cube-inner-grid" />
          <div className="cube-node" style={{ top: '50%', left: '50%' }} />
        </div>

        {/* Cube Face: Bottom */}
        <div className="cube-face cube-bottom" style={getFaceStyle('rotateX(-90deg) translateZ(100px)')}>
          <div className="cube-inner-grid" />
        </div>
      </div>

      {/* Floating Card 1: LIVE EVENT (Top Left) */}
      <div
        className="glass-panel-elevated animate-float"
        style={{
          position: 'absolute',
          top: '20px',
          left: '10px',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          borderLeft: '3px solid var(--crimson-neon)',
          maxWidth: '220px',
        }}
      >
        <div style={{ color: 'var(--crimson-neon)', display: 'flex' }}>
          <ActivityIcon size={18} />
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--crimson-bright)', letterSpacing: '0.08em' }}>
            LIVE EVENT
          </div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#FFF' }}>
            Burglary Alarm: Dist 4
          </div>
        </div>
      </div>

      {/* Floating Card 2: AUDIO SIGNAL (Top Right) */}
      <div
        className="glass-panel-elevated animate-float-delayed"
        style={{
          position: 'absolute',
          top: '40px',
          right: '15px',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          borderLeft: '3px solid var(--accent-cyan)',
          maxWidth: '220px',
        }}
      >
        <div style={{ color: 'var(--accent-cyan)', display: 'flex' }}>
          <Volume2Icon size={18} />
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-cyan)', letterSpacing: '0.08em' }}>
            AUDIO SIGNAL
          </div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#FFF' }}>
            Intercepted VoIP: 94% match
          </div>
        </div>
      </div>

      {/* Floating Card 3: CCTV (Middle Left) */}
      <div
        className="glass-panel-elevated animate-float-delayed"
        style={{
          position: 'absolute',
          bottom: '120px',
          left: '0px',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          borderLeft: '3px solid #FFB020',
          maxWidth: '230px',
        }}
      >
        <div style={{ color: '#FFB020', display: 'flex' }}>
          <CameraIcon size={18} />
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#FFB020', letterSpacing: '0.08em' }}>
            CCTV DETECTION
          </div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#FFF' }}>
            Vehicle Plate: SYN-7X91
          </div>
        </div>
      </div>

      {/* Floating Card 4: EVIDENCE MATCH (Bottom Right) */}
      <div
        className="glass-panel-elevated animate-float"
        style={{
          position: 'absolute',
          bottom: '30px',
          right: '25px',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          borderLeft: '3px solid #00E699',
          maxWidth: '240px',
        }}
      >
        <div style={{ color: '#00E699', display: 'flex' }}>
          <FileTextIcon size={18} />
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#00E699', letterSpacing: '0.08em' }}>
            EVIDENCE MATCH
          </div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#FFF' }}>
            Linked to Cold Case #2021-044
          </div>
        </div>
      </div>

      {/* Floating Card 5: LOCATION ANALYSIS (Bottom Center-Left) */}
      <div
        className="glass-panel-elevated animate-float-delayed"
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '90px',
          padding: '0.65rem 0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          borderLeft: '3px solid #9D4EDD',
          maxWidth: '210px',
        }}
      >
        <div style={{ color: '#9D4EDD', display: 'flex' }}>
          <MapPinIcon size={16} />
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9D4EDD', letterSpacing: '0.08em' }}>
            LOCATION ANALYSIS
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#FFF' }}>
            Northshore Cluster (3 Cases)
          </div>
        </div>
      </div>
    </div>
  );
};

const getFaceStyle = (transform: string): React.CSSProperties => ({
  position: 'absolute',
  width: '200px',
  height: '200px',
  background: 'rgba(15, 18, 28, 0.65)',
  border: '1px solid rgba(255, 42, 66, 0.45)',
  boxShadow: 'inset 0 0 25px rgba(255, 42, 66, 0.15)',
  transform,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '0.75rem',
  boxSizing: 'border-box',
  overflow: 'hidden',
});
