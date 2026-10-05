import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../store/AppContext';
import { cctvApi } from '../../services/api/cctvApi';
import { CCTVFeed, CCTVRecord, CCTVReferenceMatchResult } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Skeleton } from '../../components/common/Skeleton';
import {
  CameraIcon,
  SearchIcon,
  CrosshairIcon,
  CpuIcon,
  UploadIcon,
  UserIcon,
  CarIcon,
  AlertTriangleIcon,
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  RefreshIcon,
  FilterIcon,
} from '../../components/icons/Icons';

export const CCTVIntelligencePage: React.FC = () => {
  const { navigateTo, addToast } = useApp();
  const cctvFileInputRef = useRef<HTMLInputElement>(null);
  const [feeds, setFeeds] = useState<CCTVFeed[]>([]);
  const [detections, setDetections] = useState<CCTVRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedId, setSelectedFeedId] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Reference Image Matcher State
  const [isMatcherOpen, setIsMatcherOpen] = useState(false);
  const [referenceImageType, setReferenceImageType] = useState<'person' | 'vehicle'>('person');
  const [uploadedReferenceName, setUploadedReferenceName] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [matchResults, setMatchResults] = useState<CCTVReferenceMatchResult[] | null>(null);

  // Ingest CCTV Footage / Stream State
  const [isAddFootageOpen, setIsAddFootageOpen] = useState(false);
  const [footageForm, setFootageForm] = useState({
    cameraName: 'Bank Exterior East Cam #09',
    locationName: 'Metropolis Central - 400 Financial Plaza',
    videoFileName: 'cctv_vault_corridor_2024_03.mp4',
    resolution: '4K Super-Res',
    fps: 30,
    detectedType: 'person' as 'person' | 'vehicle' | 'anomaly',
    targetNameOrPlate: 'Julian "Ghost" Drake',
    confidence: 96.4,
    notes: 'Subject recorded entering service alleyway carrying optical lockpick kit.',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [feedsData, detectionsData] = await Promise.all([
        cctvApi.getFeeds(),
        cctvApi.getDetections(),
      ]);
      setFeeds(feedsData);
      setDetections(detectionsData);
    } catch (err) {
      console.error('Failed to load CCTV data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunMatch = async () => {
    setIsMatching(true);
    try {
      const results = await cctvApi.matchReferenceImage(
        uploadedReferenceName || 'reference_target_sample.jpg',
        referenceImageType
      );
      setMatchResults(results as any);
    } catch (err) {
      console.error('Matching error', err);
    } finally {
      setIsMatching(false);
    }
  };

  const handleAddFootage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!footageForm.cameraName.trim()) return;
    try {
      const { camera, detection } = await cctvApi.addFootage(footageForm);
      setFeeds(prev => [camera, ...prev]);
      setDetections(prev => [detection, ...prev]);
      addToast?.(`CCTV footage "${footageForm.videoFileName}" ingested! Target: ${footageForm.targetNameOrPlate}`, 'success');
      setIsAddFootageOpen(false);
    } catch (err) {
      console.error('Failed to add CCTV footage', err);
      addToast?.('Failed to ingest CCTV footage', 'error');
    }
  };

  const filteredDetections = detections.filter(d => {
    const matchesFeed = selectedFeedId === 'all' || d.cameraId === selectedFeedId || d.camera_id === selectedFeedId;
    const matchesType =
      filterType === 'all' ||
      (filterType === 'person' && d.detectedPersonName) ||
      (filterType === 'vehicle' && d.detectedVehiclePlate);
    return matchesFeed && matchesType;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              CCTV Intelligence & Optical ANPR
            </h1>
            <Badge variant="crimson" pulse>
              12 Active Live Feeds
            </Badge>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: 0, maxWidth: '640px' }}>
            Automated neural stream processing with edge bounding-box classification, license plate OCR, and facial descriptor cross-matching.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            icon={<UploadIcon size={16} />}
            onClick={() => {
              setIsMatcherOpen(true);
              setMatchResults(null);
            }}
          >
            Upload Reference Target
          </Button>
          <Button
            variant="primary"
            icon={<CameraIcon size={16} />}
            onClick={() => setIsAddFootageOpen(true)}
          >
            Add CCTV Footage / Feed
          </Button>
        </div>
      </div>

      {/* Active Camera Feeds Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CameraIcon size={16} color="var(--color-crimson)" />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Optical Feeds & Edge Analysis
            </span>
          </div>

          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Processing: 60 FPS • Resolution: 4K Neural Super-Res
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {feeds.slice(0, 4).map(feed => (
            <Card
              key={feed.id}
              variant="interactive"
              style={{
                padding: '0',
                overflow: 'hidden',
                position: 'relative',
                border: feed.hasAnomaly ? '1px solid rgba(255, 42, 66, 0.4)' : undefined,
              }}
              onClick={() => setSelectedFeedId(feed.id)}
            >
              {/* Simulated Camera Video Feed Frame */}
              <div
                style={{
                  height: '160px',
                  background: 'radial-gradient(ellipse at 50% 50%, #151a24 0%, #080a0f 100%)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Scanline overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.5) 50%)',
                    backgroundSize: '100% 4px',
                    pointerEvents: 'none',
                    opacity: 0.6,
                  }}
                />

                {/* Status Badges on Feed */}
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    zIndex: 2,
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF2A42', boxShadow: '0 0 6px #FF2A42' }} />
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#fff', fontWeight: 700 }}>
                    REC • {feed.fps || 30} FPS
                  </span>
                </div>

                <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 2 }}>
                  <Badge variant={feed.hasAnomaly ? 'crimson' : 'default'} pulse={feed.hasAnomaly}>
                    {feed.hasAnomaly ? 'ANOMALY DETECTED' : 'MONITORING'}
                  </Badge>
                </div>

                {/* Simulated Bounding Box */}
                {feed.hasAnomaly && (
                  <div
                    style={{
                      width: '70px',
                      height: '90px',
                      border: '2px solid #FF2A42',
                      boxShadow: '0 0 10px rgba(255, 42, 66, 0.5)',
                      borderRadius: '4px',
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '-16px',
                        left: '0',
                        background: '#FF2A42',
                        color: '#fff',
                        fontSize: '9px',
                        fontFamily: 'monospace',
                        padding: '1px 4px',
                        borderRadius: '2px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      MATCH 96.4%
                    </span>
                  </div>
                )}

                {/* Reticle in Center if no anomaly */}
                {!feed.hasAnomaly && (
                  <CrosshairIcon size={28} color="rgba(255, 255, 255, 0.15)" />
                )}

                {/* Camera Name at Bottom of Viewport */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '10px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: 'rgba(255, 255, 255, 0.7)',
                    zIndex: 2,
                  }}
                >
                  {feed.cameraName || feed.camera_name || 'Cam'} • {feed.resolution || '4K Super-Res'}
                </div>
              </div>

              {/* Feed Card Footer */}
              <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {feed.locationName || feed.location_name || 'Metropolis Central'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-crimson)', fontWeight: 600 }}>
                  {feed.activeDetectionsCount || 0} Entities Tracked
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Detections Log Stream */}
      <Card variant="glass" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
              Live & Historic Detection Feed
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Optical descriptors matched against national & local criminal indices
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={selectedFeedId}
              onChange={e => setSelectedFeedId(e.target.value)}
              style={{
                background: '#0c0f17',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 'var(--border-radius-md)',
                padding: '6px 12px',
                color: '#f0f2f8',
                fontSize: '12px',
                outline: 'none',
              }}
            >
              <option value="all" style={{ background: '#0c0f17', color: '#f0f2f8' }}>All Cameras ({detections.length})</option>
              {feeds.map((f: any) => {
                const fId = f.id || f.feed_id;
                const fCam = f.cameraName || f.camera_name || 'Cam';
                const fLoc = f.locationName || f.location_name || 'Downtown';
                return (
                  <option key={fId} value={fId} style={{ background: '#0c0f17', color: '#f0f2f8' }}>
                    {fCam} - {fLoc}
                  </option>
                );
              })}
            </select>

            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              style={{
                background: '#0c0f17',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 'var(--border-radius-md)',
                padding: '6px 12px',
                color: '#f0f2f8',
                fontSize: '12px',
                outline: 'none',
              }}
            >
              <option value="all" style={{ background: '#0c0f17', color: '#f0f2f8' }}>All Entity Types</option>
              <option value="person" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Persons Only</option>
              <option value="vehicle" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Vehicles & ANPR Plates Only</option>
            </select>
          </div>
        </div>

        {/* Detections List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredDetections.map(det => (
            <div
              key={det.id}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--color-glass-border)',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              {/* Entity Identifier */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: det.detectedPersonName
                      ? 'rgba(255, 42, 66, 0.1)'
                      : 'rgba(168, 85, 247, 0.1)',
                    border: det.detectedPersonName
                      ? '1px solid rgba(255, 42, 66, 0.3)'
                      : '1px solid rgba(168, 85, 247, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {det.detectedPersonName ? (
                    <UserIcon size={18} color="var(--color-crimson)" />
                  ) : (
                    <CarIcon size={18} color="var(--color-purple)" />
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {det.detectedPersonName ||
                      (det.detectedVehiclePlate
                        ? `Vehicle Plate: ${det.detectedVehiclePlate}`
                        : 'Unidentified Subject')}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {det.cameraName || det.camera_name || 'Camera'} • {det.locationName || det.location_name || 'Metropolis Central'}
                  </div>
                </div>
              </div>

              {/* Timestamp & ANPR Metadata */}
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ClockIcon size={14} color="var(--color-text-muted)" />
                  <span>{new Date(det.timestamp || det.detected_at || Date.now()).toLocaleString()}</span>
                </div>
                {det.detectedVehiclePlate && (
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-crimson-bright)' }}>
                    ANPR REG: {det.detectedVehiclePlate} (Dodge Charger)
                  </span>
                )}
              </div>

              {/* Confidence Rating & Verification Warning */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-crimson)' }}>
                    {Math.round(det.confidence * 100)}% match
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                    Algorithmic Match
                  </span>
                </div>

                <Badge variant="crimson">REQUIRES VERIFICATION</Badge>

                {det.personId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateTo('person-profile', { personId: det.personId })}
                  >
                    Dossier <ArrowRightIcon size={12} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Reference Image Matcher Modal */}
      <Modal
        isOpen={isMatcherOpen}
        onClose={() => setIsMatcherOpen(false)}
        title="Reference Image Forensic Matcher"
        subtitle="Upload a facial reference photograph or vehicle license plate to query historical optical footage archives."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setReferenceImageType('person')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '6px',
                background: referenceImageType === 'person' ? 'rgba(255, 42, 66, 0.15)' : 'var(--color-bg-surface)',
                border: referenceImageType === 'person' ? '1px solid #FF2A42' : '1px solid var(--color-glass-border)',
                color: 'var(--color-text-primary)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Facial Reference Query
            </button>
            <button
              onClick={() => setReferenceImageType('vehicle')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '6px',
                background: referenceImageType === 'vehicle' ? 'rgba(255, 42, 66, 0.15)' : 'var(--color-bg-surface)',
                border: referenceImageType === 'vehicle' ? '1px solid #FF2A42' : '1px solid var(--color-glass-border)',
                color: 'var(--color-text-primary)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Vehicle / ANPR Query
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={cctvFileInputRef}
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setUploadedReferenceName(file.name);
              }
            }}
          />

          {/* Upload Simulation Area */}
          <div
            style={{
              border: '2px dashed rgba(255, 42, 66, 0.3)',
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              background: 'rgba(255, 42, 66, 0.02)',
              cursor: 'pointer',
            }}
            onClick={() => cctvFileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files?.[0];
              if (file) {
                setUploadedReferenceName(file.name);
              }
            }}
          >
            <UploadIcon size={32} color="var(--color-crimson)" style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {uploadedReferenceName ? `Loaded: ${uploadedReferenceName}` : 'Click or drop reference image here'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Vector embeddings will be generated via LangGraph CCTV vision models.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="secondary" onClick={() => setIsMatcherOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={isMatching}
              disabled={!uploadedReferenceName}
              onClick={handleRunMatch}
            >
              Execute Archive Match
            </Button>
          </div>

          {/* Match Results Display */}
          {matchResults && (
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-glass-border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Search Results: {matchResults.matches.length} Optical Matches Found
                </span>
                <Badge variant="crimson">ALGORITHMIC MATCH</Badge>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                {matchResults.matches.map((res, index) => (
                  <div
                    key={res.detection_id || index}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--color-glass-border)',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {res.camera_name || res.camera_code || 'Metro Cam'} ({res.location_name || 'Central District'})
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {res.detected_at} • Frame ID: {res.detection_id}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-crimson-bright)' }}>
                        {(res.confidence > 1 ? res.confidence : res.confidence * 100).toFixed(1)}% match
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Requires Verification</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Add CCTV Footage / Camera Feed Modal */}
      <Modal
        isOpen={isAddFootageOpen}
        onClose={() => setIsAddFootageOpen(false)}
        title="Ingest CCTV Footage & Camera Stream"
        subtitle="Upload optical video footage or register a live surveillance feed for real-time LangGraph vision ingestion."
      >
        <form onSubmit={handleAddFootage} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Camera / Feed Identifier
            </label>
            <Input
              value={footageForm.cameraName}
              onChange={e => setFootageForm({ ...footageForm, cameraName: e.target.value })}
              placeholder="e.g., Vault Corridor Perimeter Cam #07"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Location / District
              </label>
              <Input
                value={footageForm.locationName}
                onChange={e => setFootageForm({ ...footageForm, locationName: e.target.value })}
                placeholder="e.g., Downtown First National Bank"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Resolution & Frame Rate
              </label>
              <select
                value={footageForm.resolution}
                onChange={e => setFootageForm({ ...footageForm, resolution: e.target.value })}
                style={{
                  width: '100%',
                  background: '#0c0f17',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  padding: '9px 12px',
                  color: '#f0f2f8',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                <option value="4K Super-Res">4K Neural Super-Res (60 FPS)</option>
                <option value="1080p Full-HD">1080p Enhanced (30 FPS)</option>
                <option value="720p Urban Grid">720p Street Grid (24 FPS)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Video Footage File / Stream Reference
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input
                value={footageForm.videoFileName}
                onChange={e => setFootageForm({ ...footageForm, videoFileName: e.target.value })}
                placeholder="e.g., cctv_bank_exterior_0491.mp4"
                required
                style={{ flex: 1 }}
              />
              <label
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--color-glass-border)',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  color: 'var(--color-text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <UploadIcon size={14} /> Browse File
                <input
                  type="file"
                  accept="video/*,image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFootageForm({ ...footageForm, videoFileName: file.name });
                    }
                  }}
                />
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Detected Target Entity
              </label>
              <select
                value={footageForm.detectedType}
                onChange={e => setFootageForm({ ...footageForm, detectedType: e.target.value as any })}
                style={{
                  width: '100%',
                  background: '#0c0f17',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  padding: '9px 12px',
                  color: '#f0f2f8',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                <option value="person">Suspect / Person of Interest</option>
                <option value="vehicle">Target Vehicle (ANPR Plate)</option>
                <option value="anomaly">General Security Anomaly</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Identified Target / License Plate
              </label>
              <Input
                value={footageForm.targetNameOrPlate}
                onChange={e => setFootageForm({ ...footageForm, targetNameOrPlate: e.target.value })}
                placeholder="e.g., Julian Drake or SYN-7X91"
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Investigative Context / Scene Findings
            </label>
            <textarea
              value={footageForm.notes}
              onChange={e => setFootageForm({ ...footageForm, notes: e.target.value })}
              placeholder="Record forensic observation regarding timestamps, access points, or co-conspirators."
              rows={2}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                padding: '8px 12px',
                color: '#fff',
                fontSize: '12px',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsAddFootageOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" icon={<CameraIcon size={16} />}>
              Ingest & Run Neural Analysis
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
