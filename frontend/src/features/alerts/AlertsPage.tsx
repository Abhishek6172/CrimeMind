import React, { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { alertsApi } from '../../services/api/alertsApi';
import { AlertItem } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import {
  AlertTriangleIcon,
  ShieldAlertIcon,
  CameraIcon,
  FileTextIcon,
  NetworkIcon,
  CarIcon,
  DatabaseIcon,
  CpuIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  SearchIcon,
  FilterIcon,
} from '../../components/icons/Icons';

export const AlertsPage: React.FC = () => {
  const { navigateTo } = useApp();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await alertsApi.getAll();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await alertsApi.acknowledge(alertId);
      setAlerts(prev =>
        prev.map(a => (a.id === alertId ? { ...a, status: 'acknowledged' } : a))
      );
    } catch (err) {
      console.error('Failed to acknowledge alert', err);
    }
  };

  const getAlertIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'suspicious_activity':
        return <ShieldAlertIcon size={16} color="var(--color-crimson)" />;
      case 'new_cctv_detection':
        return <CameraIcon size={16} color="var(--color-info)" />;
      case 'evidence_match':
        return <FileTextIcon size={16} color="var(--color-warning)" />;
      case 'cross_case_connection':
        return <NetworkIcon size={16} color="var(--color-crimson-bright)" />;
      case 'unusual_transaction':
        return <DatabaseIcon size={16} color="var(--color-warning)" />;
      case 'repeated_vehicle_appearance':
        return <CarIcon size={16} color="var(--color-purple)" />;
      case 'agent_generated_alert':
      default:
        return <CpuIcon size={16} color="var(--color-crimson)" />;
    }
  };

  const getSeverityBadge = (severity: AlertItem['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return <Badge variant="crimson" pulse>CRITICAL</Badge>;
      case 'HIGH':
        return <Badge variant="crimson">HIGH</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">MEDIUM</Badge>;
      case 'LOW':
      default:
        return <Badge variant="default">LOW</Badge>;
    }
  };

  const filteredAlerts = alerts.filter(a => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.sourceEvidence?.title && a.sourceEvidence.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || a.type === selectedType;
    const matchesSeverity = selectedSeverity === 'all' || a.severity === selectedSeverity;

    return matchesSearch && matchesType && matchesSeverity;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Real-Time Tactical Alerts
            </h1>
            <Badge variant="crimson" pulse>
              {alerts.filter(a => a.severity === 'CRITICAL').length} Critical Unhandled
            </Badge>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: 0, maxWidth: '640px' }}>
            Automated sensor triggers grounded with verifiable source evidence, cross-case link detection, and unusual movement anomalies.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" onClick={loadAlerts}>
            Refresh Alerts Feed
          </Button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <Card variant="glass" style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <Input
            placeholder="Search alerts, subjects, or evidence sources..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            leftIcon={<SearchIcon size={16} />}
          />

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            style={{
              background: '#0c0f17',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--border-radius-md)',
              padding: '10px 14px',
              color: '#f0f2f8',
              fontSize: '13px',
              outline: 'none',
            }}
          >
            <option value="all" style={{ background: '#0c0f17', color: '#f0f2f8' }}>All Alert Categories</option>
            <option value="suspicious_activity" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Suspicious Activity</option>
            <option value="new_cctv_detection" style={{ background: '#0c0f17', color: '#f0f2f8' }}>New CCTV Detection</option>
            <option value="evidence_match" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Evidence Match</option>
            <option value="cross_case_connection" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Cross-Case Connection</option>
            <option value="unusual_transaction" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Unusual Transaction</option>
            <option value="repeated_vehicle_appearance" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Repeated Vehicle Sighting</option>
            <option value="agent_generated_alert" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Agent-Generated Alert</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={e => setSelectedSeverity(e.target.value)}
            style={{
              background: '#0c0f17',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--border-radius-md)',
              padding: '10px 14px',
              color: '#f0f2f8',
              fontSize: '13px',
              outline: 'none',
            }}
          >
            <option value="all" style={{ background: '#0c0f17', color: '#f0f2f8' }}>All Threat Severities</option>
            <option value="CRITICAL" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Critical Severity Only</option>
            <option value="HIGH" style={{ background: '#0c0f17', color: '#f0f2f8' }}>High Severity</option>
            <option value="MEDIUM" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Medium Severity</option>
            <option value="LOW" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Low / Informational</option>
          </select>
        </div>
      </Card>

      {/* Alerts Stream List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} height="130px" borderRadius="10px" />
          ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          icon={<CheckCircleIcon size={48} color="var(--color-success)" />}
          title="No Active Alerts"
          description="All flagged sensor anomalies and agent triggers have been triaged or acknowledged."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredAlerts.map(alert => (
            <Card
              key={alert.id}
              variant="interactive"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                borderLeft:
                  alert.severity === 'CRITICAL'
                    ? '4px solid #FF2A42'
                    : alert.severity === 'HIGH'
                    ? '4px solid #F43F5E'
                    : '1px solid var(--color-glass-border)',
              }}
            >
              {/* Top Meta Line */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: 'rgba(255, 42, 66, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getAlertIcon(alert.type)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>
                      {alert.title}
                    </h3>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      Type: {((alert.type || 'alert') as string).replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {getSeverityBadge(alert.severity)}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    <ClockIcon size={12} />
                    <span>{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              {/* Narrative Description */}
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5', margin: 0 }}>
                {alert.description}
              </p>

              {/* MANDATORY REQUIREMENT: Every alert must show source evidence */}
              {alert.sourceEvidence && (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileTextIcon size={14} color="var(--color-crimson)" />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      Source Evidence: {alert.sourceEvidence.title}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      ({((alert.sourceEvidence.type || 'evidence') as string).toUpperCase()})
                    </span>
                  </div>

                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-crimson-bright)' }}>
                    REF ID: {alert.sourceEvidence.id}
                  </span>
                </div>
              )}

              {/* Action Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--color-glass-border)',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', gap: '12px' }}>
                  {alert.caseId && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => navigateTo('case-detail', { caseId: alert.caseId })}
                    >
                      Open Case <ArrowRightIcon size={12} />
                    </Button>
                  )}

                  {alert.caseId && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => navigateTo('relationship-graph', { caseId: alert.caseId })}
                    >
                      Inspect in Graph <ArrowRightIcon size={12} />
                    </Button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {alert.status !== 'acknowledged' && (
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handleAcknowledge(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
