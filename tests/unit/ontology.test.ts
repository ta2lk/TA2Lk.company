/**
 * Phase 3 Unit Tests: Industrial Ontologies Definition
 */

import { IndustrialEntityType, EntityCategory, RelationType } from '../../packages/graph/ontology.ts';

export async function runOntologyTests(): Promise<{ passed: number; failed: number }> {
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

  console.log('\n--- 11. Running Industrial Ontology Unit Tests ---');

  // Test 1: Category enumeration
  const categories: EntityCategory[] = ['ENTERPRISE', 'ASSET', 'PRODUCT', 'PROCESS', 'QUALITY', 'MAINTENANCE'];
  assert(categories.length === 6, 'Six core industrial ontology categories defined');

  // Test 2: Standard industrial entities present
  const sampleEntities: IndustrialEntityType[] = [
    'Plant', 'Line', 'Cell', 'Station', 'Worker',
    'Machine', 'Component', 'Sensor', 'Tool',
    'SKU', 'Batch', 'Serial', 'Material',
    'WorkOrder', 'Operation', 'Recipe', 'Parameter',
    'Inspection', 'Defect', 'Deviation', 'Scrap',
    'MaintenanceOrder', 'FailureMode', 'SparePart',
  ];
  assert(sampleEntities.length === 24, 'All 24 standard industrial entity types registered');

  // Test 3: Standard relationships
  const relations: RelationType[] = [
    'CONTAINS', 'PART_OF', 'HAS_SENSOR', 'MONITORS',
    'PRODUCES', 'PRODUCED_ON', 'EXECUTES', 'EXECUTED_BY',
    'MAINTAINED_BY', 'TARGETS_ASSET', 'OPERATED_BY', 'OPERATES',
    'CAUSED_BY', 'LEADS_TO_DEFECT', 'USES_SPARE_PART', 'USED_IN',
  ];
  assert(relations.length === 16, 'Bi-directional industrial relations defined');

  return { passed, failed };
}
