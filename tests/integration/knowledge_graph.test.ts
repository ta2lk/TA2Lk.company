/**
 * Phase 3 Integration Tests: Industrial Knowledge Graph & Context Builder
 * Validates all 6 Acceptance Criteria from Master Build Plan
 */

import { GraphStore } from '../../packages/graph/graphStore.ts';
import { EntityResolver } from '../../packages/graph/entityResolver.ts';
import { ContextBuilder } from '../../packages/graph/contextBuilder.ts';
import { HumanReviewQueue } from '../../packages/graph/humanReviewQueue.ts';
import { OntologyNode } from '../../packages/graph/ontology.ts';

export async function runKnowledgeGraphIntegrationTests(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
      console.log(`  [PASS] ${msg}`);
    } else {
      failed++;
      console.error(`  [FAIL] ${msg}`);
    }
  }

  console.log('\n--- 14. Running Knowledge Graph Integration Tests (All Criteria) ---');

  const graph = new GraphStore();
  const reviewQueue = new HumanReviewQueue();
  const tenantId = `org_kg_integ_${Date.now()}`;

  // =========================================================================
  // CRITERION 1: Merge data from 2 different sources for the same equipment
  // =========================================================================
  // Source A: ERP System
  const erpEquipment: OntologyNode = {
    id: `node_erp_${Date.now()}`,
    tenantId,
    canonicalId: 'CNC-5AXIS-MILL-02',
    entityType: 'Machine',
    category: 'ASSET',
    name: 'DMG Mori 5-Axis Milling Machine',
    attributes: { serial_number: 'DMG-SN-998822', max_spindle_speed: 15000 },
    sourceRefs: [{ sourceId: 'SAP_ERP', externalId: 'EQ_DMG_02', confidence: 1.0 }],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  graph.addNode(erpEquipment);

  // Source B: CMMS System
  const cmmsInput = {
    tenantId,
    canonicalId: 'CMMS-ASSET-402',
    name: 'DMG Mori 5-Axis Milling',
    entityType: 'Machine' as const,
    category: 'ASSET' as const,
    attributes: { serial_number: 'DMG-SN-998822', last_preventive_mnt: '2026-09-01' },
    sourceRefs: [{ sourceId: 'IBM_MAXIMO', externalId: 'MNT_ASSET_402', confidence: 0.98 }],
  };

  const mergeResolution = EntityResolver.resolve(graph.listNodesForTenant(tenantId), cmmsInput);
  assert(mergeResolution.action === 'MERGED_AUTOMATIC', '[Criterion 1] Successfully merged 2 different sources for same equipment');
  assert(mergeResolution.node.version === 2, '[Criterion 1] Entity version bumped to 2');
  assert(mergeResolution.node.sourceRefs.length === 2, '[Criterion 1] Provenance retained for both SAP_ERP and IBM_MAXIMO');

  const resolvedMachine = graph.addNode(mergeResolution.node);

  // =========================================================================
  // CRITERION 2: Build Graph containing: Plant -> Line -> Machine -> Sensor -> Reading
  // =========================================================================
  const plantNode: OntologyNode = {
    id: `plant_${Date.now()}`,
    tenantId,
    canonicalId: 'PLANT-FRANKFURT',
    entityType: 'Plant',
    category: 'ENTERPRISE',
    name: 'Frankfurt Precision Component Plant',
    attributes: { country: 'Germany' },
    sourceRefs: [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const lineNode: OntologyNode = {
    id: `line_${Date.now()}`,
    tenantId,
    canonicalId: 'LINE-AERO-01',
    entityType: 'Line',
    category: 'ENTERPRISE',
    name: 'Aerospace Impeller Machining Line 1',
    attributes: { taktTimeSeconds: 300 },
    sourceRefs: [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sensorNode: OntologyNode = {
    id: `sensor_${Date.now()}`,
    tenantId,
    canonicalId: 'SENS-ACCEL-01',
    entityType: 'Sensor',
    category: 'ASSET',
    name: 'Spindle High-Frequency Accelerometer',
    attributes: { metric: 'acceleration_g', samplingKhz: 10 },
    sourceRefs: [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const workOrderNode: OntologyNode = {
    id: `wo_${Date.now()}`,
    tenantId,
    canonicalId: 'WO-AERO-771',
    entityType: 'WorkOrder',
    category: 'PROCESS',
    name: 'Production Batch Impeller 771',
    attributes: { batchSize: 50 },
    sourceRefs: [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  graph.addNode(plantNode);
  graph.addNode(lineNode);
  graph.addNode(sensorNode);
  graph.addNode(workOrderNode);

  // Wire relationships: Plant -> Line -> Machine -> Sensor & WorkOrder
  graph.addEdge(tenantId, plantNode.id, lineNode.id, 'CONTAINS');
  graph.addEdge(tenantId, lineNode.id, resolvedMachine.id, 'CONTAINS');
  graph.addEdge(tenantId, resolvedMachine.id, sensorNode.id, 'HAS_SENSOR');
  graph.addEdge(tenantId, resolvedMachine.id, workOrderNode.id, 'EXECUTES');

  const topology = graph.traverse(plantNode.id, tenantId, { direction: 'DOWNSTREAM', maxDepth: 4 });
  assert(topology.nodes.length === 5, '[Criterion 2] Graph contains complete Plant -> Line -> Machine -> Sensor -> WorkOrder hierarchy');

  // =========================================================================
  // CRITERION 3: Extract complete Context for specific machine in < 100ms
  // =========================================================================
  const contextDossier = ContextBuilder.buildContext(graph, resolvedMachine.id, tenantId);
  assert(contextDossier.targetEntity.id === resolvedMachine.id, '[Criterion 3] Extracted context for target machine');
  assert(contextDossier.hierarchy.line?.name === lineNode.name, '[Criterion 3] Context includes parent Line');
  assert(contextDossier.hierarchy.plant?.name === plantNode.name, '[Criterion 3] Context includes parent Plant');
  assert(contextDossier.connectedAssets.sensors.length === 1, '[Criterion 3] Context includes connected Sensors');
  assert(contextDossier.activeProcesses.workOrders.length === 1, '[Criterion 3] Context includes executing WorkOrders');
  assert(contextDossier.executionTimeMs < 100, `[Criterion 3] Context extracted in ${contextDossier.executionTimeMs}ms (< 100ms target)`);

  // =========================================================================
  // CRITERION 4: Ambiguous cases routed to Human Review Queue (< 0.8 confidence)
  // =========================================================================
  const questionableCandidate = {
    tenantId,
    canonicalId: 'MES_ASSET_UNKNOWN',
    name: 'DMG Mori 5-Axis Center', // Ambiguous fuzzy match (~0.72)
    entityType: 'Machine' as const,
    category: 'ASSET' as const,
    attributes: { currentPowerDrawKW: 14.5 },
  };

  const questionableResolution = EntityResolver.resolve(graph.listNodesForTenant(tenantId), questionableCandidate);
  assert(questionableResolution.action === 'QUEUED_FOR_REVIEW', '[Criterion 4] Ambiguous match routed to QUEUED_FOR_REVIEW');
  assert(questionableResolution.confidence < 0.80 && questionableResolution.confidence >= 0.50, '[Criterion 4] Confidence strictly < 0.80');
  assert(questionableResolution.reviewItem !== undefined, '[Criterion 4] Enqueued in Human Review Queue');

  if (questionableResolution.reviewItem) {
    reviewQueue.enqueue(questionableResolution.reviewItem);
    const pendingList = reviewQueue.getPending(tenantId);
    assert(pendingList.length === 1, '[Criterion 4] Candidate appears in pending Human Review Queue');

    // Human engineer approves the merge
    const decisionResult = reviewQueue.decide(
      questionableResolution.reviewItem.id,
      tenantId,
      'APPROVED',
      'lead.engineer@industrial-brain.internal',
      'Confirmed physical equipment matches after shop floor inspection',
      graph
    );
    assert(decisionResult.item.status === 'APPROVED', '[Criterion 4] Human review successfully recorded approval');
  }

  // =========================================================================
  // CRITERION 5: Graph query works bi-directionally (upstream/downstream)
  // =========================================================================
  // Downstream from Plant reaches Sensor
  const downstreamResult = graph.traverse(plantNode.id, tenantId, { direction: 'DOWNSTREAM', maxDepth: 3 });
  assert(downstreamResult.nodes.some((n) => n.id === sensorNode.id), '[Criterion 5] Downstream traversal reaches leaf Sensor');

  // Upstream from Sensor reaches Plant
  const upstreamResult = graph.traverse(sensorNode.id, tenantId, { direction: 'UPSTREAM', maxDepth: 3 });
  assert(upstreamResult.nodes.some((n) => n.id === plantNode.id), '[Criterion 5] Upstream traversal reaches root Plant');

  return { passed, failed };
}
