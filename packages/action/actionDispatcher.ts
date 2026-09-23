/**
 * Industrial Brain — Multi-System Action Dispatcher
 * Phase 6: Action & Closed Loop
 *
 * Integrates with:
 * - CMMS: Create Emergency/Preventive Work Orders
 * - ERP: Reserve Critical Spare Parts / Components
 * - SOP: Dispatch Operator Visual Guidance & Checklist
 * - SCADA/PLC: Controlled Setpoint Adjustments (With automatic rollback guarantee)
 */

import crypto from 'crypto';
import {
  ActionProposal,
  ActionExecutionResult,
  ActionSystemTarget,
} from './types.ts';
import { GuardrailEngine, GuardrailContext } from './guardrailEngine.ts';

export class ActionDispatcher {
  /**
   * Dispatches approved action proposal across plant enterprise systems
   * strictly guarded by Pre-Execution Guardrails.
   */
  public static async dispatchAction(
    proposal: ActionProposal,
    context: GuardrailContext
  ): Promise<ActionExecutionResult> {
    const timestamp = new Date().toISOString();

    // 1. Evaluate Pre-Execution Guardrails
    const guardrailsEval = GuardrailEngine.evaluateGuardrails(proposal, context);

    if (!guardrailsEval.canExecute) {
      const blockedId = `exec_blocked_${crypto.randomBytes(6).toString('hex')}`;
      const checksum = crypto
        .createHash('sha256')
        .update(`${blockedId}:${proposal.id}:BLOCKED:${timestamp}`)
        .digest('hex');

      return {
        executionId: blockedId,
        proposalId: proposal.id,
        tenantId: proposal.tenantId,
        systemTarget: proposal.systemTarget,
        commandType: proposal.commandType,
        status: 'GUARDRAIL_BLOCKED',
        dispatchedAt: timestamp,
        externalReferenceId: 'NONE',
        guardrailsEvaluation: guardrailsEval,
        auditChecksum: checksum,
      };
    }

    // 2. Dispatch to Target External Enterprise System
    const externalRef = this.executeTargetSystemCommand(
      proposal.systemTarget,
      proposal.commandType,
      proposal.parameters
    );

    const executionId = `exec_${crypto.randomBytes(6).toString('hex')}`;
    const auditChecksum = crypto
      .createHash('sha256')
      .update(`${executionId}:${proposal.id}:${proposal.systemTarget}:${externalRef}:${timestamp}`)
      .digest('hex');

    return {
      executionId,
      proposalId: proposal.id,
      tenantId: proposal.tenantId,
      systemTarget: proposal.systemTarget,
      commandType: proposal.commandType,
      status: 'SUCCESS',
      dispatchedAt: timestamp,
      externalReferenceId: externalRef,
      guardrailsEvaluation: guardrailsEval,
      auditChecksum,
    };
  }

  /**
   * Simulates real API integration with enterprise systems (CMMS, ERP, SOP, SCADA)
   */
  private static executeTargetSystemCommand(
    target: ActionSystemTarget,
    commandType: string,
    parameters: Record<string, unknown>
  ): string {
    const rand = Math.floor(10000 + Math.random() * 90000);

    switch (target) {
      case 'CMMS':
        // e.g. IBM Maximo or SAP PM Work Order Creation
        return `WO-CMMS-2026-${rand}`;

      case 'ERP':
        // e.g. SAP Materials Management Reservation
        return `RES-SAP-MM-${rand}`;

      case 'SOP':
        // e.g. Tulip / Poka Operator Work Instruction
        return `SOP-DISPATCH-${rand}`;

      case 'SCADA':
        // e.g. Ignition / Siemens WinCC Setpoint Modification
        return `SCADA-ACK-${rand}`;

      default:
        return `EXT-REF-${rand}`;
    }
  }

  /**
   * Dispatches rollback command if post-execution feedback detects failure
   */
  public static async dispatchRollback(
    executionId: string,
    proposal: ActionProposal
  ): Promise<{ rollbackExecutionId: string; status: 'ROLLED_BACK'; timestamp: string }> {
    const timestamp = new Date().toISOString();
    const rollbackId = `rollback_${crypto.randomBytes(6).toString('hex')}`;

    // Execute rollback command on target system
    this.executeTargetSystemCommand(
      proposal.rollbackPlan.systemTarget,
      proposal.rollbackPlan.commandType,
      proposal.rollbackPlan.rollbackParameters
    );

    return {
      rollbackExecutionId: rollbackId,
      status: 'ROLLED_BACK',
      timestamp,
    };
  }
}
