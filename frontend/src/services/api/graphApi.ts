// ============================================================================
// CrimeMind Graph API Service
// File: graphApi.ts
// ============================================================================

import { GraphData } from '../../types';
import { api } from './apiClient';
import { initialGraphData } from '../../utils/mockData';

export function normalizeGraphData(data: GraphData): GraphData {
  if (!data || !data.nodes || data.nodes.length === 0) {
    return initialGraphData;
  }

  const nodes = data.nodes.map((node, index, arr) => {
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

  const edges = (data.edges || []).map(edge => ({
    ...edge,
    relationship: edge.relationship || edge.relationshipType || 'CONNECTED_TO',
    relationshipType: edge.relationshipType || edge.relationship || 'CONNECTED_TO',
  }));

  return { nodes, edges };
}

export const graphApi = {
  // GET /api/graph/:caseId
  async getGraphData(caseId?: string): Promise<GraphData> {
    try {
      const endpoint = caseId && caseId !== 'all' ? `/graph/${caseId}` : '/graph';
      const result = await api.get<GraphData>(endpoint);
      return normalizeGraphData(result);
    } catch {
      if (!caseId || caseId === 'all') {
        return normalizeGraphData(initialGraphData);
      }
      // Filter graph around the specified case
      const connectedNodeIds = new Set<string>([caseId]);
      initialGraphData.edges.forEach(e => {
        if (e.source === caseId) connectedNodeIds.add(e.target);
        if (e.target === caseId) connectedNodeIds.add(e.source);
      });

      // If no edges matched this specific caseId, return full graph so graph is never blank
      if (connectedNodeIds.size <= 1) {
        return normalizeGraphData(initialGraphData);
      }

      return normalizeGraphData({
        nodes: initialGraphData.nodes.filter(n => connectedNodeIds.has(n.id)),
        edges: initialGraphData.edges.filter(e => connectedNodeIds.has(e.source) && connectedNodeIds.has(e.target)),
      });
    }
  },

  // Alias for RelationshipGraphPage
  async getCaseGraph(caseId?: string): Promise<GraphData> {
    return graphApi.getGraphData(caseId);
  },

  // Alias for getAll
  async getAll(): Promise<GraphData> {
    return graphApi.getGraphData();
  }
};
