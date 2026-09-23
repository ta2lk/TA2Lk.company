/**
 * Unit Tests: Closed-Loop Sensor Feedback & Automatic Rollback Engine
 * Phase 6: Action & Closed Loop
 */

import { FeedbackLoopEngine } from '../../packages/action/feedbackLoop.ts';
import { ActionProposal, SensorFeedbackCondition } from '../../packages/action/types.ts';

export async function runFeedbackLoopUnitTests(): Promise<{ passed: number; failed: number }> {
  console.log('--- 24. Running Closed-Loop Sensor Feedback Unit Tests ---');
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

  const proposal: ActionProposal = {
    id: 'prop_fb_01',
    tenantId: 'tenant_test',
    title: 'Coolant Flow Adjustment',
    category: 'PARAMETER_ADJUSTMENT',
    targetEntityId: 'mach_01',
    targetEntityName: 'Test Machine',
    systemTarget: 'SCADA',
    commandType: 'UPDATE_SETPOINT',
    parameters: { targetPressureBar: 4.2 },
    requiredApprovalRole: 'PROCESS_ENGINEER',
    approvalStatus: 'APPROVED',
    approvedBy: 'engineer@test.internal',
    rollbackPlan: {
      enabled: true,
      systemTarget: 'SCADA',
      commandType: 'RESTORE_SETPOINT',
      rollbackParameters: { targetPressureBar: 3.0 },
      autoTriggerOnFeedbackTimeoutSeconds: 300,
    },
    estimatedImpact: { downtimeMinutes: 0, estimatedCostUsd: 0, riskLevel: 'LOW' },
    supportingEvidenceIds: ['ev_1'],
    createdAt: new Date().toISOString(),
  };

  const condition: SensorFeedbackCondition = {
    sensorEntityId: 'SENS-TEMP-COOLANT',
    metric: 'Spindle Temperature',
    baselineValue: 74.2,
    targetHealthyValue: 60.0,
    comparisonOperator: '<=',
    maxEvaluationWindowMinutes: 30,
  };

  // Test 1: Temperature dropped to 58°C (Below target 60°C) -> RESOLVED_HEALTHY
  const healthyResult = await FeedbackLoopEngine.evaluateFeedback(
    'exec_01',
    proposal,
    condition,
    58.0,
    15
  );
  assert(healthyResult.isResolved === true, 'Closed loop confirmed issue resolution');
  assert(healthyResult.status === 'RESOLVED_HEALTHY', 'Status marked as RESOLVED_HEALTHY');
  assert(healthyResult.rollbackTriggered === false, 'No rollback triggered on healthy condition');

  // Test 2: Temperature rose from baseline 74.2°C to 82.5°C -> DETERIORATING & Automatic Rollback
  const deterioratingResult = await FeedbackLoopEngine.evaluateFeedback(
    'exec_02',
    proposal,
    condition,
    82.5,
    5
  );
  assert(deterioratingResult.isResolved === false, 'Detected physical deterioration');
  assert(deterioratingResult.status === 'DETERIORATING', 'Status marked as DETERIORATING');
  assert(deterioratingResult.rollbackTriggered === true, 'AUTOMATIC ROLLBACK triggered successfully upon thermal deterioration');

  // Test 3: Monitoring in progress within window
  const inProgressResult = await FeedbackLoopEngine.evaluateFeedback(
    'exec_03',
    proposal,
    condition,
    68.0, // Stabilizing down from 74.2, but hasn't reached 60 yet
    10
  );
  assert(inProgressResult.status === 'MONITORING_IN_PROGRESS', 'Status marked as MONITORING_IN_PROGRESS');
  assert(inProgressResult.rollbackTriggered === false, 'Rollback kept on standby during active monitoring');

  // Test 4: Elapsed time exceeded 30m window without reaching healthy target -> TIMEOUT_FAILED & Rollback
  const timeoutResult = await FeedbackLoopEngine.evaluateFeedback(
    'exec_04',
    proposal,
    condition,
    66.0,
    45 // 45m > 30m limit
  );
  assert(timeoutResult.status === 'TIMEOUT_FAILED', 'Status marked as TIMEOUT_FAILED');
  assert(timeoutResult.rollbackTriggered === true, 'Automatic rollback triggered upon timeout expiry');

  return { passed, failed };
}
