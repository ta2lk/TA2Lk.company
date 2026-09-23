/**
 * Industrial Brain — Context Builder
 * Phase 3: Entity Resolution & Knowledge Graph
 *
 * Constructs a 360-degree operational context dossier for any industrial entity
 * in sub-10ms (strictly < 100ms per Phase 3 criteria).
 */

import { OntologyNode, OntologyEdge } from './ontology.ts';
import { GraphStore } from './graphStore.ts';

export interface EntityContextDossier {
  targetEntity: OntologyNode;
  tenantId: string;
  executionTimeMs: number;
  hierarchy: {
    plant?: OntologyNode;
    line?: OntologyNode;
    cell?: OntologyNode;
    station?: OntologyNode;
  };
  connectedAssets: {
    components: OntologyNode[];
    sensors: OntologyNode[];
    tools: OntologyNode[];
  };
  activeProcesses: {
    workOrders: OntologyNode[];
    products: OntologyNode[];
  };
  maintenanceHistory: {
    maintenanceOrders: OntologyNode[];
    failureModes: OntologyNode[];
    spareParts: OntologyNode[];
  };
  qualityRecords: {
    defects: OntologyNode[];
    inspections: OntologyNode[];
  };
  connectedEdges: OntologyEdge[];
  summaryNarrative: string;
}

export class ContextBuilder {
  /**
   * Builds complete 360-degree context for an entity in < 100ms
   */
  public static buildContext(
    graph: GraphStore,
    targetNodeId: string,
    tenantId: string
  ): EntityContextDossier {
    const startTime = performance.now();

    const target = graph.getNode(targetNodeId, tenantId);
    if (!target) {
      throw new Error(`Target entity '${targetNodeId}' not found in tenant '${tenantId}'`);
    }

    // Traverse bi-directionally up to 3 hops
    const traversal = graph.traverse(targetNodeId, tenantId, {
      direction: 'BOTH',
      maxDepth: 3,
    });

    const hierarchy: EntityContextDossier['hierarchy'] = {};
    const connectedAssets: EntityContextDossier['connectedAssets'] = {
      components: [],
      sensors: [],
      tools: [],
    };
    const activeProcesses: EntityContextDossier['activeProcesses'] = {
      workOrders: [],
      products: [],
    };
    const maintenanceHistory: EntityContextDossier['maintenanceHistory'] = {
      maintenanceOrders: [],
      failureModes: [],
      spareParts: [],
    };
    const qualityRecords: EntityContextDossier['qualityRecords'] = {
      defects: [],
      inspections: [],
    };

    for (const node of traversal.nodes) {
      if (node.id === targetNodeId) continue;

      switch (node.entityType) {
        case 'Plant':
          hierarchy.plant = node;
          break;
        case 'Line':
          hierarchy.line = node;
          break;
        case 'Cell':
          hierarchy.cell = node;
          break;
        case 'Station':
          hierarchy.station = node;
          break;
        case 'Component':
          connectedAssets.components.push(node);
          break;
        case 'Sensor':
          connectedAssets.sensors.push(node);
          break;
        case 'Tool':
          connectedAssets.tools.push(node);
          break;
        case 'WorkOrder':
          activeProcesses.workOrders.push(node);
          break;
        case 'SKU':
        case 'Batch':
        case 'Serial':
        case 'Material':
          activeProcesses.products.push(node);
          break;
        case 'MaintenanceOrder':
          maintenanceHistory.maintenanceOrders.push(node);
          break;
        case 'FailureMode':
          maintenanceHistory.failureModes.push(node);
          break;
        case 'SparePart':
          maintenanceHistory.spareParts.push(node);
          break;
        case 'Defect':
          qualityRecords.defects.push(node);
          break;
        case 'Inspection':
          qualityRecords.inspections.push(node);
          break;
      }
    }

    const duration = performance.now() - startTime;
    const executionTimeMs = Math.round(duration * 100) / 100;

    // Construct industrial summary narrative
    const lineName = hierarchy.line?.name || 'Unassigned Line';
    const plantName = hierarchy.plant?.name || 'Main Facility';
    const sensorsCount = connectedAssets.sensors.length;
    const woCount = activeProcesses.workOrders.length;
    const mntCount = maintenanceHistory.maintenanceOrders.length;

    const summaryNarrative = `${target.name} (${target.entityType}) located at ${plantName} // ${lineName}. Configured with ${sensorsCount} active sensors, executing ${woCount} work orders, with ${mntCount} logged maintenance events.`;

    return {
      targetEntity: target,
      tenantId,
      executionTimeMs,
      hierarchy,
      connectedAssets,
      activeProcesses,
      maintenanceHistory,
      qualityRecords,
      connectedEdges: traversal.edges,
      summaryNarrative,
    };
  }
}
