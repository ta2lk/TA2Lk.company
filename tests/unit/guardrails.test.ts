/**
 * Unit Tests: Pre-Execution Guardrails Engine
 * Phase 6: Action & Closed Loop
 */

import { GuardrailEngine } from '../../packages/action/guardrailEngine.ts';
import { ActionProposal } from '../../packages/action/types.ts';

export async function runGuardrailUnitTests(): Promise<{ passed: number; failed: number }> {
  console.log('--- 22. Running Pre-Execution Guardrails Unit Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  const sampleProposal: ActionProposal = {
    id: 'prop_test_01',
    tenantId: 'tenant_test',
    title: 'Test Setpoint Modification',
    category: 'PARAMETER_ADJUSTMENT',
    targetEntityId: 'mach_01',
    targetEntityName: 'Test Machine',
    systemTarget: 'SCADA',
    commandType: 'UPDATE_SETPOINT',
    parameters: {
      targetPressureBar: 4.2,
      targetRpm: 12000,
    },
    requiredApprovalRole: 'PROCESS_ENGINEER',
    approvalStatus: 'APPROVED',
    approvedBy: 'engineer@test.internal',
    rollbackPlan: {
      enabled: true,
      systemTarget: 'SCADA',
      commandType: 'RESTORE_SETPOINT',
      rollbackParameters: {},
      autoTriggerOnFeedbackTimeoutSeconds: 300,
    },
    estimatedImpact: { downtimeMinutes: 0, estimatedCostUsd: 0, riskLevel: 'LOW' },
    supportingEvidenceIds: ['ev_1'],
    createdAt: new Date().toISOString(),
  };

  // Test 1: Machine in EMERGENCY_STOP -> Hard Block
  const eStopResult = GuardrailEngine.evaluateGuardrails(sampleProposal, {
    machineOperatingState: 'EMERGENCY_STOP',
    historicalActionTimestampsInLastHour: [],
  });
  assert(eStopResult.canExecute === false, 'Blocked action when machine is in EMERGENCY_STOP');
  assert(eStopResult.blockedReason?.includes('EMERGENCY STOP') === true, 'Reason identifies Hard E-Stop interlock');

  // Test 2: Control modification during RUNNING_CRITICAL -> Blocked
  const runningCriticalResult = GuardrailEngine.evaluateGuardrails(sampleProposal, {
    machineOperatingState: 'RUNNING_CRITICAL',
    historicalActionTimestampsInLastHour: [],
  });
  assert(runningCriticalResult.canExecute === false, 'Blocked setpoint modification during active RUNNING_CRITICAL cut');
  assert(runningCriticalResult.blockedReason?.includes('RUNNING_CRITICAL') === true, 'Reason identifies active cutting state lockout');

  // Test 3: Normal state with valid parameters -> Pass
  const normalResult = GuardrailEngine.evaluateGuardrails(sampleProposal, {
    machineOperatingState: 'RUNNING_NORMAL',
    historicalActionTimestampsInLastHour: [],
  });
  assert(normalResult.canExecute === true, 'Permitted action under RUNNING_NORMAL state with safe parameters');

  // Test 4: Parameter Bounds Check (Out-of-range pressure setpoint)
  const hazardousProposal: ActionProposal = {
    ...sampleProposal,
    parameters: {
      targetPressureBar: 350.0, // Exceeds 250 bar maximum limit!
    },
  };
  const boundsResult = GuardrailEngine.evaluateGuardrails(hazardousProposal, {
    machineOperatingState: 'RUNNING_NORMAL',
    historicalActionTimestampsInLastHour: [],
  });
  assert(boundsResult.canExecute === false, 'Blocked hazardous setpoint exceeding physical bounds (350 bar > 250 bar)');
  assert(boundsResult.blockedReason?.includes('exceeds safe envelope') === true, 'Reason identifies parameter envelope violation');

  // Test 5: Actuator Rate Limiting (Command Flooding Guard)
  const now = Date.now();
  const floodedTimestamps = [
    now - 10 * 60 * 1000,
    now - 20 * 60 * 1000,
    now - 30 * 60 * 1000,
    now - 40 * 60 * 1000,
    now - 50 * 60 * 1000, // 5 actions already in last hour
  ];
  const rateLimitResult = GuardrailEngine.evaluateGuardrails(sampleProposal, {
    machineOperatingState: 'RUNNING_NORMAL',
    historicalActionTimestampsInLastHour: floodedTimestamps,
  });
  assert(rateLimitResult.canExecute === false, 'Blocked command when rate limit exceeded (>= 5 actions in last hour)');
  assert(rateLimitResult.blockedReason?.includes('Rate limit exceeded') === true, 'Reason identifies actuator command flooding');

  // Test 6: Unapproved proposal -> Blocked
  const unapprovedProposal: ActionProposal = {
    ...sampleProposal,
    approvalStatus: 'PENDING',
    approvedBy: undefined,
  };
  const unapprovedResult = GuardrailEngine.evaluateGuardrails(unapprovedProposal, {
    machineOperatingState: 'RUNNING_NORMAL',
    historicalActionTimestampsInLastHour: [],
  });
  assert(unapprovedResult.canExecute === false, 'Blocked unapproved action proposal');
  assert(unapprovedResult.blockedReason?.includes('explicit human sign-off') === true, 'Reason identifies missing human sign-off');

  return { passed, failed };
}
