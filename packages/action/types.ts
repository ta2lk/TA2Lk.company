/**
 * Industrial Brain — Phase 6: Action & Closed-Loop Execution Types
 * Real Data -> Real Reasoning -> Real Decision -> Controlled Action
 */

export type MachineOperatingState =
  | 'IDLE'
  | 'RUNNING_NORMAL'
  | 'RUNNING_CRITICAL'
  | 'MAINTENANCE'
  | 'EMERGENCY_STOP';

export type ActionSystemTarget = 'CMMS' | 'ERP' | 'SOP' | 'SCADA';

export type ActionCategory = 'CORRECTIVE_ACTION' | 'PREVENTIVE_ACTION' | 'PARAMETER_ADJUSTMENT';

export type ActionApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTING' | 'EXECUTED' | 'ROLLED_BACK' | 'FAILED';

export interface GuardrailCheckResult {
  passed: boolean;
  checkName: string;
  reason: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL_BLOCK';
}

export interface PreExecutionGuardrailsResult {
  canExecute: boolean;
  blockedReason?: string;
  checks: GuardrailCheckResult[];
}

export interface RollbackPlan {
  enabled: boolean;
  systemTarget: ActionSystemTarget;
  commandType: string;
  rollbackParameters: Record<string, unknown>;
  autoTriggerOnFeedbackTimeoutSeconds: number;
}

export interface ActionProposal {
  id: string;
  tenantId: string;
  title: string;
  category: ActionCategory;
  targetEntityId: string;
  targetEntityName: string;
  systemTarget: ActionSystemTarget;
  commandType: string;
  parameters: Record<string, unknown>;
  requiredApprovalRole: 'VIEWER' | 'OPERATOR' | 'MAINTENANCE_SUPERVISOR' | 'PROCESS_ENGINEER' | 'PLANT_MANAGER';
  approvalStatus: ActionApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  rollbackPlan: RollbackPlan;
  estimatedImpact: {
    downtimeMinutes: number;
    estimatedCostUsd: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  supportingEvidenceIds: string[];
  createdAt: string;
}

export interface ActionExecutionResult {
  executionId: string;
  proposalId: string;
  tenantId: string;
  systemTarget: ActionSystemTarget;
  commandType: string;
  status: 'SUCCESS' | 'GUARDRAIL_BLOCKED' | 'FAILED' | 'ROLLED_BACK';
  dispatchedAt: string;
  externalReferenceId: string;
  guardrailsEvaluation: PreExecutionGuardrailsResult;
  auditChecksum: string;
}

export interface SensorFeedbackCondition {
  sensorEntityId: string;
  metric: string;
  baselineValue: number;
  targetHealthyValue: number;
  comparisonOperator: '<' | '<=' | '>' | '>=';
  maxEvaluationWindowMinutes: number;
}

export interface FeedbackEvaluationResult {
  executionId: string;
  isResolved: boolean;
  currentSensorValue: number;
  targetValue: number;
  status: 'RESOLVED_HEALTHY' | 'MONITORING_IN_PROGRESS' | 'DETERIORATING' | 'TIMEOUT_FAILED';
  rollbackTriggered: boolean;
  evaluationTimestamp: string;
  message: string;
}
