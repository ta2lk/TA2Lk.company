/**
 * Phase 4 Integration Tests: Hybrid Search & Context Engine
 * Validates all 5 Acceptance Criteria from Master Build Plan
 */

import { HybridSearchEngine } from '../../packages/search/hybridSearch.ts';
import { ContextAssembler } from '../../packages/search/contextAssembler.ts';
import { IndustrialDocumentChunker } from '../../packages/search/documentChunker.ts';
import { GraphStore } from '../../packages/graph/graphStore.ts';
import { IndustrialDocument } from '../../packages/search/types.ts';
import { OntologyNode } from '../../packages/graph/ontology.ts';

export async function runHybridSearchIntegrationTests(): Promise<{ passed: number; failed: number }> {
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

  console.log('\n--- 18. Running Hybrid Search & Context Integration Tests (All Criteria) ---');

  const graph = new GraphStore();
  const searchEngine = new HybridSearchEngine(graph);

  const tenantAlpha = `org_alpha_phase4_${Date.now()}`;
  const tenantBeta = `org_beta_phase4_${Date.now()}`;

  // 1. Setup Knowledge Graph in Tenant Alpha
  const machineNode: OntologyNode = {
    id: `node_mach_${tenantAlpha}`,
    tenantId: tenantAlpha,
    canonicalId: 'CNC-5AXIS-03',
    entityType: 'Machine',
    category: 'ASSET',
    name: 'Hermle C42U 5-Axis Milling Center',
    attributes: { model: 'C42U Dynamic', spindleRPM: 18000 },
    sourceRefs: [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  graph.addNode(machineNode);

  // 2. Ingest Technical Manual into Tenant Alpha
  const manualDoc: IndustrialDocument = {
    id: `doc_manual_${tenantAlpha}`,
    tenantId: tenantAlpha,
    title: 'Hermle C42U 5-Axis Milling Center Operations & Alarm Guide',
    docType: 'MANUAL',
    sourceFile: 'C42U_Manual.pdf',
    mimeType: 'application/pdf',
    content: `# Hermle C42U 5-Axis Milling Center Manual

## Alarm Code Diagnostic Table
| Error Code | Fault Description | Action Required |
| --- | --- | --- |
| E-4012 | Spindle Bearing Over-Temperature (>68°C) | Emergency Halt. Inspect chiller delivery circuit at 4.2 bar |
| E-4015 | Hydraulic Clamping Pressure Fault (<180 bar) | Abort tool change. Inspect valve PV-02 |

## Spindle Operating Limits
Maximum spindle speed is 18000 RPM. Always verify coolant flow before high-speed contouring.`,
    metadata: { author: 'Hermle AG' },
    linkedEntityIds: [machineNode.id],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const chunks = IndustrialDocumentChunker.chunkDocument(manualDoc, {
    knownEntityCanonicalIds: ['CNC-5AXIS-03'],
  });
  searchEngine.addDocument(manualDoc, chunks);

  // =========================================================================
  // CRITERION 1: Searching error code "E-4012" returns the correct document with 100% precision
  // =========================================================================
  const errorSearchResult = searchEngine.search('E-4012', tenantAlpha);
  assert(errorSearchResult.totalHits > 0, '[Criterion 1] Error code search returned hits');
  assert(errorSearchResult.results[0].document.id === manualDoc.id, '[Criterion 1] Returned the exact technical document');
  assert(
    errorSearchResult.results[0].chunk.errorCodes.includes('E-4012'),
    '[Criterion 1] Top chunk explicitly contains error code E-4012 with 100% precision'
  );

  // =========================================================================
  // CRITERION 2: Hybrid search retrieval (Graph + Vectors + BM25) executes in < 200ms
  // =========================================================================
  const hybridResult = searchEngine.search('spindle bearing temperature limit', tenantAlpha, {
    targetEntityId: machineNode.id,
    topK: 5,
  });
  assert(hybridResult.totalHits > 0, '[Criterion 2] Hybrid search found relevant results');
  assert(
    hybridResult.executionTimeMs < 200,
    `[Criterion 2] Hybrid retrieval executed in ${hybridResult.executionTimeMs}ms (< 200ms target)`
  );
  assert(
    hybridResult.results[0].rrfScore > 0,
    `[Criterion 2] Results scored and ranked via Reciprocal Rank Fusion (RRF: ${hybridResult.results[0].rrfScore})`
  );

  // =========================================================================
  // CRITERION 3: Link chunk to specific machine in Knowledge Graph
  // =========================================================================
  const linkedChunk = chunks.find((c) => c.linkedEntityIds.includes(machineNode.id));
  assert(linkedChunk !== undefined, '[Criterion 3] Document chunk successfully linked to Machine entity');
  assert(linkedChunk?.documentId === manualDoc.id, '[Criterion 3] Linked chunk maintains parent document provenance');

  // =========================================================================
  // CRITERION 4: Strict tenant isolation for documents
  // =========================================================================
  // Tenant Beta searching for "E-4012" or "Hermle" must return exactly 0 hits!
  const tenantBetaResult = searchEngine.search('E-4012', tenantBeta);
  assert(
    tenantBetaResult.totalHits === 0 && tenantBetaResult.results.length === 0,
    '[Criterion 4] Tenant Beta search strictly returns ZERO results from Tenant Alpha documents'
  );

  const tenantBetaDocs = searchEngine.getDocumentsForTenant(tenantBeta);
  assert(tenantBetaDocs.length === 0, '[Criterion 4] Tenant Beta has 0 accessible documents');

  // =========================================================================
  // CRITERION 5: Context Assembler (< 200ms full dossier assembly)
  // =========================================================================
  const assembledContext = ContextAssembler.assembleContext(
    'E-4012 spindle alarm',
    tenantAlpha,
    searchEngine,
    graph,
    machineNode.id
  );
  assert(assembledContext.relevantChunks.length > 0, '[Criterion 5] Assembled operational context includes relevant manual chunks');
  assert(assembledContext.entityDossier !== null, '[Criterion 5] Assembled context includes physical asset topology');
  assert(assembledContext.executionTimeMs < 200, `[Criterion 5] Full context assembly completed in ${assembledContext.executionTimeMs}ms (< 200ms)`);
  assert(assembledContext.assembledPromptContext.includes('E-4012'), '[Criterion 5] Assembled prompt contains diagnostic details');

  return { passed, failed };
}
