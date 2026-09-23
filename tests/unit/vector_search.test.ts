/**
 * Phase 4 Unit Tests: Semantic Vector Search
 */

import { VectorEngine } from '../../packages/search/vectorEngine.ts';
import { DocumentChunk } from '../../packages/search/types.ts';

export async function runVectorSearchTests(): Promise<{ passed: number; failed: number }> {
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

  console.log('\n--- 17. Running Semantic Vector Search Unit Tests ---');

  // Test 1: Embedding generation
  const vec1 = VectorEngine.generateEmbedding('Spindle bearing overheating and thermal alarm');
  assert(vec1.length === 64, 'Embedding has correct 64-dimensional vector space');

  let norm = 0;
  for (const v of vec1) norm += v * v;
  assert(Math.abs(Math.sqrt(norm) - 1.0) < 0.01, 'Embedding vector is L2 normalized to unit length');

  // Test 2: Cosine Similarity
  const vecClose = VectorEngine.generateEmbedding('Spindle bearing temperature exceeded threshold');
  const vecDiff = VectorEngine.generateEmbedding('Forklift pallet driver battery replacement');

  const simClose = VectorEngine.cosineSimilarity(vec1, vecClose);
  const simDiff = VectorEngine.cosineSimilarity(vec1, vecDiff);

  assert(simClose > 0.4, 'Semantically related phrases have positive cosine similarity');
  assert(simClose > simDiff, 'Related text has significantly higher similarity than unrelated text');

  // Test 3: Search with Candidate Chunks
  const chunk: DocumentChunk = {
    id: 'chunk_v1',
    documentId: 'doc1',
    tenantId: 'tenant_vec_test',
    chunkIndex: 0,
    content: 'Spindle bearing overheating and thermal alarm in milling machine',
    errorCodes: [],
    technicalSpecs: {},
    linkedEntityIds: [],
    isTable: false,
    tokenCount: 15,
    checksum: 'c1',
    createdAt: new Date().toISOString(),
  };

  const results = VectorEngine.search('thermal fault in spindle', 'tenant_vec_test', [chunk]);
  assert(results.length >= 1, 'Vector search retrieved semantic candidate');
  assert(results.length > 0 && results[0].similarity > 0.0, 'Vector candidate has positive similarity score');

  return { passed, failed };
}
