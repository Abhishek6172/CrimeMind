// ============================================================================
// CrimeMind CCTV Intelligence API Service
// File: cctvApi.ts
// ============================================================================

import { CCTVCamera, CCTVDetection } from '../../types';
import { api } from './apiClient';
import { initialCCTVCameras, initialCCTVDetections } from '../../utils/mockData';

export interface ReferenceMatchResult {
  matches: CCTVDetection[];
  query_image: string;
  matched_count: number;
  confidence_threshold: number;
}

const CAMERAS_STORAGE_KEY = 'crimemind_cctv_cameras';
const DETECTIONS_STORAGE_KEY = 'crimemind_cctv_detections';

export function normalizeCCTVCamera(c: any): any {
  if (!c) return c;
  const id = c.id || c.camera_id || `cam-${Date.now()}`;
  const cameraName = c.cameraName || c.camera_name || c.camera_code || 'Surveillance Camera';
  const locationName = c.locationName || c.location_name || 'Metropolis Central';
  return {
    ...c,
    id,
    camera_id: id,
    cameraName,
    camera_name: cameraName,
    locationName,
    location_name: locationName,
    resolution: c.resolution || '4K Super-Res',
    fps: c.fps || 30,
    status: c.status || 'active',
    hasAnomaly: c.hasAnomaly !== undefined ? c.hasAnomaly : (c.status === 'tampered' || Math.random() > 0.4),
    activeDetectionsCount: c.activeDetectionsCount !== undefined ? c.activeDetectionsCount : 3,
  };
}

export function normalizeCCTVDetection(d: any): any {
  if (!d) return d;
  const id = d.id || d.detection_id || `det-${Date.now()}`;
  const timestamp = d.timestamp || d.detected_at || new Date().toISOString();
  const detectedPersonName = d.detectedPersonName || d.person_name || (d.detected_object === 'person' || d.detected_object === 'face' ? 'Suspect Subject' : undefined);
  const detectedVehiclePlate = d.detectedVehiclePlate || d.vehicle_plate || (d.detected_object === 'vehicle' || d.detected_object === 'license_plate' ? 'SYN-7X91' : undefined);
  const cameraName = d.cameraName || d.camera_name || d.camera_code || 'Metro Cam';
  const locationName = d.locationName || d.location_name || 'Central District';
  const confidence = d.confidence !== undefined ? d.confidence : 0.94;
  const personId = d.personId || d.person_id || (detectedPersonName ? 'per-001' : undefined);

  return {
    ...d,
    id,
    detection_id: id,
    timestamp,
    detected_at: timestamp,
    detectedPersonName,
    person_name: detectedPersonName,
    detectedVehiclePlate,
    vehicle_plate: detectedVehiclePlate,
    cameraName,
    camera_name: cameraName,
    locationName,
    location_name: locationName,
    confidence,
    personId,
    person_id: personId,
  };
}

function getStoredCameras(): any[] {
  const stored = localStorage.getItem(CAMERAS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(CAMERAS_STORAGE_KEY, JSON.stringify(initialCCTVCameras));
    return initialCCTVCameras.map(normalizeCCTVCamera);
  }
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(normalizeCCTVCamera) : initialCCTVCameras.map(normalizeCCTVCamera);
  } catch {
    return initialCCTVCameras.map(normalizeCCTVCamera);
  }
}

function getStoredDetections(): any[] {
  const stored = localStorage.getItem(DETECTIONS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(DETECTIONS_STORAGE_KEY, JSON.stringify(initialCCTVDetections));
    return initialCCTVDetections.map(normalizeCCTVDetection);
  }
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(normalizeCCTVDetection) : initialCCTVDetections.map(normalizeCCTVDetection);
  } catch {
    return initialCCTVDetections.map(normalizeCCTVDetection);
  }
}

export const cctvApi = {
  // GET /api/cctv/cameras
  async getCameras(): Promise<any[]> {
    try {
      const data = await api.get<any[]>('/cctv/cameras');
      return data.map(normalizeCCTVCamera);
    } catch {
      return getStoredCameras();
    }
  },

  // Alias for getCameras
  async getFeeds(): Promise<any[]> {
    return cctvApi.getCameras();
  },

  // Alias for getAll
  async getAll(): Promise<any[]> {
    return cctvApi.getCameras();
  },

  // Ingest New CCTV Camera / Footage Source
  async addCamera(camera: Partial<CCTVCamera> & { locationName?: string; cameraName?: string }): Promise<any> {
    const newCam = normalizeCCTVCamera({
      ...camera,
      id: camera.camera_id || `cam-${Date.now()}`,
      camera_id: camera.camera_id || `cam-${Date.now()}`,
      created_at: new Date().toISOString(),
    });
    const current = getStoredCameras();
    const updated = [newCam, ...current];
    localStorage.setItem(CAMERAS_STORAGE_KEY, JSON.stringify(updated));
    return newCam;
  },

  // Ingest New Detection / Video Extract
  async addDetection(detection: Partial<CCTVDetection> & { detectedPersonName?: string; detectedVehiclePlate?: string; cameraName?: string; locationName?: string }): Promise<any> {
    const newDet = normalizeCCTVDetection({
      ...detection,
      id: detection.detection_id || `det-${Date.now()}`,
      detection_id: detection.detection_id || `det-${Date.now()}`,
      detected_at: detection.detected_at || new Date().toISOString(),
    });
    const current = getStoredDetections();
    const updated = [newDet, ...current];
    localStorage.setItem(DETECTIONS_STORAGE_KEY, JSON.stringify(updated));
    return newDet;
  },

  // High-level: Ingest CCTV Footage clip with camera & automatic detection
  async addFootage(footageData: {
    cameraName: string;
    locationName: string;
    resolution?: string;
    fps?: number;
    videoFileName?: string;
    detectedType: 'person' | 'vehicle' | 'anomaly';
    targetNameOrPlate: string;
    confidence?: number;
    notes?: string;
  }): Promise<{ camera: any; detection: any }> {
    const camId = `cam-${Date.now()}`;
    const camera = await cctvApi.addCamera({
      camera_id: camId,
      camera_name: footageData.cameraName,
      cameraName: footageData.cameraName,
      location_name: footageData.locationName,
      locationName: footageData.locationName,
      resolution: footageData.resolution || '4K Super-Res',
      fps: footageData.fps || 30,
      status: 'active',
      hasAnomaly: true,
      activeDetectionsCount: 1,
    });

    const isPerson = footageData.detectedType === 'person';
    const detection = await cctvApi.addDetection({
      camera_id: camId,
      camera_name: footageData.cameraName,
      cameraName: footageData.cameraName,
      location_name: footageData.locationName,
      locationName: footageData.locationName,
      detected_object: isPerson ? 'person' : 'vehicle',
      detectedPersonName: isPerson ? footageData.targetNameOrPlate : undefined,
      person_name: isPerson ? footageData.targetNameOrPlate : undefined,
      detectedVehiclePlate: !isPerson ? footageData.targetNameOrPlate : undefined,
      vehicle_plate: !isPerson ? footageData.targetNameOrPlate : undefined,
      confidence: footageData.confidence || 0.96,
      image_reference: footageData.videoFileName || 'cctv_frame_capture.jpg',
      bounding_box: { x: 120, y: 80, width: 90, height: 140 },
    });

    return { camera, detection };
  },

  // GET /api/cctv/detections
  async getDetections(filters?: { camera_id?: string; detected_object?: string }): Promise<any[]> {
    try {
      const data = await api.get<any[]>('/cctv/detections', filters);
      return data.map(normalizeCCTVDetection);
    } catch {
      let list = getStoredDetections();
      if (filters?.camera_id && filters.camera_id !== 'all') {
        list = list.filter(d => d.camera_id === filters.camera_id || d.id === filters.camera_id);
      }
      if (filters?.detected_object && filters.detected_object !== 'all') {
        list = list.filter(d => d.detected_object === filters.detected_object);
      }
      return list;
    }
  },

  // POST /api/cctv/match-reference
  async matchReferenceImage(imageData: string, targetType: 'person' | 'vehicle'): Promise<ReferenceMatchResult> {
    try {
      return await api.post<ReferenceMatchResult>('/cctv/match-reference', { image: imageData, type: targetType });
    } catch {
      const allDets = getStoredDetections();
      let matches = allDets.filter(d => 
        targetType === 'person' ? (d.detected_object === 'face' || d.detected_object === 'person' || d.detectedPersonName) : (d.detected_object === 'vehicle' || d.detected_object === 'license_plate' || d.detectedVehiclePlate)
      );
      return {
        matches,
        query_image: imageData,
        matched_count: matches.length,
        confidence_threshold: 0.85,
      };
    }
  }
};
