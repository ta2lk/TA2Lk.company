/**
 * Industrial Brain — Master Acceptance Test Runner
 * Executes all Phase 1, Phase 2, Phase 3 & Phase 4 Verification Suites
 */

import { runAuthTests } from './unit/auth.test.ts';
import { runRbacTests } from './unit/rbac.test.ts';
import { runTenantIsolationTests } from './integration/tenant_isolation.test.ts';
import { runAuditTests } from './integration/audit.test.ts';
import { runHealthTests } from './integration/health.test.ts';
import { runCsvEngineTests } from './unit/csv_engine.test.ts';
import { runExcelEngineTests } from './unit/excel_engine.test.ts';
import { runPostgresEngineTests } from './unit/postgres_engine.test.ts';
import { runRestEngineTests } from './unit/rest_engine.test.ts';
import { runIngestionPipelineTests } from './integration/ingestion_pipeline.test.ts';
import { runOntologyTests } from './unit/ontology.test.ts';
import { runEntityResolverTests } from './unit/entity_resolver.test.ts';
import { runGraphStoreTests } from './unit/graph_store.test.ts';
import { runKnowledgeGraphIntegrationTests } from './integration/knowledge_graph.test.ts';
import { runChunkerTests } from './unit/chunker.test.ts';
import { runBM25Tests } from './unit/bm25.test.ts';
import { runVectorSearchTests } from './unit/vector_search.test.ts';
import { runHybridSearchIntegrationTests } from './integration/hybrid_search.test.ts';
import { runCorrelationEngineTests } from './unit/correlation_engine.test.ts';
import { runRCAEngineUnitTests } from './unit/rca_engine.test.ts';
import { runReasoningIntegrationTests } from './integration/reasoning.test.ts';
import { runGuardrailUnitTests } from './unit/guardrails.test.ts';
import { runDispatcherUnitTests } from './unit/dispatcher.test.ts';
import { runFeedbackLoopUnitTests } from './unit/feedback_loop.test.ts';
import { runActionClosedLoopIntegrationTests } from './integration/action_closed_loop.test.ts';

async function main() {
  console.log('========================================================================');
  console.log(' INDUSTRIAL BRAIN — MASTER ACCEPTANCE TEST SUITE (PHASES 1, 2, 3, 4, 5, 6)');
  console.log(' Core Platform, Data Ingestion, Knowledge Graph, Search, Reasoning & Action');
  console.log('========================================================================');

  const startTime = Date.now();
  let totalPassed = 0;
  let totalFailed = 0;

  const suites = [
    // Phase 1: Core Platform
    { name: 'Authentication & Cryptography', fn: runAuthTests },
    { name: 'RBAC Permission Matrix', fn: runRbacTests },
    { name: 'Tenant Isolation', fn: runTenantIsolationTests },
    { name: 'Tamper-Evident Audit Engine', fn: runAuditTests },
    { name: 'System Health & Diagnostics', fn: runHealthTests },

    // Phase 2: Real Data Connectors
    { name: 'CSV Ingestion Engine', fn: runCsvEngineTests },
    { name: 'Excel (XLSX) Ingestion Engine', fn: runExcelEngineTests },
    { name: 'PostgreSQL Read-Only Connector', fn: runPostgresEngineTests },
    { name: 'Generic REST Connector & SSRF', fn: runRestEngineTests },
    { name: 'Unified Ingestion Pipeline & DLQ', fn: runIngestionPipelineTests },

    // Phase 3: Entity Resolution & Knowledge Graph
    { name: 'Industrial Ontologies', fn: runOntologyTests },
    { name: 'Entity Resolution Engine', fn: runEntityResolverTests },
    { name: 'Graph Storage & Bi-directional Traversal', fn: runGraphStoreTests },
    { name: 'Knowledge Graph Integration & Context Builder', fn: runKnowledgeGraphIntegrationTests },

    // Phase 4: Context Engine & Hybrid Search
    { name: 'Industrial Structure-Aware Chunker', fn: runChunkerTests },
    { name: 'BM25 Keyword & Exact Error Code Engine', fn: runBM25Tests },
    { name: 'Semantic Vector Search Engine', fn: runVectorSearchTests },
    { name: 'Hybrid Search Integration (RRF) & Context Assembler', fn: runHybridSearchIntegrationTests },

    // Phase 5: Reasoning & Decision Engine
    { name: 'Temporal Correlation & Pattern Detection', fn: runCorrelationEngineTests },
    { name: 'Root Cause Analysis & Evidence Chains', fn: runRCAEngineUnitTests },
    { name: 'Reasoning & RCA Acceptance Criteria', fn: runReasoningIntegrationTests },

    // Phase 6: Action & Closed-Loop Execution
    { name: 'Pre-Execution Guardrails Engine', fn: runGuardrailUnitTests },
    { name: 'Multi-System Action Dispatcher', fn: runDispatcherUnitTests },
    { name: 'Closed-Loop Sensor Feedback & Rollback', fn: runFeedbackLoopUnitTests },
    { name: 'Action & Closed-Loop Master Acceptance Criteria', fn: runActionClosedLoopIntegrationTests },
  ];

  for (const suite of suites) {
    try {
      const { passed, failed } = await suite.fn();
      totalPassed += passed;
      totalFailed += failed;
    } catch (err) {
      console.error(`Suite [${suite.name}] encountered unexpected error:`, err);
      totalFailed++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n========================================================================');
  console.log(` TEST EXECUTION SUMMARY (${duration}s)`);
  console.log(` TOTAL ASSERTIONS: ${totalPassed + totalFailed}`);
  console.log(` PASSED:           ${totalPassed}`);
  console.log(` FAILED:           ${totalFailed}`);
  console.log('========================================================================');

  if (totalFailed > 0) {
    console.error(`\n[CRITICAL FAILURE] Acceptance Criteria NOT met: ${totalFailed} assertions failed.`);
    process.exit(1);
  } else {
    console.log(`\n[SUCCESS] All Phase 1, 2, 3, 4, 5 & 6 Acceptance Criteria verified with 100% pass rate.`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
