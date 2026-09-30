// ============================================================================
// CrimeMind Tactical Mapbox Engine - Real-Time Tracking & Investigative Hypotheses
// File: TacticalOpenMap.tsx
// Features: Real-Time Mapbox Road Trajectories, Sequential Event-Based Travelling Dot,
// Investigative Assumption Waypoint Dropper, Multi-Path Scenario Modeling & Comparison,
// Two-Point Escape Route Finder, and 100% Clean Map Visibility (No Obstructing Circles)
// ============================================================================

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationPoint, MovementSequence, MovementHop } from '../../types';
import {
  CarIcon,
  MapPinIcon,
  CameraIcon,
  ShieldAlertIcon,
  ClockIcon,
  ArrowRightIcon,
  RefreshIcon,
  CrosshairIcon,
  LayersIcon,
  AlertTriangleIcon,
  CheckIcon,
} from '../../components/icons/Icons';

export const MAPBOX_ACCESS_TOKEN =
  (import.meta as any).env?.VITE_MAPBOX_ACCESS_TOKEN || '';

export type MapboxStyleKey = 'dark' | 'navigation' | 'satellite' | 'streets';

export interface RouteOption {
  id: string;
  name: string;
  type: 'arterial' | 'bypass' | 'stealth';
  color: string;
  coordinates: Array<[number, number]>;
  distanceMiles: number;
  durationMinutes: number;
  cctvCount: number;
  anprRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  description: string;
  chokePoint: string;
}

export interface AssumptionHop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  timestamp: string; // e.g. "01:45 AM"
  hypothesisType: 'detour' | 'safehouse' | 'accomplice_meet' | 'vehicle_switch' | 'dead_drop' | 'choke_point';
  notes: string;
  confidence: number; // 0.1 to 1.0
  isAssumed: boolean;
}

export interface HypothesisScenario {
  id: string;
  name: string;
  shortName: string;
  color: string;
  description: string;
  visible: boolean; // whether rendered on map
  hops: AssumptionHop[];
  roadCoordinates: Array<[number, number]>;
  distances: number[];
  totalDistanceMiles: number;
  isCustom?: boolean;
}

interface TacticalOpenMapProps {
  locations: LocationPoint[];
  movementSequences: MovementSequence[];
  selectedSequence: MovementSequence | null;
  selectedPoint: LocationPoint | null;
  onSelectPoint: (point: LocationPoint | null) => void;
  onSelectSequence?: (seq: MovementSequence) => void;
  layers: {
    incidents: boolean;
    cctv: boolean;
    persons: boolean;
    vehicles: boolean;
    transactions: boolean;
    calls: boolean;
  };
  timeProgress: number; // 0 to 100%
  onTimeProgressChange?: (progress: number) => void;
}

// ----------------------------------------------------------------------------
// Geodesic and Math Helpers
// ----------------------------------------------------------------------------
function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const phi1 = lat1 * rad;
  const phi2 = lat2 * rad;
  const deltaLambda = (lng2 - lng1) * rad;
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}

function getCompassHeading(deg: number): string {
  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(deg / 22.5) % 16;
  return cardinals[idx];
}

function calculateDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function interpolateTimeString(t1Str: string, t2Str: string, fraction: number): string {
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

    const m1 = parseTime(t1Str);
    const m2 = parseTime(t2Str);
    if (m1 === null || m2 === null) return t1Str;

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
    return t1Str;
  }
}

export const TacticalOpenMap: React.FC<TacticalOpenMapProps> = ({
  locations,
  movementSequences,
  selectedSequence,
  selectedPoint,
  onSelectPoint,
  onSelectSequence,
  layers,
  timeProgress,
  onTimeProgressChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Map layer groups
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const baselineRouteLayerRef = useRef<L.LayerGroup | null>(null);
  const hypothesisRoutesLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const vehicleLayerRef = useRef<L.LayerGroup | null>(null);
  const waypointsLayerRef = useRef<L.LayerGroup | null>(null);

  // Base map style
  const [mapStyle, setMapStyle] = useState<MapboxStyleKey>('dark');

  // Processing indicator (clean HUD banner, no circles)
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Baseline Road Data (from Mapbox for the verified sequence)
  const [baselineRoadCoords, setBaselineRoadCoords] = useState<Array<[number, number]>>([]);
  const [baselineDistances, setBaselineDistances] = useState<number[]>([]);
  const [baselineTotalDistance, setBaselineTotalDistance] = useState<number>(0);
  const [baselineWaypointIndices, setBaselineWaypointIndices] = useState<number[]>([]);

  // --------------------------------------------------------------------------
  // Investigative Hypotheses & Assumed Multi-Path Scenarios
  // --------------------------------------------------------------------------
  const [hypotheses, setHypotheses] = useState<HypothesisScenario[]>([
    {
      id: 'hyp-safehouse-detour',
      name: 'Hypothesis A: Safehouse Stash Detour',
      shortName: 'HYP-A: SAFEHOUSE',
      color: '#F59E0B', // Glowing Amber
      description: 'Theory: Suspect detoured north to Greenwich St cold storage to stash bearer bonds before fleeing.',
      visible: true,
      totalDistanceMiles: 4.1,
      hops: [
        {
          id: 'hyp-a-1',
          name: 'Wharf Warehouse 4B',
          lat: 40.7028,
          lng: -74.015,
          timestamp: '01:15 AM',
          hypothesisType: 'detour',
          notes: 'Confirmed departure point from waterfront storage container.',
          confidence: 0.96,
          isAssumed: false,
        },
        {
          id: 'hyp-a-2',
          name: 'Greenwich St Cold Vault',
          lat: 40.7145,
          lng: -74.0095,
          timestamp: '01:45 AM',
          hypothesisType: 'safehouse',
          notes: 'ASSUMPTION: Suspect stashed encrypted drive and bearer bonds in sublet vault.',
          confidence: 0.68,
          isAssumed: true,
        },
        {
          id: 'hyp-a-3',
          name: 'Washington Sq Park Footpath',
          lat: 40.7308,
          lng: -73.9973,
          timestamp: '02:25 AM',
          hypothesisType: 'dead_drop',
          notes: 'ASSUMPTION: Dead-drop handover of burner phone to Midnight Syndicate courier.',
          confidence: 0.62,
          isAssumed: true,
        },
        {
          id: 'hyp-a-4',
          name: 'Industrial Gate 2',
          lat: 40.725,
          lng: -73.991,
          timestamp: '03:45 AM',
          hypothesisType: 'choke_point',
          notes: 'Intercepted exit gate near Canal Street commercial alley.',
          confidence: 0.75,
          isAssumed: false,
        },
      ],
      roadCoordinates: [],
      distances: [],
    },
    {
      id: 'hyp-vehicle-swap',
      name: 'Hypothesis B: Maritime / Vehicle Swap',
      shortName: 'HYP-B: VEHICLE SWAP',
      color: '#A855F7', // Neon Violet
      description: 'Theory: Swapped from Dodge Charger into a delivery utility van in Chinatown alley, attempted pier exfiltration.',
      visible: true,
      totalDistanceMiles: 5.2,
      hops: [
        {
          id: 'hyp-b-1',
          name: 'Wharf Warehouse 4B',
          lat: 40.7028,
          lng: -74.015,
          timestamp: '01:15 AM',
          hypothesisType: 'detour',
          notes: 'Initial sighting exiting warehouse.',
          confidence: 0.96,
          isAssumed: false,
        },
        {
          id: 'hyp-b-2',
          name: 'Financial District Perimeter',
          lat: 40.7075,
          lng: -74.009,
          timestamp: '02:10 AM',
          hypothesisType: 'choke_point',
          notes: 'Observed cell tower azimuth ping.',
          confidence: 0.78,
          isAssumed: false,
        },
        {
          id: 'hyp-b-3',
          name: 'Chinatown Alleyway Garage',
          lat: 40.716,
          lng: -73.9975,
          timestamp: '02:40 AM',
          hypothesisType: 'vehicle_switch',
          notes: 'ASSUMPTION: Suspect switched into White Chevy Express utility van to bypass ANPR toll gates.',
          confidence: 0.71,
          isAssumed: true,
        },
        {
          id: 'hyp-b-4',
          name: 'Pier 36 East River Dock',
          lat: 40.71,
          lng: -73.985,
          timestamp: '03:15 AM',
          hypothesisType: 'accomplice_meet',
          notes: 'ASSUMPTION: Attempted boat rendezvous; aborted due to harbor patrol beacon.',
          confidence: 0.58,
          isAssumed: true,
        },
        {
          id: 'hyp-b-5',
          name: 'Industrial Gate 2',
          lat: 40.725,
          lng: -73.991,
          timestamp: '03:55 AM',
          hypothesisType: 'choke_point',
          notes: 'Secondary escape corridor exit.',
          confidence: 0.65,
          isAssumed: false,
        },
      ],
      roadCoordinates: [],
      distances: [],
    },
  ]);

  // Which path is currently being simulated by the travelling dot ('baseline' or hypothesis ID)
  const [activeSimulationPathId, setActiveSimulationPathId] = useState<string>('baseline');

  // Toggle for Assumptions Studio Flyout panel (defaults to false to prevent covering controls)
  const [showAssumptionStudio, setShowAssumptionStudio] = useState<boolean>(false);

  // Adding Assumption Point Mode: when true, clicking on map drops a new assumption point
  const [isAddingAssumptionPoint, setIsAddingAssumptionPoint] = useState<boolean>(false);
  const [targetHypothesisIdForAdd, setTargetHypothesisIdForAdd] = useState<string>('hyp-safehouse-detour');

  // Modal State for new Assumption Point Dialog
  const [pendingAssumptionCoord, setPendingAssumptionCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [newPointName, setNewPointName] = useState<string>('');
  const [newPointTime, setNewPointTime] = useState<string>('02:15 AM');
  const [newPointType, setNewPointType] = useState<AssumptionHop['hypothesisType']>('safehouse');
  const [newPointNotes, setNewPointNotes] = useState<string>('');
  const [newPointConfidence, setNewPointConfidence] = useState<number>(0.65);

  // Fullscreen Mode State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Add Waypoint Modal & Dual-Mode Input (Type vs Touch Map)
  const [showAddWaypointModal, setShowAddWaypointModal] = useState<boolean>(false);
  const [waypointInputMode, setWaypointInputMode] = useState<'type' | 'map'>('type');
  const [searchAddressQuery, setSearchAddressQuery] = useState<string>('');
  const [isSearchingGeocode, setIsSearchingGeocode] = useState<boolean>(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [createNewScenarioInModal, setCreateNewScenarioInModal] = useState<boolean>(false);
  const [newScenarioCustomName, setNewScenarioCustomName] = useState<string>('');
  const [newScenarioCustomColor, setNewScenarioCustomColor] = useState<string>('#38BDF8');

  // Quick NYC Tactical Landmark Presets
  const NYC_LANDMARKS = [
    { name: 'Times Square Central Hub', lat: 40.7580, lng: -73.9855, tag: 'Midtown' },
    { name: 'Chinatown Alleyway Garage', lat: 40.7158, lng: -73.9970, tag: 'Lower Manhattan' },
    { name: 'Pier 36 Maritime Terminal', lat: 40.7100, lng: -73.9850, tag: 'East River Dock' },
    { name: 'Wall Street Cold Vault', lat: 40.7075, lng: -74.0090, tag: 'Financial District' },
    { name: 'Greenwich St Safehouse', lat: 40.7145, lng: -74.0095, tag: 'Tribeca' },
    { name: 'Washington Sq Park Footpath', lat: 40.7308, lng: -73.9973, tag: 'Greenwich Village' },
    { name: 'Grand Central Sublevel', lat: 40.7527, lng: -73.9772, tag: 'Transit Corridor' },
    { name: 'SoHo Cobblestone Alley', lat: 40.7233, lng: -74.0030, tag: 'Downtown' },
    { name: 'Brooklyn Bridge West Pier', lat: 40.7061, lng: -73.9969, tag: 'Waterfront' },
  ];

  // Real-Time Simulation State
  const [isSimulating, setIsSimulating] = useState(true);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 0.5x, 1x, 2x, 5x
  const [simProgress, setSimProgress] = useState<number>(timeProgress / 100);
  const [followTarget, setFollowTarget] = useState<boolean>(false);

  // Two-Point Route Planning State
  const [routeToolActive, setRouteToolActive] = useState<boolean>(false);
  const [settingPointMode, setSettingPointMode] = useState<'A' | 'B' | null>(null);
  const [pointA, setPointA] = useState<{ lat: number; lng: number; name: string } | null>({
    lat: 40.7589,
    lng: -73.9851,
    name: 'Metropolis First National Bank & Vault',
  });
  const [pointB, setPointB] = useState<{ lat: number; lng: number; name: string } | null>({
    lat: 40.7028,
    lng: -74.015,
    name: 'Waterfront Terminal 4 Container Yard',
  });
  const [calculatedRoutes, setCalculatedRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Ref to settingPointMode & isAddingAssumptionPoint to avoid stale closures
  const clickModeRef = useRef<{ settingMode: 'A' | 'B' | null; addingAssumption: boolean; targetHypId: string }>({
    settingMode: null,
    addingAssumption: false,
    targetHypId: 'hyp-safehouse-detour',
  });
  clickModeRef.current = {
    settingMode: settingPointMode,
    addingAssumption: isAddingAssumptionPoint,
    targetHypId: targetHypothesisIdForAdd,
  };

  // Sync external timeProgress prop with internal simProgress when paused
  useEffect(() => {
    if (!isSimulating) {
      setSimProgress(timeProgress / 100);
    }
  }, [timeProgress, isSimulating]);

  // --------------------------------------------------------------------------
  // 1. Initialize Leaflet Map Instance with Mapbox Tiles
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [40.718, -74.004],
      zoom: 13,
      minZoom: 10,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const tileLayer = L.tileLayer(
      `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`,
      {
        maxZoom: 22,
        tileSize: 256,
        attribution: '© Mapbox © OpenStreetMap',
      }
    ).addTo(map);

    tileLayerRef.current = tileLayer;

    // Create Layer Groups
    markersLayerRef.current = L.layerGroup().addTo(map);
    baselineRouteLayerRef.current = L.layerGroup().addTo(map);
    hypothesisRoutesLayerRef.current = L.layerGroup().addTo(map);
    routesLayerRef.current = L.layerGroup().addTo(map);
    vehicleLayerRef.current = L.layerGroup().addTo(map);
    waypointsLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    // Map Click Listener (Waypoint placement OR Assumption Point Dropper)
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const { settingMode, addingAssumption } = clickModeRef.current;

      if (addingAssumption) {
        // Drop new assumption point at clicked coordinate
        setPendingAssumptionCoord({ lat, lng });
        setNewPointName(`Map Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        setNewPointNotes('Investigator assumption: potential detour or accomplice meet.');
        setIsAddingAssumptionPoint(false);
        setShowAddWaypointModal(true);
        setWaypointInputMode('map');
      } else if (settingMode === 'A') {
        setPointA({ lat, lng, name: `Coordinate (${lat.toFixed(4)}, ${lng.toFixed(4)})` });
        setSettingPointMode(null);
      } else if (settingMode === 'B') {
        setPointB({ lat, lng, name: `Coordinate (${lat.toFixed(4)}, ${lng.toFixed(4)})` });
        setSettingPointMode(null);
      }
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update base map tiles when style changes
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    mapRef.current.removeLayer(tileLayerRef.current);

    let styleId = 'mapbox/dark-v11';
    if (mapStyle === 'navigation') styleId = 'mapbox/navigation-night-v1';
    else if (mapStyle === 'satellite') styleId = 'mapbox/satellite-streets-v12';
    else if (mapStyle === 'streets') styleId = 'mapbox/streets-v12';

    const newLayer = L.tileLayer(
      `https://api.mapbox.com/styles/v1/${styleId}/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`,
      {
        maxZoom: 22,
        tileSize: 256,
        attribution: '© Mapbox © OpenStreetMap',
      }
    ).addTo(mapRef.current);

    tileLayerRef.current = newLayer;
  }, [mapStyle]);

  // Helper to query Mapbox Directions API for any list of coordinates
  const fetchMapboxDrivingRoute = useCallback(async (hops: Array<{ lat: number; lng: number }>) => {
    if (hops.length < 2) return null;
    try {
      const waypointsStr = hops.map(h => `${h.lng},${h.lat}`).join(';');
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypointsStr}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_ACCESS_TOKEN}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.routes && data.routes[0]?.geometry?.coordinates) {
          const coords: Array<[number, number]> = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);

          const distances: number[] = [0];
          let running = 0;
          for (let i = 0; i < coords.length - 1; i++) {
            const d = calculateDistanceMiles(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
            running += d;
            distances.push(running);
          }

          return { coords, distances, totalDistance: running };
        }
      }
    } catch (err) {
      console.warn('Mapbox driving route fetch fallback', err);
    }

    // Grid fallback
    const coords: Array<[number, number]> = [];
    for (let i = 0; i < hops.length - 1; i++) {
      const hA = hops[i];
      const hB = hops[i + 1];
      const steps = 14;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        coords.push([hA.lat + (hB.lat - hA.lat) * t, hA.lng + (hB.lng - hA.lng) * t]);
      }
    }
    coords.push([hops[hops.length - 1].lat, hops[hops.length - 1].lng]);

    const distances: number[] = [0];
    let running = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const d = calculateDistanceMiles(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
      running += d;
      distances.push(running);
    }
    return { coords, distances, totalDistance: running };
  }, []);

  // --------------------------------------------------------------------------
  // 2. Fetch and Reconstruct Baseline Road Trajectory
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!selectedSequence) {
      setBaselineRoadCoords([]);
      return;
    }

    const hops = selectedSequence.hops.filter(h => h.lat != null && h.lng != null);
    if (hops.length < 2) return;

    let isMounted = true;

    const loadBaseline = async () => {
      setIsProcessing(true);
      setProcessingStatus(`MAPBOX ENGINE: RE-ROUTING ROAD NETWORK FOR ${selectedSequence.targetName.toUpperCase()}...`);

      const res = await fetchMapboxDrivingRoute(hops.map(h => ({ lat: h.lat!, lng: h.lng! })));
      if (res && isMounted) {
        setBaselineRoadCoords(res.coords);
        setBaselineDistances(res.distances);
        setBaselineTotalDistance(res.totalDistance);

        // Identify closest coordinate indices for each hop
        const indices: number[] = [];
        hops.forEach((hop, idx) => {
          let closest = 0;
          let minD = Infinity;
          res.coords.forEach((c, cIdx) => {
            const d = calculateDistanceMiles(hop.lat!, hop.lng!, c[0], c[1]);
            if (d < minD) {
              minD = d;
              closest = cIdx;
            }
          });
          if (idx > 0 && closest <= indices[idx - 1]) {
            closest = Math.min(res.coords.length - 1, indices[idx - 1] + 1);
          }
          indices.push(closest);
        });
        setBaselineWaypointIndices(indices);

        if (mapRef.current && res.coords.length > 0) {
          mapRef.current.fitBounds(L.latLngBounds(res.coords), { padding: [50, 50] });
        }
      }

      if (isMounted) {
        setIsProcessing(false);
        setProcessingStatus('');
      }
    };

    loadBaseline();

    return () => {
      isMounted = false;
    };
  }, [selectedSequence, fetchMapboxDrivingRoute]);

  // --------------------------------------------------------------------------
  // 3. Fetch Real Road Geometries for All Active Hypotheses (Multi-Path)
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const loadHypothesesRoutes = async () => {
      const updated = await Promise.all(
        hypotheses.map(async hyp => {
          if (hyp.roadCoordinates.length > 0) return hyp;
          const validHops = hyp.hops.filter(h => h.lat != null && h.lng != null);
          if (validHops.length < 2) return hyp;

          const res = await fetchMapboxDrivingRoute(validHops.map(h => ({ lat: h.lat, lng: h.lng })));
          if (!res) return hyp;

          return {
            ...hyp,
            roadCoordinates: res.coords,
            distances: res.distances,
            totalDistanceMiles: parseFloat(res.totalDistance.toFixed(1)),
          };
        })
      );

      if (isMounted) {
        setHypotheses(updated);
      }
    };

    loadHypothesesRoutes();

    return () => {
      isMounted = false;
    };
  }, [hypotheses.length, fetchMapboxDrivingRoute]);

  // --------------------------------------------------------------------------
  // 4. Render Baseline Verified Route & Event Waypoints
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!baselineRouteLayerRef.current || !mapRef.current || !selectedSequence) return;
    baselineRouteLayerRef.current.clearLayers();

    if (baselineRoadCoords.length < 2) return;

    const themeColor = selectedSequence.targetType === 'PERSON' ? '#FF2A42' : '#06B6D4';

    // Outer glow
    const glowLine = L.polyline(baselineRoadCoords, {
      color: themeColor,
      weight: 8,
      opacity: 0.3,
    });
    glowLine.addTo(baselineRouteLayerRef.current);

    // Inner crisp road vector
    const coreLine = L.polyline(baselineRoadCoords, {
      color: themeColor,
      weight: 4,
      opacity: 0.95,
    });
    coreLine.addTo(baselineRouteLayerRef.current);

    // Render Event Waypoints
    selectedSequence.hops.forEach((hop, idx) => {
      if (hop.lat == null || hop.lng == null) return;
      const isObserved = hop.status === 'Observed';
      const nodeColor = isObserved ? '#10B981' : '#FF2A42';

      const icon = L.divIcon({
        html: `
          <div style="
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
            transform: translate(-12px, -14px);
            cursor: pointer;
          ">
            <div style="
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: #080B12;
              border: 2px solid ${nodeColor};
              box-shadow: 0 0 10px ${nodeColor};
              color: #fff;
              font-size: 11px;
              font-weight: 900;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              ${idx + 1}
            </div>
            <div style="
              background: rgba(8, 11, 18, 0.92);
              border: 1px solid rgba(255, 255, 255, 0.2);
              padding: 2px 7px;
              border-radius: 4px;
              display: flex;
              flex-direction: column;
              backdrop-filter: blur(8px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.6);
            ">
              <span style="font-size: 11px; font-weight: 800; color: #fff;">
                ${hop.locationName}
              </span>
              <span style="font-size: 9px; font-family: monospace; color: #94a3b8;">
                ${hop.timestamp} &bull; ${hop.source}
              </span>
            </div>
          </div>
        `,
        className: 'verified-event-node',
        iconSize: [24, 24],
      });

      const marker = L.marker([hop.lat, hop.lng], { icon });
      marker.bindPopup(`
        <div style="font-size: 12px; color: #fff; min-width: 200px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 800; color: ${nodeColor}; font-size: 13px;">
              VERIFIED EVENT #${idx + 1}
            </span>
            <span style="font-size: 9px; padding: 2px 5px; border-radius: 3px; background: rgba(255,255,255,0.1); color: #cbd5e1;">
              ${hop.status}
            </span>
          </div>
          <div style="font-weight: 700; color: #fff; margin-bottom: 4px;">${hop.locationName}</div>
          <div style="font-size: 11px; color: #94a3b8;"><strong>Time:</strong> ${hop.timestamp}</div>
          <div style="font-size: 11px; color: #94a3b8;"><strong>Source:</strong> ${hop.source}</div>
          <div style="font-size: 11px; color: #10B981; font-weight: 700; margin-top: 4px;">
            Verified Sighting (${Math.round((hop.confidence || 0.8) * 100)}% match)
          </div>
        </div>
      `);

      marker.addTo(baselineRouteLayerRef.current!);
    });
  }, [baselineRoadCoords, selectedSequence]);

  // --------------------------------------------------------------------------
  // 5. Render Hypotheses & Assumed Multi-Paths on Map
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!hypothesisRoutesLayerRef.current || !mapRef.current) return;
    hypothesisRoutesLayerRef.current.clearLayers();

    hypotheses.forEach(hyp => {
      if (!hyp.visible) return;
      if (hyp.roadCoordinates.length < 2) return;

      const isCurrentSim = activeSimulationPathId === hyp.id;

      // Glow polyline
      const glowLine = L.polyline(hyp.roadCoordinates, {
        color: hyp.color,
        weight: isCurrentSim ? 7 : 4,
        opacity: isCurrentSim ? 0.35 : 0.18,
      });

      // Dashed Tactical Hypothesis Polyline
      const roadLine = L.polyline(hyp.roadCoordinates, {
        color: hyp.color,
        weight: isCurrentSim ? 3.5 : 2.5,
        dashArray: '8, 8',
        opacity: isCurrentSim ? 1 : 0.75,
      });

      roadLine.bindPopup(`
        <div style="font-size: 12px; color: #fff; min-width: 210px;">
          <div style="font-weight: 800; color: ${hyp.color}; font-size: 13px; margin-bottom: 4px;">
            ${hyp.name}
          </div>
          <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 6px;">
            ${hyp.description}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;">
            <span>Dist: ${hyp.totalDistanceMiles} mi</span>
            <span>Hops: ${hyp.hops.length} points</span>
          </div>
        </div>
      `);

      glowLine.addTo(hypothesisRoutesLayerRef.current!);
      roadLine.addTo(hypothesisRoutesLayerRef.current!);

      // Render Assumption Waypoint Nodes
      hyp.hops.forEach((hop, hIdx) => {
        if (!hop.isAssumed) return; // Verified hops are already on baseline layer

        const customIcon = L.divIcon({
          html: `
            <div style="
              display: flex;
              align-items: center;
              gap: 6px;
              white-space: nowrap;
              transform: translate(-12px, -12px);
              cursor: pointer;
            ">
              <div style="
                width: 24px;
                height: 24px;
                transform: rotate(45deg);
                background: #0a0e18;
                border: 2px solid ${hyp.color};
                box-shadow: 0 0 12px ${hyp.color};
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <span style="
                  transform: rotate(-45deg);
                  color: #fff;
                  font-size: 10px;
                  font-weight: 900;
                ">?</span>
              </div>
              <div style="
                background: rgba(10, 14, 24, 0.95);
                border: 1px dashed ${hyp.color};
                padding: 2px 7px;
                border-radius: 4px;
                display: flex;
                flex-direction: column;
                backdrop-filter: blur(8px);
                box-shadow: 0 4px 14px rgba(0,0,0,0.8);
              ">
                <span style="font-size: 10px; font-weight: 800; color: ${hyp.color}; text-transform: uppercase;">
                  [ASSUMPTION] ${hop.name}
                </span>
                <span style="font-size: 9px; font-family: monospace; color: #cbd5e1;">
                  ${hop.timestamp} &bull; ${(hop.confidence * 100).toFixed(0)}% Lead
                </span>
              </div>
            </div>
          `,
          className: 'assumed-waypoint-node',
          iconSize: [24, 24],
        });

        const marker = L.marker([hop.lat, hop.lng], { icon: customIcon });

        marker.bindPopup(`
          <div style="font-size: 12px; color: #fff; min-width: 220px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-weight: 800; color: ${hyp.color}; font-size: 12px; text-transform: uppercase;">
                ${hyp.shortName}
              </span>
              <span style="font-size: 9px; padding: 2px 5px; border-radius: 3px; background: rgba(245,158,11,0.2); color: #f59e0b; font-weight: 700;">
                HYPOTHESIS LEAD
              </span>
            </div>
            <div style="font-weight: 700; font-size: 13px; color: #fff; margin-bottom: 4px;">${hop.name}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;"><strong>Assumed Time:</strong> ${hop.timestamp}</div>
            <div style="font-size: 11px; color: #cbd5e1; background: rgba(255,255,255,0.05); padding: 6px; border-radius: 4px; margin-bottom: 8px;">
              ${hop.notes}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;">
              <span style="font-size: 10px; color: #f59e0b; font-weight: 700;">Confidence: ${(hop.confidence * 100).toFixed(0)}%</span>
              <button id="btn-remove-hop-${hyp.id}-${hop.id}" style="
                background: rgba(255,42,66,0.2); border: 1px solid #FF2A42; color: #FF2A42;
                font-size: 10px; padding: 2px 6px; border-radius: 3px; cursor: pointer;
              ">Remove Point</button>
            </div>
          </div>
        `);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-remove-hop-${hyp.id}-${hop.id}`);
          if (btn) {
            btn.onclick = () => {
              removeAssumptionHop(hyp.id, hop.id);
              mapRef.current?.closePopup();
            };
          }
        });

        marker.addTo(hypothesisRoutesLayerRef.current!);
      });
    });
  }, [hypotheses, activeSimulationPathId]);

  // --------------------------------------------------------------------------
  // 6. Real-time Simulation Animation Loop
  // --------------------------------------------------------------------------
  useEffect(() => {
    let animInterval: any = null;

    if (isSimulating) {
      animInterval = setInterval(() => {
        setSimProgress(prev => {
          const step = 0.003 * simSpeed;
          let next = prev + step;
          if (next > 1) next = 0;
          if (onTimeProgressChange) {
            onTimeProgressChange(Math.round(next * 100));
          }
          return next;
        });
      }, 100);
    }

    return () => {
      if (animInterval) clearInterval(animInterval);
    };
  }, [isSimulating, simSpeed, onTimeProgressChange]);

  // --------------------------------------------------------------------------
  // 7. Compute Position for Active Simulated Path (Baseline or Hypothesis)
  // --------------------------------------------------------------------------
  const activeTelemetry = useMemo(() => {
    // Choose active path
    let coords: Array<[number, number]> = [];
    let distances: number[] = [];
    let totalDist = 1;
    let pathTitle = '';
    let hopsList: Array<{ name: string; timestamp: string }> = [];

    if (activeSimulationPathId === 'baseline') {
      coords = baselineRoadCoords;
      distances = baselineDistances;
      totalDist = baselineTotalDistance || 1;
      pathTitle = selectedSequence ? `${selectedSequence.targetName} (Observed Path)` : 'Baseline Track';
      hopsList = (selectedSequence?.hops || []).map(h => ({ name: h.locationName, timestamp: h.timestamp }));
    } else {
      const hyp = hypotheses.find(h => h.id === activeSimulationPathId);
      if (hyp && hyp.roadCoordinates.length > 0) {
        coords = hyp.roadCoordinates;
        distances = hyp.distances;
        totalDist = hyp.totalDistanceMiles || 1;
        pathTitle = hyp.name;
        hopsList = hyp.hops.map(h => ({ name: h.name, timestamp: h.timestamp }));
      }
    }

    if (coords.length < 2) return null;

    const targetDist = simProgress * totalDist;
    let segmentIndex = 0;

    if (distances.length === coords.length) {
      for (let i = 0; i < distances.length - 1; i++) {
        if (targetDist >= distances[i] && targetDist <= distances[i + 1]) {
          segmentIndex = i;
          break;
        }
      }
      if (targetDist >= distances[distances.length - 1]) {
        segmentIndex = coords.length - 2;
      }
    } else {
      segmentIndex = Math.min(Math.floor(simProgress * (coords.length - 1)), coords.length - 2);
    }

    const [lat1, lng1] = coords[segmentIndex];
    const [lat2, lng2] = coords[segmentIndex + 1];

    let segT = 0.5;
    if (distances.length === coords.length) {
      const span = distances[segmentIndex + 1] - distances[segmentIndex];
      segT = span > 0 ? (targetDist - distances[segmentIndex]) / span : 0;
    } else {
      segT = (simProgress * (coords.length - 1)) - segmentIndex;
    }
    segT = Math.max(0, Math.min(1, segT));

    const currentLat = lat1 + (lat2 - lat1) * segT;
    const currentLng = lng1 + (lng2 - lng1) * segT;
    const bearing = Math.round(calculateBearing(lat1, lng1, lat2, lng2));

    // Approximate active hop and simulated time
    const hopFrac = Math.max(0, Math.min(hopsList.length - 1, simProgress * (hopsList.length - 1)));
    const hopIdx = Math.min(Math.floor(hopFrac), hopsList.length - 2);
    const subFrac = hopFrac - hopIdx;

    const hA = hopsList[hopIdx] || { name: 'Origin', timestamp: '01:00 AM' };
    const hB = hopsList[hopIdx + 1] || { name: 'Destination', timestamp: '03:45 AM' };

    const simulatedTime = interpolateTimeString(hA.timestamp, hB.timestamp, subFrac);
    const currentLeg = subFrac > 0.9
      ? `ARRIVING: ${hB.name}`
      : `EN ROUTE: ${hA.name} ➔ ${hB.name}`;

    return {
      coord: [currentLat, currentLng] as [number, number],
      bearing,
      speedMph: Math.round(36 + Math.sin(simProgress * 18) * 6),
      pathTitle,
      simulatedTime,
      currentLeg,
    };
  }, [
    activeSimulationPathId,
    baselineRoadCoords,
    baselineDistances,
    baselineTotalDistance,
    selectedSequence,
    hypotheses,
    simProgress,
  ]);

  // --------------------------------------------------------------------------
  // 8. Render Animated Travelling Dot Along Active Path
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!vehicleLayerRef.current || !mapRef.current || !activeTelemetry) return;
    vehicleLayerRef.current.clearLayers();

    const { coord, bearing, speedMph, currentLeg, simulatedTime, pathTitle } = activeTelemetry;
    const isBaseline = activeSimulationPathId === 'baseline';
    const dotColor = isBaseline ? '#FF2A42' : '#F59E0B';

    if (followTarget && mapRef.current) {
      mapRef.current.panTo(coord, { animate: true, duration: 0.1 });
    }

    const markerHtml = `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid ${dotColor};
          animation: crimsonPulse 1.6s infinite;
          opacity: 0.85;
          pointer-events: none;
        "></div>

        <div style="
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #080B12;
          border: 2px solid ${dotColor};
          box-shadow: 0 0 16px ${dotColor};
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${bearing}deg);
          transition: transform 0.15s linear;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${dotColor}">
            <polygon points="12,2 22,22 12,17 2,22" />
          </svg>
        </div>

        <div style="
          position: absolute;
          bottom: -18px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(8, 11, 18, 0.95);
          border: 1px solid ${dotColor};
          color: #fff;
          font-family: monospace;
          font-size: 9px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
          box-shadow: 0 2px 10px rgba(0,0,0,0.8);
          pointer-events: none;
        ">
          ${isBaseline ? 'OBSERVED' : 'ASSUMED'} &bull; ${speedMph} MPH
        </div>
      </div>
    `;

    const icon = L.divIcon({
      html: markerHtml,
      className: 'live-suspect-dot-marker',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const marker = L.marker(coord, { icon, zIndexOffset: 1200 });

    marker.bindPopup(`
      <div style="font-size: 12px; color: #fff; min-width: 230px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-weight: 800; color: ${dotColor}; font-size: 13px;">${pathTitle}</span>
          <span style="font-size: 9px; padding: 2px 6px; border-radius: 3px; background: rgba(255,255,255,0.1); color: #fff;">
            ${isBaseline ? 'CONFIRMED TRACK' : 'HYPOTHETICAL SIMULATION'}
          </span>
        </div>
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">${currentLeg}</div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; background: rgba(255,255,255,0.06); padding: 6px; border-radius: 4px;">
          <span><strong>Sim Time:</strong> ${simulatedTime}</span>
          <span><strong>Speed:</strong> ${speedMph} MPH</span>
          <span><strong>Azimuth:</strong> ${bearing}&deg;</span>
        </div>
      </div>
    `);

    marker.addTo(vehicleLayerRef.current!);
  }, [activeTelemetry, activeSimulationPathId, followTarget]);

  // --------------------------------------------------------------------------
  // 9. Render General POI Markers (Incidents, CCTV, Persons, etc.)
  // --------------------------------------------------------------------------
  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'incident': return '#FF2A42';
      case 'cctv_camera': return '#06B6D4';
      case 'person_observation': return '#F43F5E';
      case 'vehicle_observation': return '#A855F7';
      case 'transaction_location': return '#F97316';
      case 'call_location': return '#10B981';
      default: return '#94A3B8';
    }
  };

  useEffect(() => {
    if (!markersLayerRef.current || !mapRef.current) return;
    markersLayerRef.current.clearLayers();

    locations.forEach(pt => {
      if (pt.type === 'incident' && !layers.incidents) return;
      if (pt.type === 'cctv_camera' && !layers.cctv) return;
      if (pt.type === 'person_observation' && !layers.persons) return;
      if (pt.type === 'vehicle_observation' && !layers.vehicles) return;
      if (pt.type === 'transaction_location' && !layers.transactions) return;
      if (pt.type === 'call_location' && !layers.calls) return;

      const color = getMarkerColor(pt.type);
      const isSelected = selectedPoint?.id === pt.id;

      const iconHtml = `
        <div style="
          width: ${isSelected ? '24px' : '16px'};
          height: ${isSelected ? '24px' : '16px'};
          border-radius: 50%;
          background: ${color};
          border: 2px solid #07080B;
          box-shadow: 0 0 ${isSelected ? '12px' : '5px'} ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          <div style="width: 4px; height: 4px; border-radius: 50%; background: #ffffff;"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'tactical-poi-marker',
        iconSize: [isSelected ? 24 : 16, isSelected ? 24 : 16],
        iconAnchor: [isSelected ? 12 : 8, isSelected ? 12 : 8],
      });

      const marker = L.marker([pt.lat, pt.lng], { icon: customIcon });

      const popupHtml = `
        <div style="font-size: 12px; color: #f0f2f8; min-width: 200px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${color};">
              ${(pt.type || 'NODE').replace(/_/g, ' ')}
            </span>
            <span style="font-size: 9px; background: rgba(255,255,255,0.1); padding: 2px 5px; border-radius: 3px; color: #94a3b8;">
              ${pt.riskLevel?.toUpperCase() || 'INFO'}
            </span>
          </div>
          <div style="font-weight: 700; font-size: 13px; color: #fff; margin-bottom: 2px;">${pt.name}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">${pt.address || pt.description || ''}</div>
          <div style="display: flex; gap: 4px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;">
            <button id="btn-add-as-assumption-${pt.id}" style="
              flex: 1; padding: 4px 6px; font-size: 10px; font-weight: 700; border-radius: 4px;
              background: rgba(245, 158, 11, 0.2); border: 1px solid #F59E0B; color: #F59E0B; cursor: pointer;
            ">+ Add to Hypothesis</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        onSelectPoint(pt);
      });

      marker.on('popupopen', () => {
        const btnAdd = document.getElementById(`btn-add-as-assumption-${pt.id}`);
        if (btnAdd) {
          btnAdd.onclick = () => {
            setPendingAssumptionCoord({ lat: pt.lat, lng: pt.lng });
            setNewPointName(`Assumed Sight: ${pt.name}`);
            setNewPointNotes(`Investigator theory: suspect observed near ${pt.name}`);
            setShowAddWaypointModal(true);
            setWaypointInputMode('type');
            mapRef.current?.closePopup();
          };
        }
      });

      marker.addTo(markersLayerRef.current!);
    });
  }, [locations, layers, selectedPoint]);

  // Fullscreen Mode Toggle & Resize Invalidation
  const toggleFullscreen = () => {
    setIsFullscreen(prev => {
      const next = !prev;
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 300);
      return next;
    });
  };

  // Keyboard shortcut: Esc to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        setTimeout(() => mapRef.current?.invalidateSize(), 150);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Search Mapbox Geocoding API for place / address
  const searchMapboxPlace = async (query: string) => {
    if (!query.trim()) return;
    setIsSearchingGeocode(true);
    setGeocodeError(null);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&proximity=-74.006,40.7128`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const best = data.features[0];
          const [lng, lat] = best.center;
          setPendingAssumptionCoord({ lat, lng });
          setNewPointName(best.text || best.place_name.split(',')[0]);
          if (mapRef.current) {
            mapRef.current.flyTo([lat, lng], 15, { duration: 1.2 });
          }
          setIsSearchingGeocode(false);
          return;
        }
      }

      // Fallback local landmark search
      const match = NYC_LANDMARKS.find(p => p.name.toLowerCase().includes(query.toLowerCase()));
      if (match) {
        setPendingAssumptionCoord({ lat: match.lat, lng: match.lng });
        setNewPointName(match.name);
        if (mapRef.current) {
          mapRef.current.flyTo([match.lat, match.lng], 15, { duration: 1.2 });
        }
        setIsSearchingGeocode(false);
        return;
      }
      setGeocodeError('Location not found. Try entering a landmark (e.g. "Times Square", "Chinatown", "Pier 36").');
    } catch {
      const match = NYC_LANDMARKS.find(p => p.name.toLowerCase().includes(query.toLowerCase()));
      if (match) {
        setPendingAssumptionCoord({ lat: match.lat, lng: match.lng });
        setNewPointName(match.name);
        if (mapRef.current) {
          mapRef.current.flyTo([match.lat, match.lng], 15, { duration: 1.2 });
        }
      } else {
        setGeocodeError('Search service offline. Please select a quick preset below or touch the map.');
      }
    } finally {
      setIsSearchingGeocode(false);
    }
  };

  // Quick preset click handler
  const selectPresetLocation = (name: string, lat: number, lng: number) => {
    setPendingAssumptionCoord({ lat, lng });
    setNewPointName(name);
    setSearchAddressQuery(name);
    setGeocodeError(null);
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 15, { duration: 1 });
    }
  };

  // Activate touch-on-map mode
  const enterMapTouchMode = () => {
    setIsAddingAssumptionPoint(true);
    setShowAddWaypointModal(false);
  };

  // --------------------------------------------------------------------------
  // 10. Handler to Add New Assumption Point to Hypothesis & Re-route
  // --------------------------------------------------------------------------
  const saveAssumptionPoint = async () => {
    if (!pendingAssumptionCoord || !newPointName.trim()) return;

    setIsProcessing(true);
    setProcessingStatus(`MAPBOX DIRECTIONS: COMPUTING ROAD TRAJECTORY FOR ${newPointName.toUpperCase()}...`);

    let targetHypId = targetHypothesisIdForAdd;
    let currentHypotheses = [...hypotheses];

    // Check if user is creating a new scenario on the fly for this point
    if (createNewScenarioInModal) {
      const customId = `hyp-custom-${Date.now()}`;
      const originHop = selectedSequence?.hops[0] || {
        locationName: 'Wharf Warehouse 4B',
        lat: 40.7028,
        lng: -74.015,
        timestamp: '01:15 AM',
      };
      const newScenario: HypothesisScenario = {
        id: customId,
        name: newScenarioCustomName.trim() || `Hypothesis ${String.fromCharCode(65 + hypotheses.length)}: Custom Route`,
        shortName: `HYP-${String.fromCharCode(65 + hypotheses.length)}`,
        color: newScenarioCustomColor || '#38BDF8',
        description: newPointNotes || 'Investigator custom assumption trajectory.',
        visible: true,
        isCustom: true,
        totalDistanceMiles: 3.5,
        hops: [
          {
            id: `cust-start-${Date.now()}`,
            name: originHop.locationName,
            lat: originHop.lat || 40.7028,
            lng: originHop.lng || -74.015,
            timestamp: originHop.timestamp || '01:15 AM',
            hypothesisType: 'detour',
            notes: 'Departure anchor point.',
            confidence: 0.9,
            isAssumed: false,
          },
        ],
        roadCoordinates: [],
        distances: [],
      };
      currentHypotheses.push(newScenario);
      targetHypId = customId;
      setTargetHypothesisIdForAdd(customId);
    }

    const newHop: AssumptionHop = {
      id: `assump-${Date.now()}`,
      name: newPointName.trim(),
      lat: pendingAssumptionCoord.lat,
      lng: pendingAssumptionCoord.lng,
      timestamp: newPointTime || '02:00 AM',
      hypothesisType: newPointType,
      notes: newPointNotes || 'Assumed movement based on tactical hypothesis.',
      confidence: newPointConfidence,
      isAssumed: true,
    };

    // Update target hypothesis with new hop
    let updatedHypotheses = currentHypotheses.map(hyp => {
      if (hyp.id !== targetHypId) return hyp;

      const newHops = [...hyp.hops];
      if (newHops.length > 1 && !newHops[newHops.length - 1].isAssumed) {
        newHops.splice(newHops.length - 1, 0, newHop);
      } else {
        newHops.push(newHop);
      }

      return {
        ...hyp,
        hops: newHops,
        roadCoordinates: [],
      };
    });

    // Recompute road coordinates for the updated hypothesis using Mapbox Directions
    const targetHyp = updatedHypotheses.find(h => h.id === targetHypId);
    if (targetHyp && targetHyp.hops.length >= 2) {
      const res = await fetchMapboxDrivingRoute(targetHyp.hops.map(h => ({ lat: h.lat, lng: h.lng })));
      if (res) {
        updatedHypotheses = updatedHypotheses.map(h => {
          if (h.id === targetHypId) {
            return {
              ...h,
              roadCoordinates: res.coords,
              distances: res.distances,
              totalDistanceMiles: parseFloat(res.totalDistance.toFixed(1)),
            };
          }
          return h;
        });

        if (mapRef.current && res.coords.length > 0) {
          mapRef.current.fitBounds(L.latLngBounds(res.coords), { padding: [50, 50] });
        }
      }
    }

    setHypotheses(updatedHypotheses);
    setActiveSimulationPathId(targetHypId);
    setShowAddWaypointModal(false);
    setPendingAssumptionCoord(null);
    setNewPointName('');
    setNewPointNotes('');
    setSearchAddressQuery('');
    setCreateNewScenarioInModal(false);
    setIsProcessing(false);
    setProcessingStatus('');
  };

  // Remove Assumption Hop from Hypothesis
  const removeAssumptionHop = async (hypId: string, hopId: string) => {
    setIsProcessing(true);
    setProcessingStatus('MAPBOX DIRECTIONS: RECALCULATING HYPOTHESIS PATH...');

    let updated = hypotheses.map(h => {
      if (h.id !== hypId) return h;
      return {
        ...h,
        hops: h.hops.filter(hop => hop.id !== hopId),
      };
    });

    const targetHyp = updated.find(h => h.id === hypId);
    if (targetHyp && targetHyp.hops.length >= 2) {
      const res = await fetchMapboxDrivingRoute(targetHyp.hops.map(hop => ({ lat: hop.lat, lng: hop.lng })));
      if (res) {
        updated = updated.map(h => {
          if (h.id === hypId) {
            return {
              ...h,
              roadCoordinates: res.coords,
              distances: res.distances,
              totalDistanceMiles: parseFloat(res.totalDistance.toFixed(1)),
            };
          }
          return h;
        });
      }
    }

    setHypotheses(updated);
    setIsProcessing(false);
    setProcessingStatus('');
  };

  // --------------------------------------------------------------------------
  // 11. Promote Assumed Hypothesis Path to become the NEW Main Path
  // (Swaps current Main into an assumed hypothesis; the new Main cannot be deleted)
  // --------------------------------------------------------------------------
  const promoteHypothesisToMainPath = async (hypId: string) => {
    const targetHyp = hypotheses.find(h => h.id === hypId);
    if (!targetHyp) return;

    setIsProcessing(true);
    setProcessingStatus(`PROMOTING ${targetHyp.name.toUpperCase()} TO OFFICIAL MAIN TRACK...`);

    // 1. Demote current Main Path to an Assumed Hypothesis Scenario
    const currentTargetName = selectedSequence ? selectedSequence.targetName : 'Verified Track';
    const demotedScenario: HypothesisScenario = {
      id: `hyp-demoted-${Date.now()}`,
      name: `Hypothesis: Prior Track (${currentTargetName.replace(/\[.*?\]/g, '').trim()})`,
      shortName: 'PRIOR-MAIN',
      color: '#94A3B8', // Sleek slate color for prior baseline
      description: `Original baseline track previously marked as verified. Demoted to assumed hypothesis.`,
      visible: true,
      isCustom: true,
      totalDistanceMiles: baselineTotalDistance || 3.3,
      hops: (selectedSequence?.hops || []).map((h, i) => ({
        id: `demoted-hop-${i}-${Date.now()}`,
        name: h.locationName,
        lat: h.lat || 40.7028,
        lng: h.lng || -74.015,
        timestamp: h.timestamp || '01:00 AM',
        hypothesisType: 'detour',
        notes: `Former verified event: ${h.locationName} (${h.source || 'Optical / Cell'})`,
        confidence: 0.85,
        isAssumed: true,
      })),
      roadCoordinates: [...baselineRoadCoords],
      distances: [...baselineDistances],
    };

    // 2. Build the new Sequence for the promoted hypothesis
    const newHops: MovementHop[] = targetHyp.hops.map((hop, idx) => ({
      id: hop.id || `promoted-hop-${idx}`,
      locationName: hop.name,
      lat: hop.lat,
      lng: hop.lng,
      timestamp: hop.timestamp,
      status: 'Observed',
      riskLevel: 'high',
      source: `Promoted from ${targetHyp.shortName}`,
      confidence: hop.confidence || 0.9,
      details: hop.notes,
      x: Math.round(((hop.lng - -74.04) / 0.1) * 700 + 50),
      y: Math.round((1 - (hop.lat - 40.68) / 0.15) * 400 + 50),
    }));

    const updatedSequence: MovementSequence = {
      id: `seq-promoted-${Date.now()}`,
      targetName: `${targetHyp.shortName}: ${targetHyp.name.split(':')[1]?.trim() || targetHyp.name}`,
      targetType: selectedSequence?.targetType || 'PERSON',
      riskLevel: selectedSequence?.riskLevel || 'critical',
      hops: newHops,
    };

    // 3. Update hypotheses state: remove promoted hypothesis, append demoted hypothesis
    setHypotheses(prev => [
      ...prev.filter(h => h.id !== hypId),
      demotedScenario,
    ]);

    // 4. Update Main Path in parent and local state
    if (onSelectSequence) {
      onSelectSequence(updatedSequence);
    }
    setBaselineRoadCoords(targetHyp.roadCoordinates);
    setBaselineDistances(targetHyp.distances);
    setBaselineTotalDistance(targetHyp.totalDistanceMiles);

    // 5. Reset active simulation to baseline (which is now this promoted path)
    setActiveSimulationPathId('baseline');
    setSimProgress(0);

    // 6. Fit map bounds to the new main path
    if (mapRef.current && targetHyp.roadCoordinates.length > 0) {
      mapRef.current.fitBounds(L.latLngBounds(targetHyp.roadCoordinates), { padding: [50, 50] });
    }

    setIsProcessing(false);
    setProcessingStatus('');
  };

  // --------------------------------------------------------------------------
  // 12. Delete Assumed Hypothesis Scenario (Main path cannot be deleted)
  // --------------------------------------------------------------------------
  const deleteHypothesisScenario = (hypId: string) => {
    setHypotheses(prev => prev.filter(h => h.id !== hypId));
    if (activeSimulationPathId === hypId) {
      setActiveSimulationPathId('baseline');
      setSimProgress(0);
    }
  };

  // Create a brand new custom hypothesis scenario
  const createNewHypothesisScenario = () => {
    const customId = `hyp-custom-${Date.now()}`;
    const colors = ['#10B981', '#38BDF8', '#EC4899', '#EAB308'];
    const assignedColor = colors[hypotheses.length % colors.length];

    const originHop = selectedSequence?.hops[0] || {
      locationName: 'Wharf Warehouse 4B',
      lat: 40.7028,
      lng: -74.015,
      timestamp: '01:15 AM',
    };

    const terminalHop = selectedSequence?.hops[selectedSequence.hops.length - 1] || {
      locationName: 'Industrial Gate 2',
      lat: 40.725,
      lng: -73.991,
      timestamp: '04:12 AM',
    };

    const newScenario: HypothesisScenario = {
      id: customId,
      name: `Hypothesis ${String.fromCharCode(65 + hypotheses.length)}: Custom Path`,
      shortName: `HYP-${String.fromCharCode(65 + hypotheses.length)}`,
      color: assignedColor,
      description: 'Investigator custom assumption trajectory.',
      visible: true,
      isCustom: true,
      totalDistanceMiles: 3.5,
      hops: [
        {
          id: `cust-hop-1`,
          name: originHop.locationName,
          lat: originHop.lat || 40.7028,
          lng: originHop.lng || -74.015,
          timestamp: originHop.timestamp || '01:15 AM',
          hypothesisType: 'detour',
          notes: 'Hypothesis start anchor point.',
          confidence: 0.9,
          isAssumed: false,
        },
        {
          id: `cust-hop-2`,
          name: terminalHop.locationName,
          lat: terminalHop.lat || 40.725,
          lng: terminalHop.lng || -73.991,
          timestamp: terminalHop.timestamp || '03:45 AM',
          hypothesisType: 'choke_point',
          notes: 'Hypothesis terminal egress.',
          confidence: 0.7,
          isAssumed: false,
        },
      ],
      roadCoordinates: [],
      distances: [],
    };

    setHypotheses(prev => [...prev, newScenario]);
    setTargetHypothesisIdForAdd(customId);
  };

  // Toggle Visibility for a hypothesis
  const toggleHypothesisVisibility = (hypId: string) => {
    setHypotheses(prev =>
      prev.map(h => (h.id === hypId ? { ...h, visible: !h.visible } : h))
    );
  };

  // Recenter map on active routes
  const handleRecenter = () => {
    if (!mapRef.current) return;
    if (baselineRoadCoords.length > 0) {
      mapRef.current.fitBounds(L.latLngBounds(baselineRoadCoords), { padding: [50, 50] });
    } else {
      mapRef.current.setView([40.718, -74.004], 13);
    }
  };

  return (
    <div
      style={{
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : undefined,
        left: isFullscreen ? 0 : undefined,
        right: isFullscreen ? 0 : undefined,
        bottom: isFullscreen ? 0 : undefined,
        width: isFullscreen ? '100vw' : '100%',
        height: isFullscreen ? '100vh' : '100%',
        zIndex: isFullscreen ? 99999 : undefined,
        minHeight: isFullscreen ? '100vh' : '580px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#07090E',
        borderRadius: isFullscreen ? 0 : 'var(--border-radius-lg)',
        border: isFullscreen ? 'none' : '1px solid var(--color-glass-border)',
      }}
    >
      {/* -------------------------------------------------------------------- */}
      {/* Top Floating Tactical Controls Bar */}
      {/* -------------------------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          top: isFullscreen ? '16px' : '64px',
          left: '16px',
          right: '16px',
          zIndex: 820,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          pointerEvents: 'none',
        }}
      >
        {/* Left: Active Simulation Indicator & Assumption Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto', flexWrap: 'wrap' }}>
          {/* Active Sim Path Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(8, 11, 18, 0.94)',
              border: '1px solid var(--color-glass-border)',
              borderRadius: '8px',
              padding: '6px 12px',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.7)',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: activeSimulationPathId === 'baseline' ? '#06B6D4' : '#F59E0B',
                animation: 'crimsonPulse 1.4s infinite',
              }}
            />
            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>
              SIMULATING:
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: activeSimulationPathId === 'baseline' ? '#06B6D4' : '#F59E0B',
              }}
            >
              {activeSimulationPathId === 'baseline'
                ? 'MAIN VERIFIED TRACK'
                : hypotheses.find(h => h.id === activeSimulationPathId)?.shortName || 'HYPOTHESIS'}
            </span>
          </div>

          {/* Toggle Assumptions Studio Panel */}
          <button
            onClick={() => setShowAssumptionStudio(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: showAssumptionStudio ? 'rgba(245, 158, 11, 0.22)' : 'rgba(8, 11, 18, 0.92)',
              border: showAssumptionStudio ? '1px solid #F59E0B' : '1px solid var(--color-glass-border)',
              color: showAssumptionStudio ? '#F59E0B' : 'var(--color-text-primary)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>⚡</span>
            <span>Assumed Paths & Hypotheses ({hypotheses.length})</span>
          </button>

          {/* Add Waypoint / Sighting Button */}
          <button
            onClick={() => {
              setShowAddWaypointModal(prev => !prev);
              setIsAddingAssumptionPoint(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: showAddWaypointModal ? '#F59E0B' : 'rgba(8, 11, 18, 0.92)',
              border: showAddWaypointModal ? '1px solid #F59E0B' : '1px solid rgba(245, 158, 11, 0.4)',
              color: showAddWaypointModal ? '#000' : '#F59E0B',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              boxShadow: showAddWaypointModal ? '0 0 16px rgba(245, 158, 11, 0.6)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <MapPinIcon size={14} color={showAddWaypointModal ? '#000' : '#F59E0B'} />
            <span>+ Add Waypoint / Sighting</span>
          </button>
        </div>

        {/* Right: Mapbox Style Selector, Recenter & Fullscreen Toggle */}
        <div style={{ display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
          {/* Mapbox Style Selector */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(8, 11, 18, 0.92)',
              border: '1px solid var(--color-glass-border)',
              borderRadius: '8px',
              padding: '2px',
              backdropFilter: 'blur(12px)',
            }}
          >
            {[
              { id: 'dark', label: 'DARK' },
              { id: 'navigation', label: 'NIGHT' },
              { id: 'satellite', label: 'SAT' },
              { id: 'streets', label: 'STREETS' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setMapStyle(item.id as MapboxStyleKey)}
                title={`Mapbox ${item.label} Style`}
                style={{
                  padding: '4px 8px',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  borderRadius: '6px',
                  background: mapStyle === item.id ? 'rgba(255, 42, 66, 0.25)' : 'transparent',
                  color: mapStyle === item.id ? '#FF2A42' : 'var(--color-text-muted)',
                  border: mapStyle === item.id ? '1px solid rgba(255, 42, 66, 0.4)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Recenter Button */}
          <button
            onClick={handleRecenter}
            title="Fit Route Bounds"
            style={{
              background: 'rgba(8, 11, 18, 0.92)',
              border: '1px solid var(--color-glass-border)',
              color: '#fff',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapPinIcon size={14} color="#fff" />
          </button>

          {/* Fullscreen Mode Toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Interactive Fullscreen Map'}
            style={{
              background: isFullscreen ? 'rgba(255, 42, 66, 0.25)' : 'rgba(8, 11, 18, 0.92)',
              border: isFullscreen ? '1px solid #FF2A42' : '1px solid var(--color-glass-border)',
              color: isFullscreen ? '#FF2A42' : '#fff',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: isFullscreen ? '0 0 16px rgba(255, 42, 66, 0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: '13px' }}>{isFullscreen ? '🗗' : '⛶'}</span>
            <span>{isFullscreen ? 'EXIT' : 'FULLSCREEN'}</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Assumption Point Dropper Notice Banner (When in Drop Mode) */}
      {/* -------------------------------------------------------------------- */}
      {isAddingAssumptionPoint && (
        <div
          style={{
            position: 'absolute',
            top: isFullscreen ? '64px' : '112px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 880,
            background: 'rgba(245, 158, 11, 0.95)',
            color: '#000',
            fontWeight: 800,
            fontSize: '12px',
            padding: '8px 18px',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(245, 158, 11, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'auto',
          }}
        >
          <CrosshairIcon size={16} color="#000" />
          <span>TOUCH OR CLICK ANYWHERE ON THE MAP TO DROP WAYPOINT</span>
          <button
            onClick={() => {
              setIsAddingAssumptionPoint(false);
              setShowAddWaypointModal(true);
            }}
            style={{
              background: '#000',
              color: '#fff',
              border: 'none',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              cursor: 'pointer',
              marginLeft: '8px',
            }}
          >
            Back to Options
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Comprehensive Waypoint / Sighting Dialog (Type Place OR Touch Map) */}
      {/* -------------------------------------------------------------------- */}
      {showAddWaypointModal && (
        <div
          style={{
            position: 'absolute',
            top: isFullscreen ? '64px' : '112px',
            left: '16px',
            zIndex: 870,
            background: 'rgba(10, 14, 24, 0.98)',
            border: '1.5px solid #F59E0B',
            borderRadius: '10px',
            padding: '16px',
            width: '420px',
            maxWidth: 'calc(100% - 32px)',
            maxHeight: 'calc(100% - 150px)',
            overflowY: 'auto',
            boxShadow: '0 12px 36px rgba(0,0,0,0.85), 0 0 20px rgba(245, 158, 11, 0.25)',
            backdropFilter: 'blur(16px)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px' }}>📍</span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#F59E0B', letterSpacing: '0.04em' }}>
                ADD ASSUMPTION WAYPOINT & ROUTE
              </span>
            </div>
            <button
              onClick={() => {
                setShowAddWaypointModal(false);
                setIsAddingAssumptionPoint(false);
              }}
              title="Close Dialog"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#cbd5e1',
                width: '22px',
                height: '22px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>

          {/* Mode Switcher: Type Place vs Touch Map */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '6px' }}>
            <button
              onClick={() => setWaypointInputMode('type')}
              style={{
                flex: 1,
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '4px',
                background: waypointInputMode === 'type' ? '#F59E0B' : 'transparent',
                color: waypointInputMode === 'type' ? '#000' : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>✍</span>
              <span>Type Place / Address</span>
            </button>

            <button
              onClick={() => setWaypointInputMode('map')}
              style={{
                flex: 1,
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '4px',
                background: waypointInputMode === 'map' ? '#F59E0B' : 'transparent',
                color: waypointInputMode === 'map' ? '#000' : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>📍</span>
              <span>Touch / Click Map</span>
            </button>
          </div>

          {/* Tab 1: Type Place / Address */}
          {waypointInputMode === 'type' && (
            <div style={{ marginBottom: '14px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                SEARCH MANHATTAN STREET, LANDMARK, OR VENUE
              </label>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={searchAddressQuery}
                  onChange={e => setSearchAddressQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchMapboxPlace(searchAddressQuery)}
                  placeholder="e.g. Times Square, Chinatown, Pier 36, Canal St..."
                  style={{
                    flex: 1,
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '5px',
                    padding: '6px 10px',
                    color: '#fff',
                    fontSize: '11px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => searchMapboxPlace(searchAddressQuery)}
                  disabled={isSearchingGeocode || !searchAddressQuery.trim()}
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: '#F59E0B',
                    color: '#000',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isSearchingGeocode ? 'Searching...' : 'Find Place'}
                </button>
              </div>

              {geocodeError && (
                <div style={{ fontSize: '10px', color: '#F87171', marginBottom: '6px' }}>
                  {geocodeError}
                </div>
              )}

              {/* Quick Landmark Preset Badges */}
              <div>
                <span style={{ fontSize: '9px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  QUICK TACTICAL PRESETS (CLICK TO SELECT):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {NYC_LANDMARKS.map(lm => {
                    const isSelected = pendingAssumptionCoord && Math.abs(pendingAssumptionCoord.lat - lm.lat) < 0.001;
                    return (
                      <button
                        key={lm.name}
                        onClick={() => selectPresetLocation(lm.name, lm.lat, lm.lng)}
                        style={{
                          fontSize: '9px',
                          fontWeight: 600,
                          padding: '3px 7px',
                          borderRadius: '3px',
                          background: isSelected ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.06)',
                          border: isSelected ? '1px solid #F59E0B' : '1px solid rgba(255,255,255,0.1)',
                          color: isSelected ? '#F59E0B' : '#cbd5e1',
                          cursor: 'pointer',
                        }}
                      >
                        {lm.name.split(' ')[0]} {lm.name.split(' ')[1] || ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Touch / Click on Map */}
          {waypointInputMode === 'map' && (
            <div style={{ marginBottom: '14px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>
                  TOUCH / CLICK MAP DIRECTLY
                </span>
                <button
                  onClick={enterMapTouchMode}
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    background: '#F59E0B',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  📍 Pick Location on Map
                </button>
              </div>
              <p style={{ fontSize: '10px', color: '#cbd5e1', margin: 0 }}>
                Clicking above activates crosshair touch mode. Tap or click any street or alley on the map to lock in coordinates.
              </p>
            </div>
          )}

          {/* Selected Coordinate Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            borderRadius: '5px',
            background: pendingAssumptionCoord ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: pendingAssumptionCoord ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
            marginBottom: '10px',
          }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: pendingAssumptionCoord ? '#10B981' : '#F87171' }}>
              {pendingAssumptionCoord
                ? `✔ Locked Position: [${pendingAssumptionCoord.lat.toFixed(4)}, ${pendingAssumptionCoord.lng.toFixed(4)}]`
                : '⚠ No position selected yet (type place or click map)'}
            </span>
            {pendingAssumptionCoord && (
              <button
                onClick={() => setPendingAssumptionCoord(null)}
                style={{ fontSize: '9px', background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Form: Location Name */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              LOCATION / SIGHTING NAME
            </label>
            <input
              type="text"
              value={newPointName}
              onChange={e => setNewPointName(e.target.value)}
              placeholder="e.g. Greenwich St Safehouse or Chinatown Alley"
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          {/* Form: Assign to Scenario OR Create New Scenario */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              TARGET SCENARIO PATH
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <select
                value={createNewScenarioInModal ? '__new__' : targetHypothesisIdForAdd}
                onChange={e => {
                  if (e.target.value === '__new__') {
                    setCreateNewScenarioInModal(true);
                  } else {
                    setCreateNewScenarioInModal(false);
                    setTargetHypothesisIdForAdd(e.target.value);
                  }
                }}
                style={{
                  width: '100%',
                  background: '#0e1422',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  color: '#fff',
                  fontSize: '11px',
                  outline: 'none',
                }}
              >
                {hypotheses.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
                <option value="__new__">+ Create New Scenario...</option>
              </select>

              <div>
                <input
                  type="text"
                  value={newPointTime}
                  onChange={e => setNewPointTime(e.target.value)}
                  placeholder="Time (e.g. 02:15 AM)"
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    color: '#fff',
                    fontSize: '11px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Custom New Scenario Name if selected */}
            {createNewScenarioInModal && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={newScenarioCustomName}
                  onChange={e => setNewScenarioCustomName(e.target.value)}
                  placeholder="New Scenario Title (e.g. Subway Evacuation)"
                  style={{
                    flex: 1,
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid #38BDF8',
                    borderRadius: '5px',
                    padding: '5px 8px',
                    color: '#fff',
                    fontSize: '11px',
                    outline: 'none',
                  }}
                />
                <select
                  value={newScenarioCustomColor}
                  onChange={e => setNewScenarioCustomColor(e.target.value)}
                  style={{
                    background: '#0e1422',
                    border: '1px solid #38BDF8',
                    borderRadius: '5px',
                    color: newScenarioCustomColor,
                    fontSize: '11px',
                    padding: '4px',
                  }}
                >
                  <option value="#38BDF8" style={{ color: '#38BDF8' }}>Sky Blue</option>
                  <option value="#10B981" style={{ color: '#10B981' }}>Emerald</option>
                  <option value="#EC4899" style={{ color: '#EC4899' }}>Neon Pink</option>
                  <option value="#EAB308" style={{ color: '#EAB308' }}>Amber</option>
                  <option value="#A855F7" style={{ color: '#A855F7' }}>Violet</option>
                </select>
              </div>
            )}
          </div>

          {/* Form: Hypothesis Category */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              ASSUMPTION CATEGORY
            </label>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {[
                { id: 'safehouse', label: 'Safehouse' },
                { id: 'accomplice_meet', label: 'Accomplice Meet' },
                { id: 'vehicle_switch', label: 'Vehicle Switch' },
                { id: 'dead_drop', label: 'Dead Drop' },
                { id: 'detour', label: 'Evasive Detour' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setNewPointType(cat.id as any)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    background: newPointType === cat.id ? '#F59E0B' : 'rgba(255,255,255,0.06)',
                    color: newPointType === cat.id ? '#000' : '#cbd5e1',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form: Investigative Notes / Theory */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              INVESTIGATOR THEORY & DETAILS
            </label>
            <textarea
              rows={2}
              value={newPointNotes}
              onChange={e => setNewPointNotes(e.target.value)}
              placeholder="e.g. Maybe he went here to swap phones or stashed money before heading to the gate..."
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#fff',
                fontSize: '11px',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={saveAssumptionPoint}
              disabled={!pendingAssumptionCoord || !newPointName.trim()}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '11px',
                fontWeight: 800,
                background: (!pendingAssumptionCoord || !newPointName.trim()) ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: (!pendingAssumptionCoord || !newPointName.trim()) ? '#94a3b8' : '#000',
                border: 'none',
                borderRadius: '6px',
                cursor: (!pendingAssumptionCoord || !newPointName.trim()) ? 'not-allowed' : 'pointer',
              }}
            >
              ⚡ Save Waypoint & Route Path Through It
            </button>
            <button
              onClick={() => {
                setShowAddWaypointModal(false);
                setIsAddingAssumptionPoint(false);
              }}
              style={{
                padding: '8px 12px',
                fontSize: '11px',
                background: 'rgba(255,255,255,0.08)',
                color: '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Assumptions & Multi-Path Studio Floating Flyout Panel */}
      {/* -------------------------------------------------------------------- */}
      {showAssumptionStudio && (
        <div
          style={{
            position: 'absolute',
            top: isFullscreen ? '64px' : '112px',
            left: '16px',
            zIndex: 860,
            background: 'rgba(8, 12, 20, 0.96)',
            border: '1px solid var(--color-glass-border)',
            borderRadius: '10px',
            padding: '14px 16px',
            width: '420px',
            maxWidth: 'calc(100% - 32px)',
            maxHeight: 'calc(100% - 150px)',
            overflowY: 'auto',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.85)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>⚡</span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff', letterSpacing: '0.04em' }}>
                INVESTIGATIVE MULTI-PATH SCENARIOS
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={createNewHypothesisScenario}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#10B981',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10B981',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                + New Scenario
              </button>
              <button
                onClick={() => setShowAssumptionStudio(false)}
                title="Close Scenarios Panel"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  width: '22px',
                  height: '22px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 10px 0', lineHeight: '1.4' }}>
            Model alternative routes based on witness leads, assumptions, and accomplice hypotheses. Promote any assumed path to official Main Path anytime.
          </p>

          {/* List of Available Trajectory Paths */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
            {/* 1. Baseline Verified Path (CANNOT BE DELETED) */}
            <div
              style={{
                background: activeSimulationPathId === 'baseline' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                border: activeSimulationPathId === 'baseline' ? '1.5px solid #06B6D4' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                padding: '8px 10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#06B6D4' }} />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff' }}>
                    👑 Current Main Track (Verified Baseline)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: '#10B981',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid #10B981',
                      padding: '2px 5px',
                      borderRadius: '3px',
                    }}
                    title="Main Track cannot be deleted at all times"
                  >
                    🔒 CANNOT BE DELETED
                  </span>
                  <button
                    onClick={() => setActiveSimulationPathId('baseline')}
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '3px',
                      background: activeSimulationPathId === 'baseline' ? '#06B6D4' : 'rgba(255,255,255,0.08)',
                      color: activeSimulationPathId === 'baseline' ? '#000' : '#cbd5e1',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {activeSimulationPathId === 'baseline' ? 'SIMULATING' : 'Simulate'}
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                {selectedSequence?.targetName || 'Subject Track'} &bull; {selectedSequence?.hops.length || 4} Verified Events &bull; {baselineTotalDistance ? `${baselineTotalDistance.toFixed(1)} mi` : '3.3 mi'}
              </div>
            </div>

            {/* 2. Hypothesis Scenarios (Can be Promoted to Main Path or Deleted) */}
            {hypotheses.map(hyp => {
              const isSimulatingThis = activeSimulationPathId === hyp.id;
              const assumedCount = hyp.hops.filter(h => h.isAssumed).length;

              return (
                <div
                  key={hyp.id}
                  style={{
                    background: isSimulatingThis ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSimulatingThis ? `1.5px solid ${hyp.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="checkbox"
                        checked={hyp.visible}
                        onChange={() => toggleHypothesisVisibility(hyp.id)}
                        title="Toggle path visibility on map"
                        style={{ accentColor: hyp.color, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '11px', fontWeight: 800, color: hyp.color }}>
                        {hyp.name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {/* Promote to Main Path Button */}
                      <button
                        onClick={() => promoteHypothesisToMainPath(hyp.id)}
                        title="Promote this assumed path to the official Main Path (swaps current main path into an assumed path)"
                        style={{
                          fontSize: '9px',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '3px',
                          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(16, 185, 129, 0.25) 100%)',
                          color: '#38BDF8',
                          border: '1px solid #06B6D4',
                          cursor: 'pointer',
                        }}
                      >
                        ★ Make Main Path
                      </button>

                      {/* Simulate Button */}
                      <button
                        onClick={() => setActiveSimulationPathId(hyp.id)}
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: isSimulatingThis ? hyp.color : 'rgba(255,255,255,0.08)',
                          color: isSimulatingThis ? '#000' : '#cbd5e1',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {isSimulatingThis ? 'SIMULATING' : 'Simulate'}
                      </button>

                      {/* Delete Path Button (Allowed for all assumed paths) */}
                      <button
                        onClick={() => deleteHypothesisScenario(hyp.id)}
                        title="Delete this assumed path"
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#EF4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          cursor: 'pointer',
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: '10px', color: '#cbd5e1', marginBottom: '3px' }}>
                    {hyp.description}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8' }}>
                    <span>{hyp.hops.length} Waypoints ({assumedCount} Assumed)</span>
                    <span>Distance: {hyp.totalDistanceMiles} mi</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Real Mapbox Leaflet Container */}
      {/* -------------------------------------------------------------------- */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', flex: 1, zIndex: 1 }} />

      {/* -------------------------------------------------------------------- */}
      {/* Clean High-Tech Processing HUD Banner (No Obscuring Circles) */}
      {/* -------------------------------------------------------------------- */}
      {(isProcessing || processingStatus) && (
        <div
          style={{
            position: 'absolute',
            top: isFullscreen ? '64px' : '112px',
            right: '16px',
            zIndex: 900,
            background: 'rgba(8, 12, 20, 0.95)',
            border: '1px solid #FF2A42',
            boxShadow: '0 0 20px rgba(255, 42, 66, 0.4), 0 8px 32px rgba(0,0,0,0.8)',
            borderRadius: '8px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backdropFilter: 'blur(12px)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#FF2A42',
              animation: 'crimsonPulse 0.9s infinite',
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '0.06em',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
            }}
          >
            {processingStatus || 'MAPBOX ENGINE: RE-ROUTING ROAD NETWORK...'}
          </span>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Bottom Live Suspect Telemetry & Multi-Path Playback Bar */}
      {/* -------------------------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          right: '16px',
          zIndex: 800,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'rgba(8, 11, 18, 0.94)',
          border: '1px solid var(--color-glass-border)',
          borderRadius: '8px',
          padding: '10px 16px',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            style={{
              background: isSimulating ? 'rgba(255, 42, 66, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              border: isSimulating ? '1px solid #FF2A42' : '1px solid #10B981',
              color: isSimulating ? '#FF2A42' : '#10B981',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isSimulating ? 'PAUSE TRAJECTORY' : 'PLAY SEQUENCE'}
          </button>

          {/* Speed Multiplier */}
          <div style={{ display: 'flex', gap: '3px', background: 'rgba(255,255,255,0.06)', padding: '2px', borderRadius: '4px' }}>
            {[0.5, 1, 2, 5].map(spd => (
              <button
                key={spd}
                onClick={() => setSimSpeed(spd)}
                style={{
                  padding: '3px 7px',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '3px',
                  background: simSpeed === spd ? '#FF2A42' : 'transparent',
                  color: simSpeed === spd ? '#fff' : '#94a3b8',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Follow Dot Auto-Pan */}
          <button
            onClick={() => setFollowTarget(prev => !prev)}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              fontWeight: 700,
              color: followTarget ? '#10B981' : '#94a3b8',
              background: followTarget ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              border: followTarget ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {followTarget ? 'Following Dot' : 'Follow Dot'}
          </button>

          {/* Rewind */}
          <button
            onClick={() => {
              setSimProgress(0);
              if (onTimeProgressChange) onTimeProgressChange(0);
            }}
            title="Rewind to start"
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Rewind
          </button>
        </div>

        {/* Telemetry Progression Readout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>ACTIVE PATH VECTOR</span>
            <span style={{ fontSize: '11px', color: activeSimulationPathId === 'baseline' ? '#06B6D4' : '#F59E0B', fontWeight: 800 }}>
              {activeTelemetry ? activeTelemetry.pathTitle : 'Trajectory Loading...'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>CURRENT LEG</span>
            <span style={{ fontSize: '11px', color: '#f0f2f8', fontWeight: 700 }}>
              {activeTelemetry ? activeTelemetry.currentLeg : '...'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>SIMULATED TIME</span>
            <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 800, fontFamily: 'monospace' }}>
              {activeTelemetry ? activeTelemetry.simulatedTime : '01:15 AM'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
