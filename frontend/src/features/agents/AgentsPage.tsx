import React, { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { agentsApi } from '../../services/api/agentsApi';
import { LangGraphAgent } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import {
  CpuIcon,
  RefreshIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  PlayIcon,
  NetworkIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
} from '../../components/icons/Icons';

export const AgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<LangGraphAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAgentId, setRunningAgentId] = useState<string | null>(null);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const data = await agentsApi.getAll();
      setAgents(data);
    } catch (err) {
      console.error('Failed to load agents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const handleTriggerAgent = async (agentId: string) => {
    setRunningAgentId(agentId);
    try {
      await agentsApi.triggerAgent(agentId);
      await loadAgents();
    } catch (err) {
      console.error('Trigger agent error', err);
    } finally {
      setRunningAgentId(null);
    }
  };

  const getStatusBadge = (status: LangGraphAgent['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="crimson" pulse>PROCESSING</Badge>;
      case 'idle':
        return <Badge variant="success">READY</Badge>;
      case 'standby':
        return <Badge variant="default">STANDBY</Badge>;
      case 'error':
        return <Badge variant="critical">ERROR</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              LangGraph Multi-Agent Orchestration
            </h1>
            <Badge variant="crimson" pulse>
              9 Micro-Agents Active
            </Badge>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: 0, maxWidth: '640px' }}>
            Autonomous state machine coordinating specialized LLM neural agents across evidence extraction, graph traversal, and legal policy verification.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" icon={<RefreshIcon size={14} />} onClick={loadAgents}>
            Refresh Status
          </Button>
          <Button
            variant="primary"
            icon={<PlayIcon size={14} />}
            onClick={() => handleTriggerAgent('all')}
            loading={runningAgentId === 'all'}
          >
            Run Full Swarm Sync
          </Button>
        </div>
      </div>

      {/* Visual Agent Workflow DAG Canvas */}
      <Card variant="glass" style={{ padding: '24px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
              Agent Directed Acyclic Graph (DAG) Execution Topology
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Parallel Fan-Out &amp; Synthesis Reduce Pipeline
            </span>
          </div>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-crimson-bright)' }}>
            AVG SWARM LATENCY: 284ms
          </span>
        </div>

        {/* Tactical DAG Diagram SVG */}
        <div
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, #0d121c 0%, #06080c 100%)',
            border: '1px solid var(--color-glass-border)',
            borderRadius: '8px',
            padding: '24px 16px',
            position: 'relative',
            overflowX: 'auto',
          }}
        >
          <svg viewBox="0 0 900 240" style={{ width: '100%', minWidth: '700px', height: '220px', display: 'block' }}>
            <defs>
              <linearGradient id="dag-flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FF2A42" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Connecting Flow Lines */}
            {/* Planner to 7 intermediate agents */}
            {[40, 70, 100, 130, 160, 190, 220].map((y, i) => (
              <path
                key={`line-in-${i}`}
                d={`M 140 120 C 240 120, 280 ${y}, 400 ${y}`}
                fill="none"
                stroke="rgba(255, 42, 66, 0.25)"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />
            ))}

            {/* Intermediate agents to Synthesis */}
            {[40, 70, 100, 130, 160, 190, 220].map((y, i) => (
              <path
                key={`line-out-${i}`}
                d={`M 560 ${y} C 660 ${y}, 700 120, 760 120`}
                fill="none"
                stroke="rgba(56, 189, 248, 0.25)"
                strokeWidth="1.5"
              />
            ))}

            {/* Start Node: Planner */}
            <g transform="translate(60, 120)">
              <rect x="-60" y="-24" width="120" height="48" rx="6" fill="#0E121C" stroke="#FF2A42" strokeWidth="2" />
              <text y="-2" fill="#fff" fontSize="12" fontWeight="700" textAnchor="middle">
                Planner Agent
              </text>
              <text y="14" fill="#FF2A42" fontSize="9" textAnchor="middle" fontFamily="monospace">
                FAN-OUT ROOT
              </text>
            </g>

            {/* Parallel Layer (7 Specialized Agents) */}
            {[
              { name: 'Evidence', y: 40 },
              { name: 'Case', y: 70 },
              { name: 'Person', y: 100 },
              { name: 'CCTV Vision', y: 130 },
              { name: 'Graph Topology', y: 160 },
              { name: 'Law / Policy', y: 190 },
              { name: 'Timeline', y: 220 },
            ].map((node, i) => (
              <g key={`mid-${i}`} transform={`translate(480, ${node.y})`}>
                <rect x="-70" y="-13" width="140" height="26" rx="4" fill="#0C0E14" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />
                <text y="4" fill="var(--color-text-primary)" fontSize="10" fontWeight="600" textAnchor="middle">
                  {node.name} Agent
                </text>
              </g>
            ))}

            {/* End Node: Synthesis */}
            <g transform="translate(820, 120)">
              <rect x="-60" y="-24" width="120" height="48" rx="6" fill="#0E121C" stroke="#38BDF8" strokeWidth="2" />
              <text y="-2" fill="#fff" fontSize="12" fontWeight="700" textAnchor="middle">
                Synthesis Agent
              </text>
              <text y="14" fill="#38BDF8" fontSize="9" textAnchor="middle" fontFamily="monospace">
                REDUCE HYPOTHESIS
              </text>
            </g>
          </svg>
        </div>
      </Card>

      {/* Agents Operational Matrix Table */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} height="200px" borderRadius="10px" />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {agents.map(agent => (
            <Card
              key={agent.id}
              variant="interactive"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: 'rgba(255, 42, 66, 0.08)',
                        border: '1px solid rgba(255, 42, 66, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CpuIcon size={16} color="var(--color-crimson)" />
                    </div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                      {agent.name}
                    </h3>
                  </div>
                  {getStatusBadge(agent.status)}
                </div>

                {/* Current Task Description */}
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>
                    Current Mission / State
                  </span>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: '1.4' }}>
                    {agent.currentTask || 'Idle on message bus standby.'}
                  </p>
                </div>

                {/* Agent Metrics Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    padding: '10px 0',
                    borderTop: '1px solid var(--color-glass-border)',
                    borderBottom: '1px solid var(--color-glass-border)',
                    marginBottom: '14px',
                    fontSize: '11px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Latency</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {agent.executionTimeMs}ms
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Confidence</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-crimson-bright)' }}>
                      {Math.round(agent.confidence * 100)}%
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Findings</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                      {agent.findingsCount} logged
                    </span>
                  </div>
                </div>

                {/* Error log if any */}
                {agent.errors && agent.errors.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-danger)', marginBottom: '10px' }}>
                    <AlertTriangleIcon size={12} />
                    <span>{agent.errors[0]}</span>
                  </div>
                )}
              </div>

              {/* Card Footer with Execution Timestamp & Action */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                  Last run: {new Date(agent.lastExecution).toLocaleTimeString()}
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTriggerAgent(agent.id)}
                  loading={runningAgentId === agent.id}
                >
                  Invoke Now
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
