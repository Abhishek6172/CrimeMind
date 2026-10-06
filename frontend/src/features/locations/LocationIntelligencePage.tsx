// ============================================================================
// CrimeMind Location Intelligence & Geotemporal Matrix
// File: LocationIntelligencePage.tsx
// Features: Real-Time OpenStreetMap (Leaflet), Fleet Vehicle Tracking,
// Two-Point Multi-Vector Escape Route Finder, Central Holographic Radar Animation,
// and 100% Preservation of Original Tactical Vector Grid & Graph Properties.
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import { locationsApi } from '../../services/api/locationsApi';
import { LocationPoint, MovementSequence, MovementHop } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { TacticalOpenMap } from './TacticalOpenMap';
import {
  MapPinIcon,
  CameraIcon,
  UserIcon,
  CarIcon,
  PhoneIcon,
  DatabaseIcon,
  AlertTriangleIcon,
  ClockIcon,
  ShieldAlertIcon,
  FilterIcon,
  LayersIcon,
  ArrowRightIcon,
  SearchIcon,
  CheckCircleIcon,
  CrosshairIcon,
  RefreshIcon,
} from '../../components/icons/Icons';

export const LocationIntelligencePage: React.FC = () => {
  const { navigateTo } = useApp();
  const [locations, setLocations] = useState<LocationPoint[]>([]);
  const [movementSequences, setMovementSequences] = useState<MovementSequence[]>([]);
  const [selectedSequence, setSelectedSequence] = useState<MovementSequence | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<LocationPoint | null>(null);
  const [loading, setLoading] = useState(true);

  // View Mode: 'openmap' (Real OpenStreetMap) vs 'vector' (Original Tactical SVG Grid)
  const [viewMode, setViewMode] = useState<'openmap' | 'vector'>('openmap');

  // Layer toggles
  const [layers, setLayers] = useState({
    incidents: true,
    cctv: true,
    persons: true,
    vehicles: true,
    transactions: true,
    calls: true,
  });

  // Timeline slider (0 to 100%)
  const [timeProgress, setTimeProgress] = useState(100);

  // Normalization helper: ensures every point has both GPS lat/lng and SVG x/y
  const normalizeLocations = (rawList: any[]): LocationPoint[] => {
    const minLat = 40.68;
    const maxLat = 40.83;
    const minLng = -74.04;
    const maxLng = -73.94;

    return rawList.map((item, idx) => {
      const lat = item.latitude ?? item.lat ?? 40.73;
      const lng = item.longitude ?? item.lng ?? -73.99;

      // Project into SVG coordinate system (viewBox 0 0 800 500)
      const x = item.x ?? Math.round(((lng - minLng) / (maxLng - minLng)) * 700 + 50);
      const y = item.y ?? Math.round((1 - (lat - minLat) / (maxLat - minLat)) * 400 + 50);

      let type = item.type;
      if (!type) {
        if (item.location_type === 'atm_bank') type = 'transaction_location';
        else if (item.location_type === 'residential') type = 'person_observation';
        else if (item.location_type === 'port_marina' || item.location_type === 'warehouse') type = 'vehicle_observation';
        else if (item.total_incidents && item.total_incidents > 3) type = 'incident';
        else type = 'cctv_camera';
      }

      return {
        id: item.location_id || item.id || `loc-${idx}`,
        name: item.name || `Station #${idx + 1}`,
        description: item.address || item.description || `${item.area || 'Metro Sector'}`,
        type,
        lat,
        lng,
        x,
        y,
        riskLevel: item.risk_level || 'moderate',
        address: item.address,
        details: item,
      };
    });
  };

  const normalizeSequences = (seqs: MovementSequence[]): MovementSequence[] => {
    const minLat = 40.68;
    const maxLat = 40.83;
    const minLng = -74.04;
    const maxLng = -73.94;

    return seqs.map(seq => ({
      ...seq,
      hops: seq.hops.map(hop => {
        const lat = hop.lat ?? minLat + (1 - (hop.y || 250) / 500) * (maxLat - minLat);
        const lng = hop.lng ?? minLng + ((hop.x || 400) / 800) * (maxLng - minLng);
        const x = hop.x ?? Math.round(((lng - minLng) / (maxLng - minLng)) * 700 + 50);
        const y = hop.y ?? Math.round((1 - (lat - minLat) / (maxLat - minLat)) * 400 + 50);
        return {
          ...hop,
          lat,
          lng,
          x,
          y,
        };
      }),
    }));
  };

  // Derive simulated timestamp from selectedSequence based on timeProgress
  const simulatedTimeDisplay = useMemo(() => {
    if (!selectedSequence || selectedSequence.hops.length === 0) {
      return timeProgress === 100 ? 'REAL-TIME' : `T - ${Math.round((100 - timeProgress) * 0.24)}h`;
    }
    const hops = selectedSequence.hops;
    if (hops.length === 1) return hops[0].timestamp || 'REAL-TIME';

    const t = timeProgress / 100;
    const legSpan = 1 / (hops.length - 1);
    const hopIdx = Math.min(Math.floor(t / legSpan), hops.length - 2);
    const fraction = (t - hopIdx * legSpan) / legSpan;

    const t1 = hops[hopIdx].timestamp;
    const t2 = hops[hopIdx + 1].timestamp;

    try {
      const parseTime = (str: string) => {
        const match = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!match) return null;
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const isPM = match[3].toUpperCase() === 'PM';
        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };

      const m1 = parseTime(t1);
      const m2 = parseTime(t2);
      if (m1 === null || m2 === null) return t1;

      let diff = m2 - m1;
      if (diff < 0) diff += 24 * 60;
      const currentM = (m1 + Math.round(diff * fraction)) % (24 * 60);

      let h = Math.floor(currentM / 60);
      const m = currentM % 60;
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      const hStr = h < 10 ? `0${h}` : `${h}`;
      const mStr = m < 10 ? `0${m}` : `${m}`;
      return `${hStr}:${mStr} ${ampm}`;
    } catch {
      return t1;
    }
  }, [selectedSequence, timeProgress]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [locs, seqs] = await Promise.all([
          locationsApi.getAll(),
          locationsApi.getMovementSequences(),
        ]);
        const normalizedLocs = normalizeLocations(locs);
        const normalizedSeqs = normalizeSequences(seqs);

        setLocations(normalizedLocs);
        setMovementSequences(normalizedSeqs);
        if (normalizedSeqs.length > 0) {
          setSelectedSequence(normalizedSeqs[0]);
        }
      } catch (err) {
        console.error('Failed to load location intelligence', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleLayer = (layerKey: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const getMarkerColor = (type: LocationPoint['type']) => {
    switch (type) {
      case 'incident':
        return '#FF2A42'; // Crimson
      case 'cctv_camera':
        return '#06B6D4'; // Cyan
      case 'person_observation':
        return '#F43F5E'; // Rose
      case 'vehicle_observation':
        return '#A855F7'; // Purple
      case 'transaction_location':
        return '#F97316'; // Orange
      case 'call_location':
        return '#10B981'; // Green
      default:
        return '#94A3B8';
    }
  };

  const getStatusBadge = (status: MovementHop['status']) => {
    switch (status) {
      case 'Observed':
        return <Badge variant="success">Observed</Badge>;
      case 'Potential connection':
        return <Badge variant="warning">Potential connection</Badge>;
      case 'AI-inferred':
        return <Badge variant="crimson">AI-inferred</Badge>;
      case 'Requires verification':
      default:
        return <Badge variant="default">Requires verification</Badge>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & View Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Location Intelligence & Geotemporal Matrix
            </h1>
            <Badge variant="crimson" pulse>
              Live GPS/ANPR Stream
            </Badge>

            {/* View Mode Switcher: OpenMap Real Mode vs Tactical Vector Grid */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(10, 14, 22, 0.85)',
                border: '1px solid var(--color-glass-border)',
                borderRadius: '8px',
                padding: '3px',
                backdropFilter: 'blur(12px)',
                marginLeft: '6px',
              }}
            >
              <button
                onClick={() => setViewMode('openmap')}
                style={{
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  background: viewMode === 'openmap' ? 'rgba(255, 42, 66, 0.22)' : 'transparent',
                  color: viewMode === 'openmap' ? '#FF2A42' : 'var(--color-text-muted)',
                  border: viewMode === 'openmap' ? '1px solid rgba(255, 42, 66, 0.5)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>🗺️</span> Mapbox Live Engine
              </button>
              <button
                onClick={() => setViewMode('vector')}
                style={{
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  background: viewMode === 'vector' ? 'rgba(255, 42, 66, 0.22)' : 'transparent',
                  color: viewMode === 'vector' ? '#FF2A42' : 'var(--color-text-muted)',
                  border: viewMode === 'vector' ? '1px solid rgba(255, 42, 66, 0.5)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>📐</span> Tactical Vector Grid
              </button>
            </div>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: 0, maxWidth: '750px' }}>
            Multi-source spatial reconstruction fusing Mapbox high-resolution dark vector tiles, live ANPR license plates, CCTV feeds, and Mapbox multi-vector escape route analysis.
          </p>
        </div>

        {/* Warning Banner Regarding Epistemological Fact */}
        <div
          style={{
            background: 'rgba(255, 42, 66, 0.08)',
            border: '1px solid rgba(255, 42, 66, 0.3)',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '460px',
          }}
        >
          <AlertTriangleIcon size={16} color="var(--color-crimson)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
            <strong style={{ color: 'var(--color-crimson-bright)' }}>LEGAL SAFEGUARD:</strong> Inferred movements are algorithmic hypotheses based on temporal gaps and must NOT be recorded as established fact.
          </span>
        </div>
      </div>

      {/* Main Map Viewport & Sidebar Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', minHeight: '620px' }}>
        {/* Left Map Area: Real OpenMap or Vector Grid */}
        <div
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, #0d121c 0%, #06080c 100%)',
            border: '1px solid var(--color-glass-border)',
            borderRadius: 'var(--border-radius-lg)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '620px',
          }}
        >
          {/* Top Layer Controls & Target Track Selector */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              right: '16px',
              zIndex: 850,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              pointerEvents: 'none',
            }}
          >
            {/* Layer Filter Chips */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                background: 'rgba(10, 13, 20, 0.88)',
                border: '1px solid var(--color-glass-border)',
                borderRadius: '8px',
                padding: '6px 10px',
                backdropFilter: 'blur(14px)',
                pointerEvents: 'auto',
                boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
              }}
            >
              {[
                { key: 'incidents', label: 'Incidents', color: '#FF2A42' },
                { key: 'cctv', label: 'CCTV Feeds', color: '#06B6D4' },
                { key: 'persons', label: 'Subjects', color: '#F43F5E' },
                { key: 'vehicles', label: 'Vehicles', color: '#A855F7' },
                { key: 'transactions', label: 'Transactions', color: '#F97316' },
                { key: 'calls', label: 'Cell Towers', color: '#10B981' },
              ].map(layer => (
                <button
                  key={layer.key}
                  onClick={() => toggleLayer(layer.key as keyof typeof layers)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: layers[layer.key as keyof typeof layers]
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'transparent',
                    border: layers[layer.key as keyof typeof layers]
                      ? `1px solid ${layer.color}`
                      : '1px solid transparent',
                    color: layers[layer.key as keyof typeof layers]
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: layer.color }} />
                  {layer.label}
                </button>
              ))}
            </div>

            {/* Target Sequence Selector */}
            <div
              style={{
                background: 'rgba(10, 13, 20, 0.88)',
                border: '1px solid var(--color-glass-border)',
                borderRadius: '8px',
                padding: '6px 12px',
                backdropFilter: 'blur(14px)',
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Target Track:</span>
              <select
                value={selectedSequence ? selectedSequence.id : 'all'}
                onChange={e => {
                  if (e.target.value === 'all') {
                    setSelectedSequence(null);
                  } else {
                    const seq = movementSequences.find(s => s.id === e.target.value);
                    if (seq) setSelectedSequence(seq);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-crimson-bright)',
                  fontSize: '12px',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all" style={{ background: '#0a0d14', color: '#38BDF8', fontWeight: 'bold' }}>
                  🌐 ALL TARGET TRACKS ({movementSequences.length} TARGETS)
                </option>
                {movementSequences.map(s => (
                  <option key={s.id} value={s.id} style={{ background: '#0a0d14', color: '#fff' }}>
                    {s.targetName} ({s.targetType})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* VIEW MODE 1: REAL OPENSTREETMAP (LEAFLET) */}
          {viewMode === 'openmap' && (
            <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', minHeight: '520px' }}>
              <TacticalOpenMap
                locations={locations}
                movementSequences={movementSequences}
                selectedSequence={selectedSequence}
                selectedPoint={selectedPoint}
                onSelectPoint={setSelectedPoint}
                onSelectSequence={setSelectedSequence}
                layers={layers}
                timeProgress={timeProgress}
                onTimeProgressChange={setTimeProgress}
              />
            </div>
          )}

          {/* VIEW MODE 2: ORIGINAL TACTICAL VECTOR SVG GRID (PRESERVED WITH 100% FIDELITY) */}
          {viewMode === 'vector' && (
            <div style={{ flex: 1, position: 'relative', minHeight: '520px' }}>
              <svg
                style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
                viewBox="0 0 800 500"
                preserveAspectRatio="xMidYMid slice"
              >
                <defs>
                  {/* Sector grid pattern */}
                  <pattern id="tactical-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 42, 66, 0.05)" strokeWidth="1" />
                  </pattern>

                  <linearGradient id="observed-line" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>

                  <linearGradient id="ai-line" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF2A42" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                </defs>

                <rect width="100%" height="100%" fill="url(#tactical-grid)" />

                {/* District Borders & Road Networks (Tactical stylized) */}
                <g stroke="rgba(255, 255, 255, 0.06)" strokeWidth="1.5" fill="none">
                  <path d="M 50 120 Q 200 180 350 140 T 700 200" />
                  <path d="M 120 400 Q 300 350 450 420 T 750 380" />
                  <path d="M 350 50 L 350 450" strokeDasharray="3,3" />
                  <path d="M 550 50 L 550 450" strokeDasharray="3,3" />
                  <circle cx="400" cy="250" r="160" stroke="rgba(255, 42, 66, 0.08)" strokeWidth="1" />
                  <circle cx="400" cy="250" r="280" stroke="rgba(255, 42, 66, 0.04)" strokeWidth="1" />
                </g>

                {/* Selected Target Movement Sequence Route */}
                {selectedSequence && (
                  <g>
                    {/* Sequence Line Paths */}
                    {selectedSequence.hops.map((hop, idx) => {
                      if (idx === selectedSequence.hops.length - 1) return null;
                      const nextHop = selectedSequence.hops[idx + 1];
                      const isObserved = hop.status === 'Observed';

                      return (
                        <g key={`hop-${idx}`}>
                          <line
                            x1={hop.x}
                            y1={hop.y}
                            x2={nextHop.x}
                            y2={nextHop.y}
                            stroke={isObserved ? 'url(#observed-line)' : '#FF2A42'}
                            strokeWidth={isObserved ? 3 : 2}
                            strokeDasharray={isObserved ? undefined : '5,5'}
                            strokeOpacity={isObserved ? 0.9 : 0.7}
                          />
                        </g>
                      );
                    })}

                    {/* Sequence Waypoint Nodes */}
                    {selectedSequence.hops.map((hop, idx) => (
                      <g
                        key={`waypoint-${idx}`}
                        transform={`translate(${hop.x}, ${hop.y})`}
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                          setSelectedPoint({
                            id: `hop-point-${idx}`,
                            name: hop.locationName,
                            description: `Source: ${hop.source} at ${hop.timestamp}. Status: ${hop.status}`,
                            lat: hop.lat || 40.73,
                            lng: hop.lng || -73.99,
                            type: 'vehicle_observation',
                          })
                        }
                      >
                        <circle
                          r={hop.status === 'Observed' ? 7 : 5}
                          fill={hop.status === 'Observed' ? '#10B981' : '#FF2A42'}
                          stroke="#07080B"
                          strokeWidth="2"
                        />
                        <text
                          y="-10"
                          fill="var(--color-text-primary)"
                          fontSize="9"
                          fontWeight="700"
                          textAnchor="middle"
                          style={{ pointerEvents: 'none' }}
                        >
                          #{idx + 1}: {hop.locationName}
                        </text>
                      </g>
                    ))}
                  </g>
                )}

                {/* Map General POI Points */}
                {locations.map(pt => {
                  if (pt.type === 'incident' && !layers.incidents) return null;
                  if (pt.type === 'cctv_camera' && !layers.cctv) return null;
                  if (pt.type === 'person_observation' && !layers.persons) return null;
                  if (pt.type === 'vehicle_observation' && !layers.vehicles) return null;
                  if (pt.type === 'transaction_location' && !layers.transactions) return null;
                  if (pt.type === 'call_location' && !layers.calls) return null;

                  const color = getMarkerColor(pt.type);

                  return (
                    <g
                      key={pt.id}
                      transform={`translate(${pt.x}, ${pt.y})`}
                      onClick={() => setSelectedPoint(pt)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle r={5} fill={color} stroke="#07080B" strokeWidth="1.5" />
                    </g>
                  );
                })}
              </svg>
            </div>
          )}

          {/* Bottom Timeline Scrubber */}
          <div
            style={{
              padding: '12px 20px',
              background: 'rgba(8, 10, 15, 0.96)',
              borderTop: '1px solid var(--color-glass-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)' }}>
              <ClockIcon size={16} />
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Timeline Scrubber
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={timeProgress}
              onChange={e => setTimeProgress(Number(e.target.value))}
              style={{
                flex: 1,
                accentColor: 'var(--color-crimson)',
                cursor: 'pointer',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                {timeProgress}%
              </span>
              <span style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'monospace', color: '#f59e0b', minWidth: '85px', textAlign: 'right' }}>
                {simulatedTimeDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Movement Sequence Inspector & Point Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Target Track Dossier Card */}
          <Card variant="glass" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  Active Trajectory Track
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--color-text-primary)' }}>
                  {selectedSequence?.targetName || 'Select Track'}
                </h3>
              </div>
              <Badge variant="crimson">{selectedSequence?.targetType || 'ENTITY'}</Badge>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.5', margin: '0 0 14px 0' }}>
              Reconstructed trajectory spanning {selectedSequence?.hops.length || 0} sequential coordinates. Correlates optical sightings against algorithmic inferences.
            </p>

            {/* Sequence Hops List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
              {selectedSequence?.hops.map((hop, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--color-glass-border)',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      #{i + 1}. {hop.locationName}
                    </span>
                    {getStatusBadge(hop.status)}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    <span>{hop.timestamp}</span>
                    <span>Source: {hop.source}</span>
                  </div>

                  {hop.confidence && (
                    <div style={{ fontSize: '11px', color: 'var(--color-crimson)', fontWeight: 600 }}>
                      Match Confidence: {(hop.confidence * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Vehicle Fleet Telemetry Card */}
          <Card variant="glass" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-crimson)', fontWeight: 800 }}>
                Suspect & Pursuit Fleet
              </span>
              <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 700 }}>4 ACTIVE BEACONS</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,42,66,0.08)', borderRadius: '6px', border: '1px solid rgba(255,42,66,0.2)' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#fff' }}>Dodge Charger (SYN-7X91)</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Getaway Vehicle &bull; 68 MPH</div>
                </div>
                <Badge variant="crimson">PURSUIT</Badge>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#fff' }}>Ford Explorer (SYN-4K82)</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Viktor Orlov &bull; 42 MPH</div>
                </div>
                <Badge variant="warning">CRUISING</Badge>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(6,182,212,0.08)', borderRadius: '6px', border: '1px solid rgba(6,182,212,0.2)' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#fff' }}>Police Unit 21 (POL-204)</div>
                  <div style={{ fontSize: '10px', color: '#06B6D4' }}>Interceptor &bull; 75 MPH</div>
                </div>
                <Badge variant="success">VECTORING</Badge>
              </div>
            </div>
          </Card>

          {/* Selected Point Inspect */}
          {selectedPoint && (
            <Card variant="glass" style={{ padding: '16px', border: '1px solid rgba(255, 42, 66, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-crimson)', fontWeight: 800 }}>
                  Selected Coordinate
                </span>
                <Badge variant="default">{((selectedPoint.type || 'coordinate') as string).replace(/_/g, ' ').toUpperCase()}</Badge>
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--color-text-primary)' }}>
                {selectedPoint.name}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 10px 0' }}>
                {selectedPoint.description}
              </p>

              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>
                GPS: {selectedPoint.lat.toFixed(5)}, {selectedPoint.lng.toFixed(5)}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
