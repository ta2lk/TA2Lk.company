/**
 * Industrial Brain — Action & Closed-Loop Service
 * Phase 6: Action & Closed Loop
 */

import {
  ActionProposal,
  ActionExecutionResult,
  FeedbackEvaluationResult,
  SensorFeedbackCondition,
  MachineOperatingState,
} from './types.ts';
import { ActionDispatcher } from './actionDispatcher.ts';
import { GuardrailContext } from './guardrailEngine.ts';
import { FeedbackLoopEngine } from './feedbackLoop.ts';

export class ActionService {
  private static proposals: Map<string, ActionProposal[]> = new Map();
  private static executions: Map<string, ActionExecutionResult> = new Map();
  private static feedbackConditions: Map<string, SensorFeedbackCondition> = new Map();
  private static machineStates: Map<string, MachineOperatingState> = new Map();

  public static getMachineState(entityId: string): MachineOperatingState {
    return this.machineStates.get(entityId) || 'RUNNING_NORMAL';
  }

  public static setMachineState(entityId: string, state: MachineOperatingState): void {
    this.machineStates.set(entityId, state);
  }

  public static getProposalsForTenant(tenantId: string): ActionProposal[] {
    if (!this.proposals.has(tenantId)) {
      // Seed default action proposals generated from Phase 5 RCA
      const defaultProposals: ActionProposal[] = [
        {
          id: `prop_cmms_filter_${tenantId}`,
          tenantId,
          title: 'Replace Coolant Chiller Micron Filter (Cartridge ISO-4406)',
          category: 'CORRECTIVE_ACTION',
          targetEntityId: 'mach_alpha_cnc',
          targetEntityName: 'Hermle C42U 5-Axis Milling Center',
          systemTarget: 'CMMS',
          commandType: 'CREATE_EMERGENCY_WORK_ORDER',
          parameters: {
            assetCanonicalId: 'CNC-5AXIS-03',
            workOrderPriority: 'CRITICAL',
            estimatedDurationMinutes: 45,
            assignedCraft: 'MECHANICAL_MAINTENANCE',
            instructions: 'Clear inline micron filter, replace cartridge, bleed air from circuit, verify 4.2 bar.',
          },
          requiredApprovalRole: 'PROCESS_ENGINEER',
          approvalStatus: 'PENDING',
          rollbackPlan: {
            enabled: true,
            systemTarget: 'CMMS',
            commandType: 'CANCEL_WORK_ORDER',
            rollbackParameters: { reason: 'AUTOMATIC_REVERSAL_ON_FEEDBACK_FAILURE' },
            autoTriggerOnFeedbackTimeoutSeconds: 3600,
          },
          estimatedImpact: {
            downtimeMinutes: 45,
            estimatedCostUsd: 140,
            riskLevel: 'LOW',
          },
          supportingEvidenceIds: ['ev_telemetry_press_drop', 'ev_manual_e4012'],
          createdAt: new Date().toISOString(),
        },
        {
          id: `prop_erp_spare_${tenantId}`,
          tenantId,
          title: 'Reserve 5µm Replacement Filter Cartridge in SAP Warehouse',
          category: 'CORRECTIVE_ACTION',
          targetEntityId: 'mach_alpha_cnc',
          targetEntityName: 'Hermle C42U 5-Axis Milling Center',
          systemTarget: 'ERP',
          commandType: 'RESERVE_SPARE_PART',
          parameters: {
            materialNumber: 'MAT-FLTR-CHL-005',
            quantity: 2,
            storageLocation: 'WH01-BIN-44B',
            costCenter: 'CC-MILLING-DEPT',
          },
          requiredApprovalRole: 'MAINTENANCE_SUPERVISOR',
          approvalStatus: 'APPROVED',
          approvedBy: 'supervisor@industrial-brain.internal',
          approvedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          rollbackPlan: {
            enabled: true,
            systemTarget: 'ERP',
            commandType: 'RELEASE_SPARE_PART_RESERVATION',
            rollbackParameters: { materialNumber: 'MAT-FLTR-CHL-005', quantity: 2 },
            autoTriggerOnFeedbackTimeoutSeconds: 1800,
          },
          estimatedImpact: {
            downtimeMinutes: 0,
            estimatedCostUsd: 85,
            riskLevel: 'LOW',
          },
          supportingEvidenceIds: ['ev_manual_e4012'],
          createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        },
        {
          id: `prop_scada_setpoint_${tenantId}`,
          tenantId,
          title: 'Emergency Coolant Circulation Pump Frequency Boost (50Hz -> 58Hz)',
          category: 'PARAMETER_ADJUSTMENT',
          targetEntityId: 'mach_alpha_cnc',
          targetEntityName: 'Hermle C42U 5-Axis Milling Center',
          systemTarget: 'SCADA',
          commandType: 'UPDATE_SETPOINT',
          parameters: {
            plcTag: 'DB100.PUMP_CHILLER_FREQ_SP',
            previousValue: 50.0,
            targetValue: 58.0,
            targetPressureBar: 4.2,
          },
          requiredApprovalRole: 'PLANT_MANAGER',
          approvalStatus: 'PENDING',
          rollbackPlan: {
            enabled: true,
            systemTarget: 'SCADA',
            commandType: 'RESTORE_PREVIOUS_SETPOINT',
            rollbackParameters: { plcTag: 'DB100.PUMP_CHILLER_FREQ_SP', targetValue: 50.0 },
            autoTriggerOnFeedbackTimeoutSeconds: 300,
          },
          estimatedImpact: {
            downtimeMinutes: 0,
            estimatedCostUsd: 0,
            riskLevel: 'MEDIUM',
          },
          supportingEvidenceIds: ['ev_telemetry_temp_high'],
          createdAt: new Date().toISOString(),
        },
      ];

      this.proposals.set(tenantId, defaultProposals);

      // Seed default feedback conditions
      this.feedbackConditions.set(`prop_cmms_filter_${tenantId}`, {
        sensorEntityId: 'SENS-TEMP-COOLANT',
        metric: 'Spindle Temperature',
        baselineValue: 74.2,
        targetHealthyValue: 60.0,
        comparisonOperator: '<=',
        maxEvaluationWindowMinutes: 60,
      });

      this.feedbackConditions.set(`prop_scada_setpoint_${tenantId}`, {
        sensorEntityId: 'SENS-PRESS-CHILLER',
        metric: 'Coolant Pressure',
        baselineValue: 1.8,
        targetHealthyValue: 4.0,
        comparisonOperator: '>=',
        maxEvaluationWindowMinutes: 10,
      });
    }

    return this.proposals.get(tenantId)!;
  }

  public static getProposal(proposalId: string, tenantId: string): ActionProposal | undefined {
    return this.getProposalsForTenant(tenantId).find((p) => p.id === proposalId);
  }

  public static approveProposal(
    proposalId: string,
    tenantId: string,
    approverEmail: string,
    approverRole: string
  ): ActionProposal {
    const proposal = this.getProposal(proposalId, tenantId);
    if (!proposal) {
      throw new Error(`Action proposal '${proposalId}' not found for tenant '${tenantId}'`);
    }

    // Role-based permission verification
    const roleHierarchy = ['VIEWER', 'OPERATOR', 'MAINTENANCE_SUPERVISOR', 'PROCESS_ENGINEER', 'PLANT_MANAGER', 'SUPER_ADMIN'];
    const userRoleIdx = roleHierarchy.indexOf(approverRole);
    const requiredRoleIdx = roleHierarchy.indexOf(proposal.requiredApprovalRole);

    if (userRoleIdx < requiredRoleIdx) {
      throw new Error(
        `Insufficient privilege: Action requires '${proposal.requiredApprovalRole}' approval, but user has '${approverRole}'`
      );
    }

    proposal.approvalStatus = 'APPROVED';
    proposal.approvedBy = `${approverEmail} (${approverRole})`;
    proposal.approvedAt = new Date().toISOString();

    return proposal;
  }

  public static rejectProposal(
    proposalId: string,
    tenantId: string,
    rejecterEmail: string,
    reason: string
  ): ActionProposal {
    const proposal = this.getProposal(proposalId, tenantId);
    if (!proposal) {
      throw new Error(`Action proposal '${proposalId}' not found for tenant '${tenantId}'`);
    }

    proposal.approvalStatus = 'REJECTED';
    proposal.rejectionReason = reason;

    return proposal;
  }

  public static async executeProposal(
    proposalId: string,
    tenantId: string,
    customContext?: Partial<GuardrailContext>
  ): Promise<ActionExecutionResult> {
    const proposal = this.getProposal(proposalId, tenantId);
    if (!proposal) {
      throw new Error(`Action proposal '${proposalId}' not found for tenant '${tenantId}'`);
    }

    const machineState = customContext?.machineOperatingState || this.getMachineState(proposal.targetEntityId);

    const context: GuardrailContext = {
      machineOperatingState: machineState,
      historicalActionTimestampsInLastHour: customContext?.historicalActionTimestampsInLastHour || [],
      assetMaxOperatingEnvelope: customContext?.assetMaxOperatingEnvelope,
    };

    const result = await ActionDispatcher.dispatchAction(proposal, context);

    if (result.status === 'SUCCESS') {
      proposal.approvalStatus = 'EXECUTED';
      this.executions.set(result.executionId, result);
    }

    return result;
  }

  public static async verifyExecutionFeedback(
    executionId: string,
    proposalId: string,
    tenantId: string,
    currentSensorValue: number,
    elapsedMinutes: number
  ): Promise<FeedbackEvaluationResult> {
    const proposal = this.getProposal(proposalId, tenantId);
    if (!proposal) {
      throw new Error(`Proposal '${proposalId}' not found`);
    }

    let condition = this.feedbackConditions.get(proposalId);
    if (!condition) {
      // Default fallback condition
      condition = {
        sensorEntityId: 'SENS-GENERIC',
        metric: 'Asset Health Metric',
        baselineValue: 70,
        targetHealthyValue: 60,
        comparisonOperator: '<=',
        maxEvaluationWindowMinutes: 30,
      };
    }

    return FeedbackLoopEngine.evaluateFeedback(
      executionId,
      proposal,
      condition,
      currentSensorValue,
      elapsedMinutes
    );
  }

  public static async triggerManualRollback(
    executionId: string,
    proposalId: string,
    tenantId: string
  ) {
    const proposal = this.getProposal(proposalId, tenantId);
    if (!proposal) {
      throw new Error(`Proposal '${proposalId}' not found`);
    }

    const rollbackResult = await ActionDispatcher.dispatchRollback(executionId, proposal);
    proposal.approvalStatus = 'ROLLED_BACK';

    return rollbackResult;
  }
}
