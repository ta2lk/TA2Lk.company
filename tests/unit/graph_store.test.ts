/**
 * Phase 3 Unit Tests: Graph Storage & Traversal Engine
 */

import { GraphStore } from '../../packages/graph/graphStore.ts';
import { OntologyNode } from '../../packages/graph/ontology.ts';

export async function runGraphStoreTests(): Promise<{ passed: number; failed: number }> {
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

  console.log('\n--- 13. Running Graph Storage & Traversal Unit Tests ---');

  const graph = new GraphStore();
  const tenantA = 'org_graph_unit_a';
  const tenantB = 'org_graph_unit_b';

  // Seed hierarchy in Tenant A: Plant -> Line -> Machine -> Sensor
  const plantA: OntologyNode = {
    id: 'node_p1',
    tenantId: tenantA,
    canonicalId: 'PLANT-A1',
    entityType: 'Plant',
    category: 'ENTERPRISE',
    name: 'Munich Assembly Facility',
    attributes: {},
    sourceRefs: [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const lineA: OntologyNode = {
    id: 'node_l1',
    tenantId: tenantA,
    canonicalId: 'LINE-A1',
    entityType: 'Line',
    category: 'ENTERPRISE',
    name: 'Chassis Welding Line',
    attributes: {},
    sourceRefs: [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const machineA: OntologyNode = {
    id: 'node_m1',
    tenantId: tenantA,
    canonicalId: 'ROBOT-WELD-01',
    entityType: 'Machine',
    category: 'ASSET',
    name: 'Kuka Spot Welding Robot',
    attributes: {},
    sourceRefs: [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sensorA: OntologyNode = {
    id: 'node_s1',
    tenantId: tenantA,
    canonicalId: 'SENS-CURRENT-01',
    entityType: 'Sensor',
    category: 'ASSET',
    name: 'Weld Tip Current Sensor',
    attributes: {},
    sourceRefs: [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  graph.addNode(plantA);
  graph.addNode(lineA);
  graph.addNode(machineA);
  graph.addNode(sensorA);

  graph.addEdge(tenantA, plantA.id, lineA.id, 'CONTAINS');
  graph.addEdge(tenantA, lineA.id, machineA.id, 'CONTAINS');
  graph.addEdge(tenantA, machineA.id, sensorA.id, 'HAS_SENSOR');

  // Test 1: Downstream traversal from Plant reaches Sensor
  const downTraversal = graph.traverse(plantA.id, tenantA, { direction: 'DOWNSTREAM', maxDepth: 3 });
  assert(downTraversal.nodes.length === 4, 'Downstream traversal reached all 4 nodes in hierarchy');
  assert(downTraversal.nodes.some((n) => n.id === sensorA.id), 'Sensor discovered downstream from Plant');

  // Test 2: Upstream traversal from Sensor reaches Plant
  const upTraversal = graph.traverse(sensorA.id, tenantA, { direction: 'UPSTREAM', maxDepth: 3 });
  assert(upTraversal.nodes.length === 4, 'Upstream traversal from Sensor climbed all the way to Plant');
  assert(upTraversal.nodes.some((n) => n.id === plantA.id), 'Plant discovered upstream from Sensor');

  // Test 3: Cycle detection (add circular edge Machine -> Line)
  graph.addEdge(tenantA, machineA.id, lineA.id, 'CONTAINS');
  let cycleHandledWithoutInfiniteLoop = true;
  try {
    const cycleTraversal = graph.traverse(plantA.id, tenantA, { direction: 'BOTH', maxDepth: 10 });
    assert(cycleTraversal.nodes.length === 4, 'Cycle detected and handled without infinite loop');
  } catch {
    cycleHandledWithoutInfiniteLoop = false;
  }
  assert(cycleHandledWithoutInfiniteLoop, 'Graph traversal safely terminates on cyclic graphs');

  // Test 4: Time-Awareness (Expired relationship is excluded from traversal)
  const expiredEdge = graph.addEdge(tenantA, machineA.id, sensorA.id, 'MONITORS', {
    validFrom: '2024-01-01T00:00:00Z',
    validTo: '2024-12-31T23:59:59Z', // Expired in 2024!
  });

  const currentTimeTraversal = graph.traverse(machineA.id, tenantA, {
    direction: 'DOWNSTREAM',
    relationTypes: ['MONITORS'],
    asOfTimestamp: '2026-09-23T00:00:00Z',
  });
  assert(currentTimeTraversal.edges.length === 0, 'Expired relationship excluded by time-awareness at current time');

  const historicalTimeTraversal = graph.traverse(machineA.id, tenantA, {
    direction: 'DOWNSTREAM',
    relationTypes: ['MONITORS'],
    asOfTimestamp: '2024-06-01T00:00:00Z',
  });
  assert(historicalTimeTraversal.edges.length === 1, 'Historical relationship active when querying 2024 timestamp');

  // Test 5: Strict Multi-Tenant Isolation
  // Tenant B cannot traverse or access Tenant A nodes
  let tenantBCaught = false;
  try {
    graph.traverse(plantA.id, tenantB);
  } catch (err) {
    tenantBCaught = (err as Error).message.includes('not found in tenant');
  }
  assert(tenantBCaught, 'Tenant B strictly prevented from querying Tenant A graph');

  return { passed, failed };
}
