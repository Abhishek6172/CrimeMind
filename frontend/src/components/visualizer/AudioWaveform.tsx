import React from 'react';

export interface AudioWaveformProps {
  isActive: boolean;
  isSpeaking: boolean;
  barCount?: number;
  className?: string;
  color?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isActive,
  isSpeaking,
  barCount = 16,
  className = '',
  color = 'var(--crimson-neon)',
}) => {
  return (
    <div
      className={`waveform-container ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        height: '42px',
        padding: '0 0.5rem',
      }}
    >
      {Array.from({ length: barCount }).map((_, index) => {
        // Calculate random-like varying heights
        const delay = (index * 0.08) % 0.8;
        const baseHeight = isActive || isSpeaking ? 12 : 4;
        const maxHeight = isSpeaking ? 36 : (isActive ? 28 : 6);

        return (
          <div
            key={index}
            className={isActive || isSpeaking ? 'wave-bar' : ''}
            style={{
              width: '4px',
              height: `${maxHeight}px`,
              minHeight: `${baseHeight}px`,
              backgroundColor: isSpeaking ? 'var(--accent-cyan)' : color,
              borderRadius: '2px',
              boxShadow: isSpeaking
                ? '0 0 8px rgba(0, 212, 255, 0.5)'
                : (isActive ? '0 0 8px rgba(255, 42, 66, 0.5)' : 'none'),
              animationDelay: `${delay}s`,
              transition: 'height 0.2s ease, background-color 0.3s ease',
              opacity: isActive || isSpeaking ? 1 : 0.35,
            }}
          />
        );
      })}
    </div>
  );
};
