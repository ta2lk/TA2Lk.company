/**
 * Unit Tests: RBAC Permissions Engine
 */

import { hasPermission, hasAllPermissions, hasAnyPermission, ROLE_PERMISSIONS } from '../../packages/shared/rbac.ts';
import { SystemRole } from '../../packages/shared/types.ts';

export async function runRbacTests(): Promise<{ passed: number; failed: number }> {
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

  console.log('\n--- 2. Running RBAC & Permission Tests ---');

  // Test 1: SUPER_ADMIN has system:admin and all critical permissions
  assert(hasPermission('SUPER_ADMIN', 'system:admin'), 'SUPER_ADMIN possesses system:admin permission');
  assert(hasPermission('SUPER_ADMIN', 'org:delete'), 'SUPER_ADMIN possesses org:delete permission');

  // Test 2: OPERATOR cannot manage users, policies, or export audit
  assert(!hasPermission('OPERATOR', 'user:invite'), 'OPERATOR is denied user:invite');
  assert(!hasPermission('OPERATOR', 'policy:write'), 'OPERATOR is denied policy:write');
  assert(!hasPermission('OPERATOR', 'audit:export'), 'OPERATOR is denied audit:export');
  assert(hasPermission('OPERATOR', 'data:read'), 'OPERATOR is granted data:read');

  // Test 3: AUDITOR has audit:read and audit:export but cannot mutate policies or ingest data
  assert(hasPermission('AUDITOR', 'audit:read'), 'AUDITOR is granted audit:read');
  assert(hasPermission('AUDITOR', 'audit:export'), 'AUDITOR is granted audit:export');
  assert(!hasPermission('AUDITOR', 'data:ingest'), 'AUDITOR is denied data:ingest');
  assert(!hasPermission('AUDITOR', 'action:approve'), 'AUDITOR is denied action:approve');

  // Test 4: PLANT_MANAGER can approve actions, but PROCESS_ENGINEER can only propose
  assert(hasPermission('PLANT_MANAGER', 'action:approve'), 'PLANT_MANAGER is granted action:approve');
  assert(hasPermission('PROCESS_ENGINEER', 'action:propose'), 'PROCESS_ENGINEER is granted action:propose');
  assert(!hasPermission('PROCESS_ENGINEER', 'action:approve'), 'PROCESS_ENGINEER is denied action:approve');

  // Test 5: hasAllPermissions and hasAnyPermission helpers
  assert(hasAllPermissions('ORG_ADMIN', ['org:read', 'user:invite', 'data:manage']), 'ORG_ADMIN has all requested permissions');
  assert(hasAnyPermission('VIEWER', ['data:read', 'system:admin']), 'VIEWER satisfies hasAnyPermission for data:read');
  assert(!hasAllPermissions('VIEWER', ['data:read', 'system:admin']), 'VIEWER fails hasAllPermissions when missing system:admin');

  return { passed, failed };
}
