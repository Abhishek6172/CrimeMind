import React from 'react';

export interface RadarScanProps {
  size?: number;
  blips?: Array<{ x: number; y: number; label?: string; color?: string }>;
}

export const RadarScan: React.FC<RadarScanProps> = ({ size = 260, blips = [] }) => {
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: 'rgba(8, 11, 18, 0.9)',
        border: '1px solid rgba(255, 42, 66, 0.4)',
        boxShadow: '0 0 25px rgba(255, 42, 66, 0.15)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Concentric Radar Rings */}
      <div style={{ position: 'absolute', width: '33%', height: '33%', borderRadius: '50%', border: '1px dashed rgba(255, 255, 255, 0.08)' }} />
      <div style={{ position: 'absolute', width: '66%', height: '66%', borderRadius: '50%', border: '1px solid rgba(255, 255, 255, 0.1)' }} />
      <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '1px solid rgba(255, 42, 66, 0.3)' }} />

      {/* Axis crosshair lines */}
      <div style={{ position: 'absolute', width: '100%', height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
      <div style={{ position: 'absolute', height: '100%', width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

      {/* Rotating Radar Sweeper */}
      <div
        className="animate-radar"
        style={{
          position: 'absolute',
          width: '50%',
          height: '50%',
          top: 0,
          right: 0,
          transformOrigin: 'bottom left',
          background: 'linear-gradient(45deg, transparent 40%, rgba(255, 42, 66, 0.25) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Center Pivot Point */}
      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#FF2A42', boxShadow: '0 0 10px #FF2A42', zIndex: 2 }} />

      {/* Blips / Detections */}
      {blips.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: b.color || '#00E699',
            boxShadow: `0 0 8px ${b.color || '#00E699'}`,
            transform: 'translate(-50%, -50%)',
            zIndex: 3,
          }}
          title={b.label}
        />
      ))}
    </div>
  );
};
