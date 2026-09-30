import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  TrendingUpIcon,
  MapPinIcon,
  FolderIcon,
  FileTextIcon,
  NetworkIcon,
  CarIcon,
  ClockIcon,
  RefreshIcon,
  DownloadIcon,
} from '../../components/icons/Icons';

export const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Chart data
  const crimeCategories = [
    { label: 'Armed Robbery & Breach', count: 48, percent: 32, color: '#FF2A42' },
    { label: 'Financial Laundering', count: 36, percent: 24, color: '#F97316' },
    { label: 'Digital Extortion / Cyber', count: 28, percent: 19, color: '#38BDF8' },
    { label: 'Syndicate Conspiracy', count: 22, percent: 15, color: '#A855F7' },
    { label: 'Contraband Distribution', count: 15, percent: 10, color: '#10B981' },
  ];

  const locationsData = [
    { name: 'Downtown Financial Sector', cases: 84, width: '92%' },
    { name: 'Industrial Wharf & Docks', cases: 62, width: '68%' },
    { name: 'Metro Terminal Transit Hub', cases: 51, width: '56%' },
    { name: 'Eastside Warehousing Zone', cases: 39, width: '43%' },
    { name: 'Sub-Level Vault Perimeter', cases: 27, width: '30%' },
  ];

  const evidenceTypesData = [
    { type: 'CCTV Surveillance Clips', count: 1840, color: '#FF2A42' },
    { type: 'Call Detail Records (CDR)', count: 1420, color: '#F59E0B' },
    { type: 'Financial Wire Transcripts', count: 980, color: '#10B981' },
    { type: 'Digital Forensic Hard Drives', count: 640, color: '#38BDF8' },
    { type: 'Witness Statements', count: 410, color: '#A855F7' },
  ];

  const vehicleAppearancesData = [
    { vehicle: 'Dodge Charger (SYN-7X91)', hits: 18, color: '#FF2A42', status: 'Primary Syndicate Interceptor' },
    { vehicle: 'Ford Explorer (SYN-4K82)', hits: 11, color: '#F43F5E', status: 'Recidivist Surveillance Van' },
    { vehicle: 'Chevrolet Tahoe (MET-9921)', hits: 9, color: '#A855F7', status: 'Escort Vehicle' },
    { vehicle: 'BMW M5 Dark Shadow (B-8192)', hits: 6, color: '#38BDF8', status: 'High-Speed Getaway' },
  ];

  // 24-hour crime temporal patterns
  const hourlyPattern = [
    { hour: '00', val: 35 }, { hour: '01', val: 68 }, { hour: '02', val: 94 }, { hour: '03', val: 86 },
    { hour: '04', val: 52 }, { hour: '05', val: 18 }, { hour: '06', val: 12 }, { hour: '07', val: 15 },
    { hour: '08', val: 22 }, { hour: '09', val: 30 }, { hour: '10', val: 40 }, { hour: '11', val: 45 },
    { hour: '12', val: 38 }, { hour: '13', val: 42 }, { hour: '14', val: 50 }, { hour: '15', val: 48 },
    { hour: '16', val: 55 }, { hour: '17', val: 60 }, { hour: '18', val: 58 }, { hour: '19', val: 64 },
    { hour: '20', val: 72 }, { hour: '21', val: 80 }, { hour: '22', val: 88 }, { hour: '23', val: 75 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Intelligence Analytics & Trend Forecasting
            </h1>
            <Badge variant="crimson">Aggregated Forensic Data</Badge>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: 0, maxWidth: '640px' }}>
            Multi-case longitudinal trend detection across criminal topologies, temporal hot zones, and syndicate vehicle movements.
          </p>
        </div>

        {/* Time range selector */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-glass-border)' }}>
          {(['7d', '30d', '90d', '1y'] as const).map(tr => (
            <button
              key={tr}
              onClick={() => setTimeRange(tr)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: timeRange === tr ? 'rgba(255, 42, 66, 0.2)' : 'transparent',
                border: timeRange === tr ? '1px solid #FF2A42' : '1px solid transparent',
                color: timeRange === tr ? '#fff' : 'var(--color-text-muted)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {tr.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Crime Trends & Crime Categories */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Crime Trends Area Chart */}
        <Card variant="glass" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUpIcon size={18} color="var(--color-crimson)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                Incident Surge & Breach Trends (Monthly Vector)
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-crimson-bright)', fontWeight: 700 }}>
              +14.2% Month-over-Month
            </span>
          </div>

          {/* SVG Area Line Chart */}
          <div style={{ height: '220px', width: '100%', position: 'relative' }}>
            <svg viewBox="0 0 600 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="trend-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FF2A42" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#FF2A42" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="40" x2="600" y2="40" stroke="rgba(255, 255, 255, 0.05)" />
              <line x1="0" y1="90" x2="600" y2="90" stroke="rgba(255, 255, 255, 0.05)" />
              <line x1="0" y1="140" x2="600" y2="140" stroke="rgba(255, 255, 255, 0.05)" />

              {/* Shaded Area */}
              <polygon
                points="0,170 50,150 100,160 150,130 200,140 250,90 300,105 350,70 400,85 450,50 500,65 550,30 600,45 600,190 0,190"
                fill="url(#trend-fill)"
              />

              {/* Crimson Trend Line */}
              <polyline
                points="0,170 50,150 100,160 150,130 200,140 250,90 300,105 350,70 400,85 450,50 500,65 550,30 600,45"
                fill="none"
                stroke="#FF2A42"
                strokeWidth="3"
              />

              {/* Apex Point highlight */}
              <circle cx="550" cy="30" r="5" fill="#FF2A42" stroke="#fff" strokeWidth="2" />
              <text x="550" y="18" fill="#FF2A42" fontSize="10" fontWeight="700" textAnchor="middle">
                PEAK (94 incidents)
              </text>
            </svg>
          </div>
        </Card>

        {/* Crime Categories Breakdown */}
        <Card variant="glass" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <FolderIcon size={18} color="var(--color-crimson)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
              Crime Categories
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {crimeCategories.map((cat, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{cat.label}</span>
                  <span style={{ color: cat.color, fontWeight: 700 }}>{cat.percent}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${cat.percent}%`, height: '100%', background: cat.color, borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 2: Locations & Evidence Types */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* District & Location Distribution */}
        <Card variant="glass" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <MapPinIcon size={18} color="var(--color-crimson)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
              Top Incident Hotspots by District
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {locationsData.map((loc, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--color-text-primary)' }}>{loc.name}</span>
                  <span style={{ color: 'var(--color-crimson-bright)', fontWeight: 700 }}>{loc.cases} cases</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px' }}>
                  <div style={{ width: loc.width, height: '100%', background: 'linear-gradient(90deg, #FF2A42, #F43F5E)', borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Evidence Types Volume */}
        <Card variant="glass" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <FileTextIcon size={18} color="var(--color-crimson)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
              Evidence Ingestion Modality Breakdown
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {evidenceTypesData.map((ev, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: ev.color }} />
                  <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 600 }}>{ev.type}</span>
                </div>
                <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {ev.count.toLocaleString()} artifacts
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 3: Repeated Vehicle Appearances & 24h Timeline Patterns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Repeated Vehicle Appearances */}
        <Card variant="glass" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <CarIcon size={18} color="var(--color-crimson)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
              Repeated Vehicle Detections (ANPR Recurrence)
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {vehicleAppearancesData.map((veh, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--color-glass-border)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {veh.vehicle}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {veh.status}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: veh.color }}>
                    {veh.hits} Sightings
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 24-Hour Timeline Heat Pattern */}
        <Card variant="glass" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <ClockIcon size={18} color="var(--color-crimson)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
              24-Hour Temporal Incident Heat Distribution
            </h3>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 16px 0' }}>
            High clustering observed between 01:00 and 04:00 AM coinciding with bank clearing outages and low-traffic windows.
          </p>

          {/* Histogram Bars */}
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '120px', gap: '4px', paddingTop: '10px' }}>
            {hourlyPattern.map(h => (
              <div
                key={h.hour}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
                title={`${h.hour}:00 - ${h.val} incidents`}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${h.val}%`,
                    background: h.val > 70 ? '#FF2A42' : h.val > 40 ? '#F97316' : 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '2px 2px 0 0',
                    transition: 'height 0.3s ease',
                  }}
                />
                {Number(h.hour) % 4 === 0 && (
                  <span style={{ fontSize: '8px', color: 'var(--color-text-muted)', marginTop: '4px', fontFamily: 'monospace' }}>
                    {h.hour}h
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
