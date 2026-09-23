/**
 * Industrial Brain — Graph Storage & Traversal Engine
 * Phase 3: Entity Resolution & Knowledge Graph
 *
 * Implements bi-directional indexing, time-aware relationships,
 * strict multi-tenant isolation, and sub-millisecond graph queries.
 */

import crypto from 'crypto';
import { OntologyNode, OntologyEdge, RelationType, IndustrialEntityType } from './ontology.ts';

export interface TraversalStep {
  depth: number;
  node: OntologyNode;
  edge?: OntologyEdge;
  direction: 'UPSTREAM' | 'DOWNSTREAM';
}

export interface TraversalResult {
  rootNode: OntologyNode;
  nodes: OntologyNode[];
  edges: OntologyEdge[];
  steps: TraversalStep[];
  executionTimeMs: number;
}

export class GraphStore {
  private nodes: Map<string, OntologyNode> = new Map();
  private edges: Map<string, OntologyEdge> = new Map();

  // Bi-directional indices per tenant: tenantId -> nodeId -> edgeIds
  private outgoingIndex: Map<string, Map<string, Set<string>>> = new Map();
  private incomingIndex: Map<string, Map<string, Set<string>>> = new Map();

  public addNode(node: OntologyNode): OntologyNode {
    this.nodes.set(node.id, node);
    return node;
  }

  public getNode(nodeId: string, tenantId: string): OntologyNode | null {
    const node = this.nodes.get(nodeId);
    if (!node || node.tenantId !== tenantId) return null;
    return node;
  }

  public getNodeByCanonicalId(canonicalId: string, tenantId: string): OntologyNode | null {
    for (const node of this.nodes.values()) {
      if (node.tenantId === tenantId && node.canonicalId.toLowerCase() === canonicalId.toLowerCase()) {
        return node;
      }
    }
    return null;
  }

  public listNodesForTenant(tenantId: string, entityType?: IndustrialEntityType): OntologyNode[] {
    const results: OntologyNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.tenantId === tenantId) {
        if (!entityType || node.entityType === entityType) {
          results.push(node);
        }
      }
    }
    return results;
  }

  public addEdge(
    tenantId: string,
    sourceId: string,
    targetId: string,
    relationType: RelationType,
    options: {
      properties?: Record<string, unknown>;
      confidence?: number;
      validFrom?: string;
      validTo?: string | null;
    } = {}
  ): OntologyEdge {
    // Verify both source and target belong to the same tenant
    const src = this.getNode(sourceId, tenantId);
    const tgt = this.getNode(targetId, tenantId);

    if (!src || !tgt) {
      throw new Error(`Cannot create edge: source or target node does not exist in tenant ${tenantId}`);
    }

    const edge: OntologyEdge = {
      id: `edge_${crypto.randomBytes(8).toString('hex')}`,
      tenantId,
      sourceId,
      targetId,
      relationType,
      properties: options.properties || {},
      confidence: options.confidence ?? 1.0,
      validFrom: options.validFrom || new Date().toISOString(),
      validTo: options.validTo || null,
      createdAt: new Date().toISOString(),
    };

    this.edges.set(edge.id, edge);

    // Update outgoing index
    if (!this.outgoingIndex.has(tenantId)) this.outgoingIndex.set(tenantId, new Map());
    const tenantOut = this.outgoingIndex.get(tenantId)!;
    if (!tenantOut.has(sourceId)) tenantOut.set(sourceId, new Set());
    tenantOut.get(sourceId)!.add(edge.id);

    // Update incoming index
    if (!this.incomingIndex.has(tenantId)) this.incomingIndex.set(tenantId, new Map());
    const tenantIn = this.incomingIndex.get(tenantId)!;
    if (!tenantIn.has(targetId)) tenantIn.set(targetId, new Set());
    tenantIn.get(targetId)!.add(edge.id);

    return edge;
  }

  public listEdgesForTenant(tenantId: string): OntologyEdge[] {
    return Array.from(this.edges.values()).filter((e) => e.tenantId === tenantId);
  }

  /**
   * Bi-directional Graph Traversal with Cycle Detection and Time-Awareness
   */
  public traverse(
    startNodeId: string,
    tenantId: string,
    options: {
      direction?: 'UPSTREAM' | 'DOWNSTREAM' | 'BOTH';
      maxDepth?: number;
      relationTypes?: RelationType[];
      asOfTimestamp?: string;
    } = {}
  ): TraversalResult {
    const startTime = performance.now();
    const rootNode = this.getNode(startNodeId, tenantId);

    if (!rootNode) {
      throw new Error(`Node ${startNodeId} not found in tenant ${tenantId}`);
    }

    const direction = options.direction || 'DOWNSTREAM';
    const maxDepth = options.maxDepth ?? 3;
    const asOf = options.asOfTimestamp ? new Date(options.asOfTimestamp).getTime() : Date.now();

    const visitedNodes = new Set<string>([startNodeId]);
    const visitedEdges = new Set<string>();

    const collectedNodes: OntologyNode[] = [rootNode];
    const collectedEdges: OntologyEdge[] = [];
    const steps: TraversalStep[] = [{ depth: 0, node: rootNode, direction: 'DOWNSTREAM' }];

    // Queue of items to expand: { nodeId, currentDepth }
    const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: startNodeId, depth: 0 }];

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      const candidateEdgeIds: Array<{ edgeId: string; dir: 'UPSTREAM' | 'DOWNSTREAM'; nextNodeId: string }> = [];

      // Outgoing edges (Downstream)
      if (direction === 'DOWNSTREAM' || direction === 'BOTH') {
        const outSet = this.outgoingIndex.get(tenantId)?.get(nodeId);
        if (outSet) {
          for (const eid of outSet) {
            const edge = this.edges.get(eid);
            if (edge) candidateEdgeIds.push({ edgeId: eid, dir: 'DOWNSTREAM', nextNodeId: edge.targetId });
          }
        }
      }

      // Incoming edges (Upstream)
      if (direction === 'UPSTREAM' || direction === 'BOTH') {
        const inSet = this.incomingIndex.get(tenantId)?.get(nodeId);
        if (inSet) {
          for (const eid of inSet) {
            const edge = this.edges.get(eid);
            if (edge) candidateEdgeIds.push({ edgeId: eid, dir: 'UPSTREAM', nextNodeId: edge.sourceId });
          }
        }
      }

      for (const item of candidateEdgeIds) {
        const edge = this.edges.get(item.edgeId);
        if (!edge) continue;

        // Filter by relation types if specified
        if (options.relationTypes && !options.relationTypes.includes(edge.relationType)) {
          continue;
        }

        // Time-aware filtering: validFrom <= asOf && (!validTo || asOf <= validTo)
        const vFrom = new Date(edge.validFrom).getTime();
        const vTo = edge.validTo ? new Date(edge.validTo).getTime() : Infinity;
        if (asOf < vFrom || asOf > vTo) {
          continue;
        }

        if (!visitedEdges.has(edge.id)) {
          visitedEdges.add(edge.id);
          collectedEdges.push(edge);
        }

        if (!visitedNodes.has(item.nextNodeId)) {
          visitedNodes.add(item.nextNodeId);
          const nextNode = this.getNode(item.nextNodeId, tenantId);
          if (nextNode) {
            collectedNodes.push(nextNode);
            steps.push({
              depth: depth + 1,
              node: nextNode,
              edge,
              direction: item.dir,
            });
            queue.push({ nodeId: item.nextNodeId, depth: depth + 1 });
          }
        }
      }
    }

    const duration = performance.now() - startTime;

    return {
      rootNode,
      nodes: collectedNodes,
      edges: collectedEdges,
      steps,
      executionTimeMs: Math.round(duration * 100) / 100,
    };
  }

  public clearTenant(tenantId: string): void {
    for (const [id, node] of this.nodes.entries()) {
      if (node.tenantId === tenantId) this.nodes.delete(id);
    }
    for (const [id, edge] of this.edges.entries()) {
      if (edge.tenantId === tenantId) this.edges.delete(id);
    }
    this.outgoingIndex.delete(tenantId);
    this.incomingIndex.delete(tenantId);
  }
}

export const globalGraphStore = new GraphStore();
