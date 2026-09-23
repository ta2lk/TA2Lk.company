/**
 * Unit Tests: Authentication & Cryptography
 */

import { hashPassword, verifyPassword, createToken, verifyToken } from '../../src/backend/security/auth.ts';

export async function runAuthTests(): Promise<{ passed: number; failed: number }> {
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

  console.log('\n--- 1. Running Auth & Cryptography Unit Tests ---');

  // Test 1: Password hashing produces distinct salt and hash
  const pwd = 'SuperSecurePassword123!';
  const { hash, salt } = hashPassword(pwd);
  assert(hash.length === 128, 'Password hash has correct 64-byte/128-char hex length');
  assert(salt.length === 32, 'Cryptographic salt has 16-byte/32-char hex length');

  // Test 2: Correct password verifies successfully
  assert(verifyPassword(pwd, hash, salt) === true, 'Valid password verification returns true');

  // Test 3: Incorrect password fails verification
  assert(verifyPassword('WrongPassword123!', hash, salt) === false, 'Invalid password verification returns false');

  // Test 4: JWT token creation & valid verification
  const payload = {
    userId: 'usr_test_123',
    email: 'engineer@factory.internal',
    isSuperAdmin: false,
    activeTenantId: 'org_test_789',
    activeRole: 'PROCESS_ENGINEER',
  };

  const token = createToken(payload, 2);
  const decoded = verifyToken(token);
  assert(decoded.userId === payload.userId, 'Decoded JWT userId matches payload');
  assert(decoded.email === payload.email, 'Decoded JWT email matches payload');
  assert(decoded.activeTenantId === payload.activeTenantId, 'Decoded activeTenantId matches');

  // Test 5: Tampered JWT token fails verification
  const tamperedToken = token.slice(0, -5) + 'xxxxx';
  let tamperedCaught = false;
  try {
    verifyToken(tamperedToken);
  } catch {
    tamperedCaught = true;
  }
  assert(tamperedCaught, 'Tampered token signature is detected and rejected');

  return { passed, failed };
}
