/**
 * Industrial Brain — Phase 5: Reasoning & Decision Engine Types
 * Real Data -> Real Reasoning -> Real Decision -> Controlled Action
 */

export interface EvidenceItem {
  id: string;
  sourceType: 'SENSOR_TELEMETRY' | 'MAINTENANCE_LOG' | 'MANUAL_SPECIFICATION' | 'WORK_ORDER' | 'GRAPH_TOPOLOGY';
  sourceId: string;
  sourceName: string;
  dataPointOrQuote: string;
  recordedAt?: string;
  confidenceWeight: number; // 0.0 to 1.0
}

export interface RootCauseHypothesis {
  rank: number;
  failureMode: string;
  probability: number; // 0.0 to 1.0
  evidenceChain: EvidenceItem[];
  alternativeExplanation?: string;
  isCausationVerified: boolean; // Flag to differentiate Correlation vs Causation
}

export interface OperationalRecommendation {
  id: string;
  category: 'CORRECTIVE_ACTION' | 'PREVENTIVE_ACTION';
  title: string;
  description: string;
  targetEntityId: string;
  targetEntityName: string;
  requiredApprovalRole: 'PLANT_MANAGER' | 'PROCESS_ENGINEER' | 'MAINTENANCE_SUPERVISOR';
  estimatedImpact: {
    downtimeMinutes: number;
    estimatedCostUsd: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  supportingEvidenceIds: string[];
  actionPayload: {
    systemTarget: 'CMMS' | 'ERP' | 'SCADA' | 'SOP';
    commandType: string;
    parameters: Record<string, unknown>;
  };
}

export interface RCAResult {
  id: string;
  tenantId: string;
  incidentId: string;
  targetEntityId: string;
  targetEntityName: string;
  incidentSummary: string;
  executionTimeMs: number;
  rootCauses: RootCauseHypothesis[];
  recommendations: OperationalRecommendation[];
  assumptions: string[];
  unsupportedClaimsDetected: number; // Must strictly be 0 (Zero Hallucination)
  createdAt: string;
}

export interface CorrelatedPattern {
  id: string;
  patternType: 'MULTI_ENTITY_SPIKE' | 'PROGRESSIVE_DRIFT' | 'CROSS_SYSTEM_CASCADE';
  title: string;
  entitiesInvolved: string[];
  timeWindowSeconds: number;
  correlationCoefficient: number; // 0.0 to 1.0
  description: string;
  isCausalityConfirmed: boolean;
  warningNote?: string;
}
