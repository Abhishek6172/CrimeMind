import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../store/AppContext';
import { graphApi } from '../../services/api/graphApi';
import { casesApi } from '../../services/api/casesApi';
import { GraphData, GraphNode, GraphEdge, Case } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Drawer } from '../../components/common/Drawer';
import { Skeleton } from '../../components/common/Skeleton';
import {
  NetworkIcon,
  SearchIcon,
  ZoomInIcon,
  ZoomOutIcon,
  RefreshIcon,
  FilterIcon,
  ShieldCheckIcon,
  CpuIcon,
  UserIcon,
  CarIcon,
  MapPinIcon,
  FileTextIcon,
  PhoneIcon,
  DatabaseIcon,
  AlertTriangleIcon,
  LayersIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockIcon,
} from '../../components/icons/Icons';

export const RelationshipGraphPage: React.FC = () => {
  const { currentCaseId, navigateTo } = useApp();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(currentCaseId || '');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  // Graph interaction state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());

  // Filter state
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string>('all');
  const [edgeTypeFilter, setEdgeTypeFilter] = useState<string>('all');
  const [showEvidence, setShowEvidence] = useState(true);
  const [showTimelineBar, setShowTimelineBar] = useState(false);

  // Path highlight state
  const [pathStartNode, setPathStartNode] = useState<string | null>(null);
  const [pathEndNode, setPathEndNode] = useState<string | null>(null);
  const [pathEdgeIds, setPathEdgeIds] = useState<Set<string>>(new Set());

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Load cases and initial graph
  useEffect(() => {
    const init = async () => {
      try {
        const casesList = await casesApi.getAll();
        setCases(casesList);
        const caseToLoad = currentCaseId || (casesList[0]?.id ?? '');
        setSelectedCaseId(caseToLoad);
        loadGraph(caseToLoad);
      } catch (err) {
        console.error('Failed to load initial graph cases', err);
      }
    };
    init();
  }, [currentCaseId]);

  const loadGraph = async (caseId: string) => {
    setLoading(true);
    try {
      const data = await graphApi.getCaseGraph(caseId);
      const normalizedNodes = (data.nodes || []).map((node, index, arr) => {
        let x = node.x;
        let y = node.y;
        const size = node.size || node.radius || 24;
        if (x === undefined || y === undefined || isNaN(x) || isNaN(y)) {
          const angle = (index / Math.max(1, arr.length)) * 2 * Math.PI;
          const radius = 220 + (index % 3) * 60;
          x = 550 + radius * Math.cos(angle);
          y = 360 + radius * Math.sin(angle);
        }
        return {
          ...node,
          x: Math.round(x),
          y: Math.round(y),
          size,
          radius: size,
        };
      });

      const normalizedEdges = (data.edges || []).map(edge => ({
        ...edge,
        relationship: edge.relationship || edge.relationshipType || 'CONNECTED_TO',
        relationshipType: edge.relationshipType || edge.relationship || 'CONNECTED_TO',
      }));

      setGraphData({ nodes: normalizedNodes, edges: normalizedEdges });
      setSelectedNode(null);
      setHighlightedNodeIds(new Set());
      setPathStartNode(null);
      setPathEndNode(null);
      setPathEdgeIds(new Set());
      // Center graph
      setPan({ x: 80, y: 40 });
      setZoom(1);
    } catch (err) {
      console.error('Failed to fetch graph data', err);
    } finally {
      setLoading(false);
    }
  };

  // Node Color & Icon Mapping
  const getNodeColor = (type: GraphNode['type']) => {
    switch (type) {
      case 'PERSON':
        return '#FF2A42'; // Crimson
      case 'CASE':
        return '#38BDF8'; // Sky Blue
      case 'VEHICLE':
        return '#A855F7'; // Purple
      case 'LOCATION':
        return '#10B981'; // Emerald
      case 'EVIDENCE':
        return '#F59E0B'; // Amber
      case 'CALL':
        return '#06B6D4'; // Cyan
      case 'TRANSACTION':
        return '#F97316'; // Orange
      case 'INCIDENT':
        return '#E11D48'; // Rose
      default:
        return '#94A3B8';
    }
  };

  // Drag pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Search filter
  useEffect(() => {
    if (!graphData || !searchQuery.trim()) {
      setHighlightedNodeIds(new Set());
      return;
    }
    const matching = new Set<string>();
    graphData.nodes.forEach(n => {
      if (
        n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.subLabel?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        matching.add(n.id);
      }
    });
    setHighlightedNodeIds(matching);
  }, [searchQuery, graphData]);

  // Path highlight logic
  const handleNodeClick = (node: GraphNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(node);

    // If Alt key is pressed, use for path highlighting
    if (e.altKey) {
      if (!pathStartNode) {
        setPathStartNode(node.id);
      } else if (!pathEndNode && pathStartNode !== node.id) {
        setPathEndNode(node.id);
        calculatePath(pathStartNode, node.id);
      } else {
        setPathStartNode(node.id);
        setPathEndNode(null);
        setPathEdgeIds(new Set());
      }
    }
  };

  const calculatePath = (start: string, end: string) => {
    if (!graphData) return;
    // Simple BFS to find path
    const queue: string[][] = [[start]];
    const visited = new Set<string>([start]);
    let foundPath: string[] | null = null;

    while (queue.length > 0) {
      const currentPath = queue.shift()!;
      const currentId = currentPath[currentPath.length - 1];

      if (currentId === end) {
        foundPath = currentPath;
        break;
      }

      const neighbors = graphData.edges
        .filter(e => e.source === currentId || e.target === currentId)
        .map(e => (e.source === currentId ? e.target : e.source));

      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push([...currentPath, n]);
        }
      }
    }

    if (foundPath) {
      const edgeIds = new Set<string>();
      for (let i = 0; i < foundPath.length - 1; i++) {
        const u = foundPath[i];
        const v = foundPath[i + 1];
        const edge = graphData.edges.find(
          e => (e.source === u && e.target === v) || (e.source === v && e.target === u)
        );
        if (edge) edgeIds.add(edge.id);
      }
      setPathEdgeIds(edgeIds);
    }
  };

  const filteredNodes = graphData?.nodes.filter(n => {
    if (!showEvidence && n.type === 'EVIDENCE') return false;
    if (nodeTypeFilter !== 'all' && n.type !== nodeTypeFilter) return false;
    return true;
  }) || [];

  const visibleNodeIds = new Set(filteredNodes.map(n => n.id));

  const filteredEdges = graphData?.edges.filter(e => {
    if (!visibleNodeIds.has(e.source) || !visibleNodeIds.has(e.target)) return false;
    const rel = e.relationship || e.relationshipType || '';
    if (edgeTypeFilter !== 'all' && rel !== edgeTypeFilter) return false;
    return true;
  }) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 120px)' }}>
      {/* Top Controls Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'rgba(15, 17, 23, 0.8)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--color-glass-border)',
          borderRadius: 'var(--border-radius-lg)',
          padding: '12px 18px',
        }}
      >
        {/* Left: Case Selector & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <NetworkIcon size={20} color="var(--color-crimson)" />
            <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.01em' }}>
              Intelligence Graph
            </span>
          </div>

          <select
            value={selectedCaseId}
            onChange={e => {
              setSelectedCaseId(e.target.value);
              loadGraph(e.target.value);
            }}
            style={{
              background: '#0c0f17',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--border-radius-md)',
              padding: '6px 12px',
              color: '#f0f2f8',
              fontSize: '12px',
              outline: 'none',
              maxWidth: '240px',
            }}
          >
            {cases.map((c: any) => {
              const cId = c.id || c.case_id;
              const cNum = c.caseNumber || c.case_number;
              return (
                <option key={cId} value={cId} style={{ background: '#0c0f17', color: '#f0f2f8' }}>
                  {cNum} - {(c.title || '').substring(0, 24)}...
                </option>
              );
            })}
          </select>
        </div>

        {/* Center: Search & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ width: '180px' }}>
            <Input
              placeholder="Search node..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              icon={<SearchIcon size={14} />}
            />
          </div>

          <select
            value={nodeTypeFilter}
            onChange={e => setNodeTypeFilter(e.target.value)}
            style={{
              background: '#0c0f17',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--border-radius-md)',
              padding: '6px 10px',
              color: '#f0f2f8',
              fontSize: '12px',
              outline: 'none',
            }}
          >
            <option value="all" style={{ background: '#0c0f17', color: '#f0f2f8' }}>All Node Types</option>
            <option value="PERSON" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Persons</option>
            <option value="CASE" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Cases</option>
            <option value="VEHICLE" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Vehicles</option>
            <option value="LOCATION" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Locations</option>
            <option value="EVIDENCE" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Evidence</option>
            <option value="CALL" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Calls</option>
            <option value="TRANSACTION" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Transactions</option>
            <option value="INCIDENT" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Incidents</option>
          </select>

          <select
            value={edgeTypeFilter}
            onChange={e => setEdgeTypeFilter(e.target.value)}
            style={{
              background: '#0c0f17',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--border-radius-md)',
              padding: '6px 10px',
              color: '#f0f2f8',
              fontSize: '12px',
              outline: 'none',
            }}
          >
            <option value="all" style={{ background: '#0c0f17', color: '#f0f2f8' }}>All Relationships</option>
            <option value="KNOWN_ASSOCIATE" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Known Associate</option>
            <option value="COMMUNICATION" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Communication</option>
            <option value="TRANSACTION" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Transaction</option>
            <option value="SEEN_WITH" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Seen With</option>
            <option value="OWNS" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Owns</option>
            <option value="LOCATED_AT" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Located At</option>
            <option value="LINKED_TO_CASE" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Linked To Case</option>
            <option value="EVIDENCE_SUPPORTS" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Evidence Supports</option>
            <option value="VEHICLE_APPEARANCE" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Vehicle Appearance</option>
          </select>
        </div>

        {/* Right: Graph Zoom & Layout Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Button
            variant={showEvidence ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setShowEvidence(!showEvidence)}
            title="Toggle Evidence Nodes"
          >
            Evidence
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(prev => Math.min(prev + 0.2, 2.5))}
            title="Zoom In"
          >
            <ZoomInIcon size={14} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.4))}
            title="Zoom Out"
          >
            <ZoomOutIcon size={14} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setZoom(1);
              setPan({ x: 100, y: 50 });
            }}
            title="Reset View"
          >
            <RefreshIcon size={14} />
          </Button>
        </div>
      </div>

      {/* Main Interactive Canvas / SVG Area */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          borderRadius: 'var(--border-radius-lg)',
          overflow: 'hidden',
          background: 'radial-gradient(ellipse at 50% 50%, #0d111a 0%, #050608 100%)',
          border: '1px solid var(--color-glass-border)',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Subtle Background Grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255, 42, 66, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 42, 66, 0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            pointerEvents: 'none',
          }}
        />

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
            <NetworkIcon size={32} color="var(--color-crimson)" style={{ animation: 'spin 3s linear infinite' }} />
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}>
              Synthesizing Graph Connections & Vector Projections...
            </span>
          </div>
        ) : (
          <svg
            ref={svgRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
            <defs>
              {/* Arrow Markers for Directed Edges */}
              <marker
                id="arrowhead-default"
                markerWidth="8"
                markerHeight="8"
                refX="22"
                refY="4"
                orient="auto"
              >
                <polygon points="0 0, 8 4, 0 8" fill="rgba(255, 255, 255, 0.3)" />
              </marker>
              <marker
                id="arrowhead-highlight"
                markerWidth="10"
                markerHeight="10"
                refX="24"
                refY="4"
                orient="auto"
              >
                <polygon points="0 0, 8 4, 0 8" fill="#FF2A42" />
              </marker>

              {/* Node Glow Filters */}
              <filter id="crimson-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Render Edges */}
              {filteredEdges.map(edge => {
                const sourceNode = graphData?.nodes.find(n => n.id === edge.source);
                const targetNode = graphData?.nodes.find(n => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                const isPathActive = pathEdgeIds.has(edge.id);
                const isConnectedToSelected =
                  selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);

                return (
                  <g key={edge.id}>
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={
                        isPathActive
                          ? '#FF2A42'
                          : isConnectedToSelected
                          ? 'rgba(255, 255, 255, 0.8)'
                          : 'rgba(255, 255, 255, 0.12)'
                      }
                      strokeWidth={isPathActive ? 3 : isConnectedToSelected ? 2 : 1}
                      strokeDasharray={edge.isAiInferred ? '4,4' : undefined}
                      markerEnd={isPathActive ? 'url(#arrowhead-highlight)' : 'url(#arrowhead-default)'}
                    />

                    {/* Edge Label */}
                    <text
                      x={(sourceNode.x + targetNode.x) / 2}
                      y={(sourceNode.y + targetNode.y) / 2 - 6}
                      fill={isPathActive ? '#FF2A42' : 'rgba(255, 255, 255, 0.4)'}
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      style={{ pointerEvents: 'none' }}
                    >
                      {(edge.relationship || edge.relationshipType || 'CONNECTED_TO').replace(/_/g, ' ')}
                    </text>
                  </g>
                );
              })}

              {/* Render Nodes */}
              {filteredNodes.map(node => {
                const isSelected = selectedNode?.id === node.id;
                const isSearchMatch = highlightedNodeIds.has(node.id);
                const isPathEndpoint = pathStartNode === node.id || pathEndNode === node.id;
                const nodeColor = getNodeColor(node.type);
                const nSize = node.size || node.radius || 24;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x ?? 500}, ${node.y ?? 350})`}
                    onClick={e => handleNodeClick(node, e)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Glowing outer circle if active */}
                    {(isSelected || isSearchMatch || isPathEndpoint) && (
                      <circle
                        r={nSize + 8}
                        fill="none"
                        stroke={nodeColor}
                        strokeWidth="2"
                        opacity="0.8"
                        filter="url(#crimson-glow)"
                      />
                    )}

                    {/* Main Node Body */}
                    <circle
                      r={nSize}
                      fill="#0C0E14"
                      stroke={nodeColor}
                      strokeWidth={isSelected ? 3 : 2}
                    />

                    {/* Small inner indicator for AI inferred */}
                    {node.isAiInferred && (
                      <circle
                        r={4}
                        cx={nSize * 0.7}
                        cy={-nSize * 0.7}
                        fill="#FF2A42"
                      />
                    )}

                    {/* Node Label */}
                    <text
                      y={nSize + 14}
                      fill="var(--color-text-primary)"
                      fontSize="11"
                      fontWeight="600"
                      textAnchor="middle"
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.label}
                    </text>

                    {node.subLabel && (
                      <text
                        y={nSize + 26}
                        fill="var(--color-text-muted)"
                        fontSize="9"
                        textAnchor="middle"
                        style={{ pointerEvents: 'none' }}
                      >
                        {node.subLabel}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Tactical Legend & Hint Overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: 'rgba(10, 12, 16, 0.85)',
            border: '1px solid var(--color-glass-border)',
            borderRadius: '8px',
            padding: '10px 14px',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '11px',
            color: 'var(--color-text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            <span>Graph Legend</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px 12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF2A42' }} /> Person
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38BDF8' }} /> Case
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#A855F7' }} /> Vehicle
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} /> Location
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} /> Evidence
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06B6D4' }} /> Call
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F97316' }} /> Trans.
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E11D48' }} /> Incident
            </span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '4px' }}>
            Tip: Hold <kbd style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '1px 4px', borderRadius: '2px' }}>Alt</kbd> and click two nodes to find the shortest connection path.
          </div>
        </div>
      </div>

      {/* Node Detail Side Drawer */}
      <Drawer
        isOpen={!!selectedNode}
        onClose={() => setSelectedNode(null)}
        title={selectedNode ? `${selectedNode.type}: ${selectedNode.label}` : ''}
        size="medium"
      >
        {selectedNode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Classification & Confidence Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Badge
                variant={
                  selectedNode.type === 'PERSON'
                    ? 'crimson'
                    : selectedNode.type === 'CASE'
                    ? 'info'
                    : 'default'
                }
              >
                {selectedNode.type}
              </Badge>

              {selectedNode.isAiInferred ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Badge variant="crimson">AI INFERRED</Badge>
                  {selectedNode.confidence && (
                    <span style={{ fontSize: '11px', color: 'var(--color-crimson)', fontWeight: 700 }}>
                      {Math.round(selectedNode.confidence * 100)}% Conf.
                    </span>
                  )}
                </div>
              ) : (
                <Badge variant="success">HUMAN VERIFIED</Badge>
              )}
            </div>

            {/* Sub-label & Description */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--color-text-primary)' }}>
                {selectedNode.label}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
                {selectedNode.subLabel || 'Entity registered in crime intelligence database.'}
              </p>
            </div>

            {/* Direct Connected Relationships */}
            <div>
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
                Connected Relationships
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {graphData?.edges
                  .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                  .map(e => {
                    const isSource = e.source === selectedNode.id;
                    const neighborId = isSource ? e.target : e.source;
                    const neighbor = graphData.nodes.find(n => n.id === neighborId);
                    if (!neighbor) return null;

                    return (
                      <div
                        key={e.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--color-glass-border)',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedNode(neighbor)}
                      >
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {neighbor.label}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                            {(e.relationship || e.relationshipType || 'CONNECTED_TO').replace(/_/g, ' ')} • {neighbor.type}
                          </div>
                        </div>

                        <ArrowRightIcon size={14} color="var(--color-crimson)" />
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '16px', borderTop: '1px solid var(--color-glass-border)' }}>
              {selectedNode.type === 'PERSON' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setSelectedNode(null);
                    navigateTo('person-profile', { personId: selectedNode.id });
                  }}
                >
                  View Full Person Dossier
                </Button>
              )}

              {selectedNode.type === 'CASE' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setSelectedNode(null);
                    navigateTo('case-detail', { caseId: selectedNode.id });
                  }}
                >
                  Open Case File
                </Button>
              )}

              <Button
                variant="secondary"
                onClick={() => {
                  setHighlightedNodeIds(new Set([selectedNode.id]));
                }}
              >
                Highlight in Graph
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
