/**
 * Integration Tests: Tamper-Evident Audit Engine
 * Phase 1: Core Platform
 */

import { db } from '../../src/backend/db/database.ts';
import { verifyAuditRecord } from '../../packages/audit/index.ts';

export async function runAuditTests(): Promise<{ passed: number; failed: number }> {
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

  console.log('\n--- 4. Running Tamper-Evident Audit Trail Tests ---');

  // Test 1: Append an audit log and verify its checksum immediately
  const log = db.appendAuditLog({
    tenantId: 'org_test_audit_88',
    actorId: 'usr_compliance_1',
    actorEmail: 'auditor@plant.internal',
    actorRole: 'AUDITOR',
    action: 'COMPLIANCE_SNAPSHOT_RECORDED',
    resourceType: 'COMPLIANCE',
    resourceId: 'snapshot_001',
    details: { inspectedLine: 'Line 3', variance: 0.002 },
    ipAddress: '192.168.1.50',
    status: 'SUCCESS',
  });

  assert(log.checksum.length === 64, 'HMAC-SHA256 checksum has 64 hex characters');
  assert(verifyAuditRecord(log) === true, 'Original unmodified audit log passes cryptographic verification');

  // Test 2: Tampering with the action string flags verification failure
  const tamperedActionLog = { ...log, action: 'UNAUTHORIZED_ALTERED_ACTION' };
  assert(verifyAuditRecord(tamperedActionLog) === false, 'Tampered action fails cryptographic verification');

  // Test 3: Tampering with payload details flags verification failure
  const tamperedDetailsLog = {
    ...log,
    details: { inspectedLine: 'Line 3', variance: 999.0 },
  };
  assert(verifyAuditRecord(tamperedDetailsLog) === false, 'Tampered payload details fails cryptographic verification');

  // Test 4: Tampering with actor flags verification failure
  const tamperedActorLog = { ...log, actorEmail: 'attacker@outside.com' };
  assert(verifyAuditRecord(tamperedActorLog) === false, 'Tampered actor identity fails cryptographic verification');

  return { passed, failed };
}
