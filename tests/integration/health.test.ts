/**
 * Integration Tests: Health Checks & Platform Diagnostics
 * Phase 1: Core Platform
 */

import { db } from '../../src/backend/db/database.ts';

export async function runHealthTests(): Promise<{ passed: number; failed: number }> {
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

  console.log('\n--- 5. Running Health & Diagnostics Tests ---');

  const health = db.checkHealth();
  assert(health.status === 'healthy', 'Database health reports healthy status');
  assert(health.organizationsCount >= 1, 'At least 1 organization initialized');
  assert(health.usersCount >= 1, 'At least 1 user initialized');
  assert(health.auditLogsCount >= 1, 'Audit log system initialized with records');

  return { passed, failed };
}
