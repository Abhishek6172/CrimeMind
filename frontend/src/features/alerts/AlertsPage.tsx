
import React, { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { alertsApi } from '../../services/api/alertsApi';
import { Alert } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import {
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
} from '../../components/icons/Icons';

export const AlertsPage: React.FC = () => {
  const { navigateTo } = useApp();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  const loadAlerts = async () => {
    setLoading(true);

    try {
      const data = await alertsApi.getAll();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAlerts();
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await alertsApi.acknowledge(alertId);

      setAlerts((previousAlerts) =>
        previousAlerts.map((alert) =>
          alert.alert_id === alertId
            ? { ...alert, is_acknowledged: true }
            : alert
        )
      );
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const getAlertIcon = (type: Alert['alert_type']) => {
    switch (type) {
      case 'suspicious_activity':
        return (
          <ShieldAlertIcon
            size={16}
            color="var(--color-crimson)"
          />
        );

      case 'new_cctv_detection':
        return (
          <CameraIcon
            size={16}
            color="var(--color-info)"
          />
        );

      case 'evidence_match':
        return (
          <FileTextIcon
            size={16}
            color="var(--color-warning)"
          />
        );

      case 'cross_case_connection':
        return (
          <NetworkIcon
            size={16}
            color="var(--color-crimson-bright)"
          />
        );

      case 'unusual_transaction':
        return (
          <DatabaseIcon
            size={16}
            color="var(--color-warning)"
          />
        );

      case 'repeated_vehicle_appearance':
        return (
          <CarIcon
            size={16}
            color="var(--color-purple)"
          />
        );

      case 'agent_generated':
      default:
        return (
          <CpuIcon
            size={16}
            color="var(--color-crimson)"
          />
        );
    }
  };

  const getSeverityBadge = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
      case 'extreme':
        return (
          <Badge variant="crimson" pulse>
            CRITICAL
          </Badge>
        );

      case 'high':
        return <Badge variant="crimson">HIGH</Badge>;

      case 'medium':
      case 'moderate':
        return <Badge variant="warning">MEDIUM</Badge>;

      case 'low':
      default:
        return <Badge variant="default">LOW</Badge>;
    }
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.title.toLowerCase().includes(normalizedSearch) ||
      alert.description.toLowerCase().includes(normalizedSearch) ||
      (alert.source_evidence_title
        ?.toLowerCase()
        .includes(normalizedSearch) ??
        false) ||
      (alert.source_case_number
        ?.toLowerCase()
        .includes(normalizedSearch) ??
        false);

    const matchesType =
      selectedType === 'all' ||
      alert.alert_type === selectedType;

    const matchesSeverity =
      selectedSeverity === 'all' ||
      alert.severity === selectedSeverity;

    return matchesSearch && matchesType && matchesSeverity;
  });

  const unacknowledgedCriticalCount = alerts.filter(
    (alert) =>
      (alert.severity === 'critical' ||
        alert.severity === 'extreme') &&
      !alert.is_acknowledged
  ).length;

  const selectStyle: React.CSSProperties = {
    background: '#0c0f17',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 'var(--border-radius-md)',
    padding: '10px 14px',
    color: '#f0f2f8',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    minWidth: 0,
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '4px',
              flexWrap: 'wrap',
            }}
          >
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 800,
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Real-Time Tactical Alerts
            </h1>

            <Badge variant="crimson" pulse>
              {unacknowledgedCriticalCount} Critical Unhandled
            </Badge>
          </div>

          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '13px',
              margin: 0,
              maxWidth: '640px',
            }}
          >
            Alerts from sensor triggers, CCTV detections, cross-case
            connections, and unusual activity. Review the associated
            source information before drawing investigative conclusions.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => void loadAlerts()}
          disabled={loading}
        >
          Refresh Alerts Feed
        </Button>
      </div>

      {/* Search and filters */}
      <Card variant="glass" style={{ padding: '16px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
          }}
        >
          <Input
            placeholder="Search alerts, subjects, or evidence sources..."
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
            icon={<SearchIcon size={16} />}
          />

          <select
            aria-label="Filter by alert category"
            value={selectedType}
            onChange={(event) =>
              setSelectedType(event.target.value)
            }
            style={selectStyle}
          >
            <option value="all">All Alert Categories</option>
            <option value="suspicious_activity">
              Suspicious Activity
            </option>
            <option value="new_cctv_detection">
              New CCTV Detection
            </option>
            <option value="evidence_match">Evidence Match</option>
            <option value="cross_case_connection">
              Cross-Case Connection
            </option>
            <option value="unusual_transaction">
              Unusual Transaction
            </option>
            <option value="repeated_vehicle_appearance">
              Repeated Vehicle Sighting
            </option>
            <option value="agent_generated">
              Agent-Generated Alert
            </option>
          </select>

          <select
            aria-label="Filter by alert severity"
            value={selectedSeverity}
            onChange={(event) =>
              setSelectedSeverity(event.target.value)
            }
            style={selectStyle}
          >
            <option value="all">All Threat Severities</option>
            <option value="critical">Critical Severity Only</option>
            <option value="extreme">Extreme Severity</option>
            <option value="high">High Severity</option>
            <option value="medium">Medium Severity</option>
            <option value="moderate">Moderate Severity</option>
            <option value="low">Low / Informational</option>
          </select>
        </div>
      </Card>

      {/* Alerts list */}
      {loading ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {[1, 2, 3, 4].map((item) => (
            <Skeleton
              key={item}
              height="130px"
              borderRadius="10px"
            />
          ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          icon={
            <CheckCircleIcon
              size={48}
              color="var(--color-success)"
            />
          }
          title="No Matching Alerts"
          description="No alerts match the selected search and filter criteria."
        />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {filteredAlerts.map((alert) => (
            <Card
              key={alert.alert_id}
              variant="interactive"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                borderLeft:
                  alert.severity === 'critical' ||
                  alert.severity === 'extreme'
                    ? '4px solid #FF2A42'
                    : alert.severity === 'high'
                    ? '4px solid #F43F5E'
                    : '1px solid var(--color-glass-border)',
              }}
            >
              {/* Alert metadata */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      flexShrink: 0,
                      borderRadius: '6px',
                      background: 'rgba(255, 42, 66, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getAlertIcon(alert.alert_type)}
                  </div>

                  <div>
                    <h3
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        margin: 0,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {alert.title}
                    </h3>

                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Type:{' '}
                      {alert.alert_type
                        .replace(/_/g, ' ')
                        .toUpperCase()}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  {getSeverityBadge(alert.severity)}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    <ClockIcon size={12} />

                    <span>
                      {new Date(alert.created_at).toLocaleString(
                        undefined,
                        {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Alert description */}
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: '1.5',
                  margin: 0,
                }}
              >
                {alert.description}
              </p>

              {/* Source evidence */}
              {alert.source_evidence_title && (
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
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      minWidth: 0,
                    }}
                  >
                    <FileTextIcon
                      size={14}
                      color="var(--color-crimson)"
                    />

                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      Source Evidence: {alert.source_evidence_title}
                    </span>
                  </div>

                  {alert.source_evidence_id && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: 'var(--color-crimson-bright)',
                      }}
                    >
                      REF ID: {alert.source_evidence_id}
                    </span>
                  )}
                </div>
              )}

              {/* Source case */}
              {alert.source_case_number && (
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Source case: {alert.source_case_number}
                </div>
              )}

              {/* Alert actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--color-glass-border)',
                  fontSize: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  {alert.source_case_id && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigateTo('case-detail', {
                            caseId: alert.source_case_id,
                          })
                        }
                      >
                        Open Case <ArrowRightIcon size={12} />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigateTo('relationship-graph', {
                            caseId: alert.source_case_id,
                          })
                        }
                      >
                        Inspect in Graph{' '}
                        <ArrowRightIcon size={12} />
                      </Button>
                    </>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {alert.is_acknowledged ? (
                    <Badge variant="success">
                      Acknowledged
                    </Badge>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        void handleAcknowledge(alert.alert_id)
                      }
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
