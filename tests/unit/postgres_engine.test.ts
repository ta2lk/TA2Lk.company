/**
 * Phase 2 Unit Tests: PostgreSQL Read-Only Connector
 */

import { PostgresEngine } from '../../packages/connectors/postgresEngine.ts';

export async function runPostgresEngineTests(): Promise<{ passed: number; failed: number }> {
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

  console.log('\n--- 8. Running PostgreSQL Read-Only Connector Tests ---');

  // Test 1: Safe SELECT queries pass validation
  let selectPassed = true;
  try {
    PostgresEngine.validateReadOnlyQuery('SELECT * FROM erp_work_orders WHERE status = \'IN_PROGRESS\'');
    PostgresEngine.validateReadOnlyQuery('WITH active_lines AS (SELECT * FROM lines) SELECT * FROM active_lines');
  } catch {
    selectPassed = false;
  }
  assert(selectPassed, 'Valid SELECT and WITH queries pass safety validation');

  // Test 2: Mutation queries strictly REJECTED
  const forbiddenQueries = [
    'DROP TABLE erp_work_orders',
    'DELETE FROM users WHERE id = 1',
    'INSERT INTO telemetry (machine) VALUES (\'M1\')',
    'UPDATE erp_work_orders SET status = \'CANCELLED\'',
    'ALTER TABLE plants ADD COLUMN hacked boolean',
    'TRUNCATE audit_logs',
    'GRANT ALL PRIVILEGES ON DATABASE test TO evil',
  ];

  for (const q of forbiddenQueries) {
    let blocked = false;
    try {
      PostgresEngine.validateReadOnlyQuery(q);
    } catch {
      blocked = true;
    }
    assert(blocked, `Blocked forbidden mutation/DDL query: ${q.split(' ')[0]}`);
  }

  // Test 3: Multi-statement chaining injection strictly blocked
  let chainBlocked = false;
  try {
    PostgresEngine.validateReadOnlyQuery('SELECT * FROM orders; DROP TABLE users;');
  } catch {
    chainBlocked = true;
  }
  assert(chainBlocked, 'Blocked multi-statement SQL injection attempt');

  // Test 4: SQL Identifier validation (protects against table name injection)
  assert(PostgresEngine.validateIdentifier('erp_work_orders') === 'erp_work_orders', 'Valid SQL identifier accepted');

  let invalidIdBlocked = false;
  try {
    PostgresEngine.validateIdentifier('orders; DROP TABLE users; --');
  } catch {
    invalidIdBlocked = true;
  }
  assert(invalidIdBlocked, 'Blocked malicious identifier injection');

  // Test 5: Safe sync execution
  const syncResult = await PostgresEngine.executeSafeSync(
    { host: 'localhost', port: 5432, database: 'factory_db', user: 'readonly_user' },
    'erp_work_orders',
    { limit: 10 }
  );

  assert(syncResult.rows.length === 3, 'Extracted rows from erp_work_orders');
  assert(syncResult.schema.columns.length === 6, 'Introspected columns correctly');
  assert(typeof syncResult.nextSyncTimestamp === 'string', 'Generated incremental sync cursor');

  return { passed, failed };
}
