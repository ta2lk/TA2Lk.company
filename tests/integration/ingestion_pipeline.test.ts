/**
 * Phase 2 Integration Tests: Unified Ingestion Pipeline & Dead-Letter Queue
 */

import { IngestionPipeline } from '../../packages/connectors/pipeline.ts';
import { db } from '../../src/backend/db/database.ts';
import { verifyAuditRecord } from '../../packages/audit/index.ts';

export async function runIngestionPipelineTests(): Promise<{ passed: number; failed: number }> {
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

  console.log('\n--- 10. Running Ingestion Pipeline & DLQ Integration Tests ---');

  const tenantAlphaId = `org_pipe_alpha_${Date.now()}`;
  const tenantBetaId = `org_pipe_beta_${Date.now()}`;

  db.createOrganization('Pipe Alpha Plant', `pipe-alpha-${Date.now()}`);
  db.createOrganization('Pipe Beta Plant', `pipe-beta-${Date.now()}`);

  const rawDataset = [
    { order_id: 'PO-ALPHA-01', sku: 'PART-A', qty: 100 },
    { order_id: 'PO-ALPHA-02', sku: 'PART-B', qty: 250 },
    { order_id: 'PO-ALPHA-01', sku: 'PART-A', qty: 100 }, // Duplicate!
    null as any, // Malformed row -> Must go to DLQ
    { order_id: 'PO-ALPHA-03', sku: 'PART-C', qty: 90 },
  ];

  // Test 1: Execute pipeline with deduplication and DLQ capture
  const result = await IngestionPipeline.execute(
    tenantAlphaId,
    'ds_test_csv',
    'CSV',
    rawDataset,
    'engineer@alpha.internal',
    {
      entityType: 'PRODUCTION_BATCH',
      enableDeduplication: true,
    }
  );

  assert(result.metrics.totalRows === 5, 'Pipeline processed all 5 input rows');
  assert(result.metrics.validRows === 3, 'Normalized exactly 3 valid distinct rows');
  assert(result.metrics.duplicateRows === 1, 'Correctly captured 1 duplicate row');
  assert(result.metrics.errorRows === 1, 'Routed 1 malformed row to Dead-Letter Queue');
  assert(result.job.status === 'PARTIAL', 'Job flagged as PARTIAL due to DLQ item');

  // Test 2: Inspect Dead-Letter Queue
  const dlqItems = db.listDeadLetterForTenant(tenantAlphaId);
  assert(dlqItems.length === 1, 'Found 1 Dead-Letter item in tenant storage');
  assert(dlqItems[0].errorCode === 'EMPTY_OR_INVALID_ROW', 'DLQ item captured correct error code');
  assert(dlqItems[0].rowIndex === 4, 'DLQ captured exact row index (row 4)');

  // Test 3: Audit Trail records ingestion with valid HMAC checksum
  const auditLogs = db.listAuditLogsForTenant(tenantAlphaId, { action: 'DATA_INGESTION_COMPLETED' });
  assert(auditLogs.items.length >= 1, 'Generated tamper-evident audit record for ingestion');
  assert(verifyAuditRecord(auditLogs.items[0]) === true, 'Ingestion audit log checksum verified with HMAC-SHA256');

  // Test 4: Strict Multi-Tenant Isolation
  // Tenant Beta queries for normalized records or DLQ must return ZERO rows from Tenant Alpha
  const betaRecords = db.listNormalizedRecordsForTenant(tenantBetaId);
  assert(betaRecords.total === 0, 'Tenant Beta has 0 normalized records from Tenant Alpha');

  const betaDlq = db.listDeadLetterForTenant(tenantBetaId);
  assert(betaDlq.length === 0, 'Tenant Beta has 0 DLQ items from Tenant Alpha');

  // Test 5: Querying records within Tenant Alpha succeeds
  const alphaRecords = db.listNormalizedRecordsForTenant(tenantAlphaId);
  assert(alphaRecords.total === 3, 'Tenant Alpha retrieved exactly its 3 normalized records');
  assert(alphaRecords.items[0].entityType === 'PRODUCTION_BATCH', 'Normalized records have correct entityType');

  return { passed, failed };
}
