/**
 * Integration Tests: Strict Multi-Tenant Isolation
 * Phase 1: Core Platform
 *
 * Verifies that Tenant A cannot access, query, or mutate Tenant B records,
 * and that database queries strictly enforce tenant boundaries.
 */

import { db } from '../../src/backend/db/database.ts';
import { hashPassword } from '../../src/backend/security/auth.ts';

export async function runTenantIsolationTests(): Promise<{ passed: number; failed: number }> {
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

  console.log('\n--- 3. Running Tenant Isolation Integration Tests ---');

  // Setup: Create two separate organizations
  const orgA = db.createOrganization('Tenant Alpha Corp', 'tenant-alpha-' + Date.now());
  const orgB = db.createOrganization('Tenant Beta Inc', 'tenant-beta-' + Date.now());

  // Setup: Create two distinct users
  const { hash: h1, salt: s1 } = hashPassword('Pass123!');
  const userA = db.createUser(`alice_${Date.now()}@alpha.internal`, 'Alice Alpha', h1, s1);

  const { hash: h2, salt: s2 } = hashPassword('Pass123!');
  const userB = db.createUser(`bob_${Date.now()}@beta.internal`, 'Bob Beta', h2, s2);

  // Assign userA to orgA only, userB to orgB only
  db.createMembership(userA.id, orgA.id, 'ORG_ADMIN');
  db.createMembership(userB.id, orgB.id, 'PROCESS_ENGINEER');

  // Test 1: User A membership only exists in Org A
  const memA = db.getMembership(userA.id, orgA.id);
  const memACross = db.getMembership(userA.id, orgB.id);
  assert(memA !== null && memA.tenantId === orgA.id, 'User A has active membership in Org A');
  assert(memACross === null, 'User A has NO membership in Org B (Strict Isolation)');

  // Test 2: List members for Org A does NOT contain User B
  const orgAMembers = db.listMembersForTenant(orgA.id);
  const containsUserB = orgAMembers.some((m) => m.userId === userB.id);
  assert(!containsUserB, 'Org A member list does not leak Org B members');

  // Test 3: Audit log isolation
  db.appendAuditLog({
    tenantId: orgA.id,
    actorId: userA.id,
    actorEmail: userA.email,
    actorRole: 'ORG_ADMIN',
    action: 'PROPRIETARY_ALPHA_FORMULA_UPDATED',
    resourceType: 'FORMULA',
    resourceId: 'form_991',
    details: { confidentialRatio: 0.88 },
    status: 'SUCCESS',
  });

  db.appendAuditLog({
    tenantId: orgB.id,
    actorId: userB.id,
    actorEmail: userB.email,
    actorRole: 'PROCESS_ENGINEER',
    action: 'BETA_MAINTENANCE_SCHEDULED',
    resourceType: 'MACHINE',
    resourceId: 'mach_44',
    details: { machine: 'Extruder 4' },
    status: 'SUCCESS',
  });

  // Query audit logs strictly for Org B
  const orgBLogs = db.listAuditLogsForTenant(orgB.id);
  const containsAlphaLog = orgBLogs.items.some((l) => l.tenantId === orgA.id || l.actorId === userA.id);
  assert(!containsAlphaLog, 'Org B audit log query returns ZERO records from Org A');

  // Query audit logs strictly for Org A
  const orgALogs = db.listAuditLogsForTenant(orgA.id);
  const containsBetaLog = orgALogs.items.some((l) => l.tenantId === orgB.id || l.actorId === userB.id);
  assert(!containsBetaLog, 'Org A audit log query returns ZERO records from Org B');

  return { passed, failed };
}
