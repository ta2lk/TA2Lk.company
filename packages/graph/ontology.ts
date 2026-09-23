/**
 * Industrial Brain — Phase 3: Core Industrial Ontologies
 * Defines the standard domain entities and bi-directional relationships
 * for smart manufacturing and enterprise operations.
 */

export type EntityCategory =
  | 'ENTERPRISE'
  | 'ASSET'
  | 'PRODUCT'
  | 'PROCESS'
  | 'QUALITY'
  | 'MAINTENANCE';

export type EnterpriseType = 'Plant' | 'Line' | 'Cell' | 'Station' | 'Worker';
export type AssetType = 'Machine' | 'Component' | 'Sensor' | 'Tool';
export type ProductType = 'SKU' | 'Batch' | 'Serial' | 'Material';
export type ProcessType = 'WorkOrder' | 'Operation' | 'Recipe' | 'Parameter';
export type QualityType = 'Inspection' | 'Defect' | 'Deviation' | 'Scrap';
export type MaintenanceType = 'MaintenanceOrder' | 'FailureMode' | 'SparePart';

export type IndustrialEntityType =
  | EnterpriseType
  | AssetType
  | ProductType
  | ProcessType
  | QualityType
  | MaintenanceType;

export type RelationType =
  | 'CONTAINS'          // Enterprise hierarchy: Plant contains Line, Machine contains Component
  | 'PART_OF'           // Inverse of CONTAINS
  | 'HAS_SENSOR'        // Machine has Sensor
  | 'MONITORS'          // Inverse of HAS_SENSOR (Sensor monitors Machine)
  | 'PRODUCES'          // Line/Machine produces SKU/Batch
  | 'PRODUCED_ON'       // Inverse of PRODUCES
  | 'EXECUTES'          // Machine/Station executes WorkOrder
  | 'EXECUTED_BY'       // Inverse of EXECUTES
  | 'MAINTAINED_BY'     // Machine has MaintenanceOrder
  | 'TARGETS_ASSET'     // Inverse of MAINTAINED_BY
  | 'OPERATED_BY'       // Station operated by Worker
  | 'OPERATES'          // Inverse of OPERATED_BY
  | 'CAUSED_BY'         // Defect caused by FailureMode / Machine
  | 'LEADS_TO_DEFECT'   // Inverse of CAUSED_BY
  | 'USES_SPARE_PART'   // MaintenanceOrder uses SparePart
  | 'USED_IN';          // Inverse of USES_SPARE_PART

export interface OntologyNode {
  id: string;
  tenantId: string;
  canonicalId: string;      // Normalized identity
  entityType: IndustrialEntityType;
  category: EntityCategory;
  name: string;
  description?: string;
  attributes: Record<string, unknown>;
  sourceRefs: Array<{ sourceId: string; externalId: string; confidence: number }>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface OntologyEdge {
  id: string;
  tenantId: string;
  sourceId: string;
  targetId: string;
  relationType: RelationType;
  inverseRelationType?: RelationType;
  properties: Record<string, unknown>;
  confidence: number;
  validFrom: string;
  validTo?: string | null;  // Time-aware graph support
  createdAt: string;
}

export interface EntityMatchCandidate {
  primaryNodeId: string;
  candidateNodeId: string;
  confidence: number;
  matchReasons: string[];
  fieldDiffs: Record<string, { existing: unknown; incoming: unknown }>;
}

export interface HumanReviewItem {
  id: string;
  tenantId: string;
  primaryNodeId: string;
  candidateNodeId: string;
  confidence: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  matchReasons: string[];
  proposedMergedNode: Partial<OntologyNode>;
  reviewedBy?: string;
  reviewedAt?: string;
  decisionNotes?: string;
  createdAt: string;
}
