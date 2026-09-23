/**
 * Phase 3 Unit Tests: Entity Resolution Engine
 */

import { EntityResolver } from '../../packages/graph/entityResolver.ts';
import { OntologyNode } from '../../packages/graph/ontology.ts';

export async function runEntityResolverTests(): Promise<{ passed: number; failed: number }> {
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

  console.log('\n--- 12. Running Entity Resolution Unit Tests ---');

  // Test 1: String similarity function
  assert(EntityResolver.calculateStringSimilarity('CNC Machine #1', 'CNC Machine #1') === 1.0, 'Identical strings return 1.0 similarity');
  assert(EntityResolver.calculateStringSimilarity('Hermle C42U', 'Hermle C42-U') > 0.85, 'Fuzzy spelling variation exceeds 0.85 similarity');
  assert(EntityResolver.calculateStringSimilarity('Lathe Machine', 'Forklift Truck') < 0.3, 'Distinct strings return low similarity');

  // Existing node in DB (from ERP)
  const existingNode: OntologyNode = {
    id: 'node_erp_cnc_01',
    tenantId: 'tenant_res_test',
    canonicalId: 'EQ-CNC-001',
    entityType: 'Machine',
    category: 'ASSET',
    name: 'Hermle C42U 5-Axis Milling Center',
    attributes: { asset_tag: 'TAG-CNC-001', maxRPM: 18000, erpCode: 'ERP-7788' },
    sourceRefs: [{ sourceId: 'SAP_ERP', externalId: 'EQ-CNC-001', confidence: 1.0 }],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Test 2: Exact Match via Asset Tag (Criteria: Merge 2 different sources for same equipment)
  // Source 2: CMMS system with slightly different name but identical asset tag
  const cmmsInput = {
    tenantId: 'tenant_res_test',
    canonicalId: 'CMMS-WO-CNC01',
    name: 'C42U Hermle Milling Machine',
    entityType: 'Machine' as const,
    category: 'ASSET' as const,
    attributes: { asset_tag: 'TAG-CNC-001', lastLubrication: '2026-08-15' },
    sourceRefs: [{ sourceId: 'MAXIMO_CMMS', externalId: 'CMMS-WO-CNC01', confidence: 0.95 }],
  };

  const resolve1 = EntityResolver.resolve([existingNode], cmmsInput);
  assert(resolve1.action === 'MERGED_AUTOMATIC', 'Resolved exact asset tag to MERGED_AUTOMATIC');
  assert(resolve1.confidence >= 0.95, 'High confidence score (>= 0.95) for matching asset tag');
  assert(resolve1.node.version === 2, 'Version incremented to 2 after deterministic merge');
  assert((resolve1.node.attributes as any).lastLubrication === '2026-08-15', 'Merged attributes from CMMS into ERP node');
  assert((resolve1.node.attributes as any).maxRPM === 18000, 'Retained existing ERP attributes in merged node');
  assert(resolve1.node.sourceRefs.length === 2, 'Maintains multi-source references (SAP_ERP + MAXIMO_CMMS)');

  // Test 3: Ambiguous match (< 0.80) strictly routes to Human Review Queue!
  // "لا تدمج كيانات بثقة منخفضة تلقائيًا"
  const ambiguousInput = {
    tenantId: 'tenant_res_test',
    canonicalId: 'SCADA_UNKNOWN_MILL',
    name: 'Hermle Milling Center', // Fuzzy similarity ~ 0.70, no asset tag
    entityType: 'Machine' as const,
    category: 'ASSET' as const,
    attributes: { currentLoadKW: 22.4 },
  };

  const resolve2 = EntityResolver.resolve([existingNode], ambiguousInput);
  assert(resolve2.action === 'QUEUED_FOR_REVIEW', 'Ambiguous match strictly routed to QUEUED_FOR_REVIEW');
  assert(resolve2.confidence >= 0.50 && resolve2.confidence < 0.80, 'Confidence is between 0.50 and 0.80');
  assert(resolve2.reviewItem !== undefined, 'Generated HumanReviewItem');
  assert(resolve2.reviewItem?.status === 'PENDING', 'HumanReviewItem has status PENDING');

  // Test 4: Completely distinct entity creates new node
  const distinctInput = {
    tenantId: 'tenant_res_test',
    canonicalId: 'CONVEYOR-BELT-09',
    name: 'Continuous Belt Conveyor 9',
    entityType: 'Machine' as const,
    category: 'ASSET' as const,
    attributes: { speedMPS: 1.5 },
  };

  const resolve3 = EntityResolver.resolve([existingNode], distinctInput);
  assert(resolve3.action === 'CREATED_NEW', 'Distinct entity returns CREATED_NEW');
  assert(resolve3.confidence === 1.0, 'Created new node with confidence 1.0');
  assert(resolve3.node.version === 1, 'New node initialized at version 1');

  return { passed, failed };
}
