/**
 * Industrial Brain — Phase 2: Real Data Connectors Types
 */

export type ConnectorType = 'CSV' | 'XLSX' | 'POSTGRES' | 'REST';

export type IngestionStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';

export type InferredColumnType = 'INTEGER' | 'FLOAT' | 'BOOLEAN' | 'TIMESTAMP' | 'STRING' | 'JSON';

export interface ColumnSchema {
  name: string;
  inferredType: InferredColumnType;
  nullable: boolean;
  sampleValues: unknown[];
  uniqueCount?: number;
}

export interface SchemaDetectionResult {
  detectedDelimiter?: string;
  totalColumns: number;
  totalRowsDetected: number;
  columns: ColumnSchema[];
  previewRows: Record<string, unknown>[];
  validationWarnings: string[];
}

export interface DataSource {
  id: string;
  tenantId: string;
  name: string;
  type: ConnectorType;
  status: 'ACTIVE' | 'ERROR' | 'SYNCING' | 'IDLE';
  config: Record<string, unknown>; // Masked credentials
  createdAt: string;
  updatedAt: string;
}

export interface IngestionJob {
  id: string;
  tenantId: string;
  dataSourceId: string;
  sourceType: ConnectorType;
  status: IngestionStatus;
  totalRecords: number;
  validRecords: number;
  errorRecords: number;
  duplicateRecords: number;
  durationMs: number;
  startedAt: string;
  completedAt?: string;
  initiatedBy: string;
  errorMessage?: string;
}

export interface RawRecord {
  id: string;
  tenantId: string;
  dataSourceId: string;
  jobId: string;
  rawPayload: Record<string, unknown>;
  checksum: string; // SHA256
  receivedAt: string;
}

export interface NormalizedRecord {
  id: string;
  tenantId: string;
  dataSourceId: string;
  jobId: string;
  entityType: string; // e.g. 'WORK_ORDER', 'MAINTENANCE_LOG', 'TELEMETRY'
  externalId: string;
  payload: Record<string, unknown>;
  schemaVersion: string;
  ingestedAt: string;
  rowChecksum: string;
}

export interface DeadLetterItem {
  id: string;
  tenantId: string;
  dataSourceId: string;
  jobId: string;
  rowIndex: number;
  rawRow: unknown;
  errorCode: string;
  errorMessage: string;
  failedAt: string;
  resolved: boolean;
}

export interface IngestionOptions {
  entityType?: string;
  externalIdColumn?: string;
  enableDeduplication?: boolean;
  strictSchemaValidation?: boolean;
  sheetName?: string; // For XLSX
}
