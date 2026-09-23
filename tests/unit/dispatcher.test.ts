/**
 * Unit Tests: Multi-System Action Dispatcher
 * Phase 6: Action & Closed Loop
 */

import { ActionDispatcher } from '../../packages/action/actionDispatcher.ts';
import { ActionProposal } from '../../packages/action/types.ts';

export async function runDispatcherUnitTests(): Promise<{ passed: number; failed: number }> {
  console.log('--- 23. Running Multi-System Action Dispatcher Unit Tests ---');
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

  const baseProposal: ActionProposal = {
    id: 'prop_dispatch_01',
    tenantId: 'tenant_test',
    title: 'Work Order Creation',
    category: 'CORRECTIVE_ACTION',
    targetEntityId: 'mach_01',
    targetEntityName: 'Test Machine',
    systemTarget: 'CMMS',
    commandType: 'CREATE_EMERGENCY_WORK_ORDER',
    parameters: { priority: 'HIGH' },
    requiredApprovalRole: 'PROCESS_ENGINEER',
    approvalStatus: 'APPROVED',
    approvedBy: 'engineer@test.internal',
    rollbackPlan: {
      enabled: true,
      systemTarget: 'CMMS',
      commandType: 'CANCEL_WORK_ORDER',
      rollbackParameters: {},
      autoTriggerOnFeedbackTimeoutSeconds: 3600,
    },
    estimatedImpact: { downtimeMinutes: 45, estimatedCostUsd: 140, riskLevel: 'LOW' },
    supportingEvidenceIds: ['ev_1'],
    createdAt: new Date().toISOString(),
  };

  // Test 1: CMMS Dispatch
  const cmmsResult = await ActionDispatcher.dispatchAction(baseProposal, {
    machineOperatingState: 'RUNNING_NORMAL',
    historicalActionTimestampsInLastHour: [],
  });
  assert(cmmsResult.status === 'SUCCESS', 'CMMS command dispatched successfully');
  assert(cmmsResult.externalReferenceId.startsWith('WO-CMMS-2026-'), 'CMMS returned valid Work Order reference ID');
  assert(cmmsResult.auditChecksum.length === 64, 'Generated SHA256 audit checksum');

  // Test 2: ERP Spare Part Reservation
  const erpProposal: ActionProposal = {
    ...baseProposal,
    systemTarget: 'ERP',
    commandType: 'RESERVE_SPARE_PART',
    parameters: { materialNumber: 'MAT-FLTR-005', quantity: 2 },
  };
  const erpResult = await ActionDispatcher.dispatchAction(erpProposal, {
    machineOperatingState: 'RUNNING_NORMAL',
    historicalActionTimestampsInLastHour: [],
  });
  assert(erpResult.status === 'SUCCESS', 'ERP reservation dispatched successfully');
  assert(erpResult.externalReferenceId.startsWith('RES-SAP-MM-'), 'ERP returned valid SAP MM reservation reference ID');

  // Test 3: SOP Guidance Dispatch
  const sopProposal: ActionProposal = {
    ...baseProposal,
    systemTarget: 'SOP',
    commandType: 'DISPATCH_OPERATOR_GUIDANCE',
  };
  const sopResult = await ActionDispatcher.dispatchAction(sopProposal, {
    machineOperatingState: 'RUNNING_NORMAL',
    historicalActionTimestampsInLastHour: [],
  });
  assert(sopResult.status === 'SUCCESS', 'SOP guidance dispatched successfully');
  assert(sopResult.externalReferenceId.startsWith('SOP-DISPATCH-'), 'SOP returned valid workflow reference ID');

  // Test 4: Guardrail Blocked Dispatch
  const blockedResult = await ActionDispatcher.dispatchAction(baseProposal, {
    machineOperatingState: 'EMERGENCY_STOP', // Hard block
    historicalActionTimestampsInLastHour: [],
  });
  assert(blockedResult.status === 'GUARDRAIL_BLOCKED', 'Dispatcher refused command execution when guardrail blocked');
  assert(blockedResult.externalReferenceId === 'NONE', 'No external command dispatched on block');

  return { passed, failed };
}
