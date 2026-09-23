/**
 * Phase 4 Unit Tests: BM25 Exact Keyword Search Engine
 */

import { BM25Engine } from '../../packages/search/bm25Engine.ts';
import { DocumentChunk } from '../../packages/search/types.ts';

export async function runBM25Tests(): Promise<{ passed: number; failed: number }> {
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

  console.log('\n--- 16. Running BM25 Exact Keyword Engine Unit Tests ---');

  const engine = new BM25Engine();
  const tenantA = 'org_bm25_test_a';
  const tenantB = 'org_bm25_test_b';

  const chunk1: DocumentChunk = {
    id: 'chunk_err_4012',
    documentId: 'doc_hermle_manual',
    tenantId: tenantA,
    chunkIndex: 0,
    content: 'Alarm E-4012: Spindle Bearing Over-Temperature (>68°C). Immediate action: Spindle Emergency Halt. Verify chiller at 4.2 bar.',
    errorCodes: ['E-4012'],
    technicalSpecs: { 'Pressure': '4.2 bar' },
    linkedEntityIds: ['CNC-5AXIS-03'],
    isTable: false,
    tokenCount: 25,
    checksum: 'hash1',
    createdAt: new Date().toISOString(),
  };

  const chunk2: DocumentChunk = {
    id: 'chunk_hydraulic',
    documentId: 'doc_hermle_manual',
    tenantId: tenantA,
    chunkIndex: 1,
    content: 'Alarm E-4015: Hydraulic Clamping Pressure Loss (<180 bar). Inspect proportional valve PV-02.',
    errorCodes: ['E-4015'],
    technicalSpecs: { 'Clamping Pressure': '180 bar' },
    linkedEntityIds: ['CNC-5AXIS-03'],
    isTable: false,
    tokenCount: 20,
    checksum: 'hash2',
    createdAt: new Date().toISOString(),
  };

  engine.indexChunk(chunk1);
  engine.indexChunk(chunk2);

  // Test 1: Exact error code "E-4012" search
  const hits1 = engine.search('E-4012', tenantA, [chunk1, chunk2]);
  assert(hits1.length > 0, 'Found hits for E-4012');
  assert(hits1[0].chunkId === 'chunk_err_4012', 'Rank #1 result is exact E-4012 chunk (100% precision)');
  assert(hits1[0].score > 40.0, 'Exact error code boost applied (> 40.0 BM25 score)');

  // Test 2: Case-insensitive token match
  const hitsCase = engine.search('e-4012', tenantA, [chunk1, chunk2]);
  assert(hitsCase[0].chunkId === 'chunk_err_4012', 'Case-insensitive search retrieves correct chunk');

  // Test 3: Technical keyword search
  const hitsHydraulic = engine.search('Hydraulic Clamping Pressure', tenantA, [chunk1, chunk2]);
  assert(hitsHydraulic[0].chunkId === 'chunk_hydraulic', 'Keyword query ranked chunk_hydraulic as top hit');

  // Test 4: Strict Tenant Isolation (Tenant B query returns 0 hits)
  const hitsTenantB = engine.search('E-4012', tenantB, [chunk1, chunk2]);
  assert(hitsTenantB.length === 0, 'Tenant B query strictly returns ZERO results from Tenant A');

  return { passed, failed };
}
