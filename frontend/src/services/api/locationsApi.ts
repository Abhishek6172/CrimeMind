// ============================================================================
// CrimeMind Locations API Service
// File: locationsApi.ts
// ============================================================================

import { LocationRecord, MovementSequence } from '../../types';
import { api } from './apiClient';
import { initialLocations } from '../../utils/mockData';

export interface MovementPoint {
  id: string;
  location_id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  source: string;
  label: 'Observed' | 'Potential connection' | 'AI-inferred' | 'Requires verification';
  notes?: string;
  entity_id: string;
  entity_name: string;
  entity_type: 'PERSON' | 'VEHICLE';
}

export const locationsApi = {
  // GET /api/locations
  async getLocations(): Promise<LocationRecord[]> {
    try {
      return await api.get<LocationRecord[]>('/locations');
    } catch {
      return initialLocations;
    }
  },

  // Alias for getLocations
  async getAll(): Promise<LocationRecord[]> {
    return locationsApi.getLocations();
  },

  // GET /api/locations/movement-sequences
  async getMovementSequences(entityId?: string): Promise<MovementSequence[]> {
    try {
      const data = await api.get<any[]>('/locations/movement-sequences', { entity_id: entityId });
      if (Array.isArray(data) && data.length > 0 && data[0].hops) {
        return data as MovementSequence[];
      }
    } catch {
      // Fallback to synthetic demonstration trajectories
    }

    return [
      {
        id: 'seq-vance',
        targetName: "Marcus 'Viper' Vance",
        targetType: 'PERSON',
        hops: [
          {
            locationName: 'Wharf Warehouse 4B',
            timestamp: '2024-03-29 01:15 AM',
            status: 'Observed',
            source: 'CCTV Cam #09',
            confidence: 0.96,
            x: 120,
            y: 380,
            lat: 40.7028,
            lng: -74.0150,
          },
          {
            locationName: 'Financial District Perimeter',
            timestamp: '2024-03-29 02:10 AM',
            status: 'Potential connection',
            source: 'Cell Tower Azimuth',
            confidence: 0.78,
            x: 260,
            y: 310,
            lat: 40.7075,
            lng: -74.0090,
          },
          {
            locationName: 'Downtown Transit Hub',
            timestamp: '2024-03-29 02:55 AM',
            status: 'Observed',
            source: 'Terminal Cam #04',
            confidence: 0.94,
            x: 420,
            y: 240,
            lat: 40.7180,
            lng: -74.0040,
          },
          {
            locationName: 'Industrial Gate 2',
            timestamp: '2024-03-29 03:45 AM',
            status: 'AI-inferred',
            source: 'LangGraph Predictive Filter',
            confidence: 0.65,
            x: 680,
            y: 160,
            lat: 40.7250,
            lng: -73.9910,
          },
        ],
      },
      {
        id: 'seq-charger',
        targetName: 'Dodge Charger (SYN-7X91)',
        targetType: 'VEHICLE',
        hops: [
          {
            locationName: 'Expressway Toll Plaza #3',
            timestamp: '2024-03-28 22:45 PM',
            status: 'Observed',
            source: 'Highway ANPR Reader',
            confidence: 0.99,
            x: 200,
            y: 380,
            lat: 40.7505,
            lng: -73.9772,
          },
          {
            locationName: 'Sub-Level Vault East Access',
            timestamp: '2024-03-28 23:20 PM',
            status: 'Observed',
            source: 'Security Feed #11',
            confidence: 0.92,
            x: 420,
            y: 270,
            lat: 40.7380,
            lng: -73.9820,
          },
          {
            locationName: 'Waterfront Container Yard',
            timestamp: '2024-03-29 00:05 AM',
            status: 'AI-inferred',
            source: 'Speed-Time Feasibility',
            confidence: 0.71,
            x: 600,
            y: 140,
            lat: 40.7028,
            lng: -74.0150,
          },
        ],
      },
      {
        id: 'seq-orlov',
        targetName: 'Viktor "Old Fox" Orlov',
        targetType: 'PERSON',
        hops: [
          {
            locationName: 'Belvedere Luxury Residential Estates',
            timestamp: '2024-04-01 19:10 PM',
            status: 'Observed',
            source: 'Perimeter Sensor Net',
            confidence: 0.95,
            x: 180,
            y: 120,
            lat: 40.8120,
            lng: -73.9520,
          },
          {
            locationName: 'Apex Nightclub & Private Lounge',
            timestamp: '2024-04-01 21:30 PM',
            status: 'Observed',
            source: 'Doorstep CCTV Cam #08',
            confidence: 0.98,
            x: 460,
            y: 250,
            lat: 40.7250,
            lng: -73.9910,
          },
          {
            locationName: 'Terminal 4 Gate 8 Ingress',
            timestamp: '2024-04-01 23:45 PM',
            status: 'Requires verification',
            source: 'Municipal ANPR Gate Cam',
            confidence: 0.81,
            x: 720,
            y: 390,
            lat: 40.7028,
            lng: -74.0150,
          },
        ],
      },
      {
        id: 'seq-rostova',
        targetName: 'Elena "Ghost" Rostova',
        targetType: 'PERSON',
        hops: [
          {
            locationName: 'SoHo Safehouse & Vault',
            timestamp: '2024-05-12 00:30 AM',
            status: 'Observed',
            source: 'FLIR Thermal Feed',
            confidence: 0.97,
            x: 310,
            y: 290,
            lat: 40.7233,
            lng: -74.0030,
          },
          {
            locationName: 'Chinatown Underground Arcade',
            timestamp: '2024-05-12 01:15 AM',
            status: 'Potential connection',
            source: 'Cell Tower Triangulation',
            confidence: 0.85,
            x: 410,
            y: 320,
            lat: 40.7158,
            lng: -73.9970,
          },
          {
            locationName: 'East River Pier 36 Docks',
            timestamp: '2024-05-12 02:00 AM',
            status: 'AI-inferred',
            source: 'Synthesized Trajectory',
            confidence: 0.76,
            x: 550,
            y: 370,
            lat: 40.7100,
            lng: -73.9850,
          },
        ],
      },
      {
        id: 'seq-drake',
        targetName: 'Julian "Phantom" Drake',
        targetType: 'PERSON',
        hops: [
          {
            locationName: 'Midtown Diamond Exchange',
            timestamp: '2024-05-10 21:15 PM',
            status: 'Observed',
            source: 'Store Front Optical Cam',
            confidence: 0.99,
            x: 380,
            y: 190,
            lat: 40.7580,
            lng: -73.9855,
          },
          {
            locationName: 'West Side Highway Corridor',
            timestamp: '2024-05-10 21:28 PM',
            status: 'Observed',
            source: 'Highway Patrol ANPR',
            confidence: 0.93,
            x: 210,
            y: 260,
            lat: 40.7480,
            lng: -74.0080,
          },
          {
            locationName: 'Battery Park Helipad',
            timestamp: '2024-05-10 21:50 PM',
            status: 'AI-inferred',
            source: 'Radar Escape Tracking',
            confidence: 0.88,
            x: 180,
            y: 420,
            lat: 40.7030,
            lng: -74.0170,
          },
        ],
      },
      {
        id: 'seq-bmw',
        targetName: 'Black BMW 7-Series (SYN-9Y22)',
        targetType: 'VEHICLE',
        hops: [
          {
            locationName: 'Queensboro Bridge Plaza',
            timestamp: '2024-05-14 01:20 AM',
            status: 'Observed',
            source: 'Bridge Traffic ANPR',
            confidence: 0.98,
            x: 540,
            y: 160,
            lat: 40.7560,
            lng: -73.9540,
          },
          {
            locationName: 'First National Bank Garage',
            timestamp: '2024-05-14 02:10 AM',
            status: 'Observed',
            source: 'Vault Basement Cam',
            confidence: 0.94,
            x: 340,
            y: 330,
            lat: 40.7075,
            lng: -74.0090,
          },
        ],
      },
      {
        id: 'seq-bennett',
        targetName: 'Trevor Bennett',
        targetType: 'PERSON',
        hops: [
          {
            locationName: 'Financial District ATM Hub',
            timestamp: '2024-08-28 22:30 PM',
            status: 'Observed',
            source: 'ATM Security Cam',
            confidence: 0.96,
            x: 320,
            y: 340,
            lat: 40.7075,
            lng: -74.0090,
          },
          {
            locationName: 'Greenwich St Safehouse',
            timestamp: '2024-08-28 23:15 PM',
            status: 'Potential connection',
            source: 'Cell CDR Ping',
            confidence: 0.82,
            x: 220,
            y: 280,
            lat: 40.7145,
            lng: -74.0095,
          },
        ],
      },
      {
        id: 'seq-reed',
        targetName: 'Evelyn Reed',
        targetType: 'PERSON',
        hops: [
          {
            locationName: 'Grand Central Terminal Sublevel',
            timestamp: '2024-08-29 08:45 AM',
            status: 'Observed',
            source: 'Concourse Security Feed',
            confidence: 0.98,
            x: 480,
            y: 200,
            lat: 40.7527,
            lng: -73.9772,
          },
          {
            locationName: 'Washington Square Footpath',
            timestamp: '2024-08-29 09:15 AM',
            status: 'Observed',
            source: 'Municipal CCTV Cam #14',
            confidence: 0.95,
            x: 360,
            y: 270,
            lat: 40.7308,
            lng: -73.9973,
          },
        ],
      },
    ];
  },
};
