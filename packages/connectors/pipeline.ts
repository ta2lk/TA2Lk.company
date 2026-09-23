/**
 * Industrial Brain — Unified Ingestion Pipeline
 * Phase 2: Real Data Connectors
 *
 * Implements raw data isolation, schema normalization, deduplication,
 * Dead-Letter Queue (DLQ) error isolation, and tamper-evident audit trail logging.
 */

import crypto from 'crypto';
import {
  ConnectorType,
  IngestionJob,
  NormalizedRecord,
  DeadLetterItem,
  IngestionOptions,
} from './types.ts';
import { db } from '../../src/backend/db/database.ts';

export interface PipelineExecutionResult {
  job: IngestionJob;
  normalizedRecords: NormalizedRecord[];
  deadLetterItems: DeadLetterItem[];
  metrics: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    duplicateRows: number;
    durationMs: number;
    recordsPerSecond: number;
  };
}

export class IngestionPipeline {
  /**
   * Executes the full pipeline for any connector source
   */
  public static async execute(
    tenantId: string,
    dataSourceId: string,
    sourceType: ConnectorType,
    rawRows: Record<string, unknown>[],
    initiatedBy: string,
    options: IngestionOptions = {}
  ): Promise<PipelineExecutionResult> {
    const startTime = Date.now();
    const entityType = options.entityType || 'INDUSTRIAL_RECORD';
    const enableDeduplication = options.enableDeduplication ?? true;

    // 1. Initialize Ingestion Job
    const job = db.createIngestionJob(tenantId, dataSourceId, sourceType, initiatedBy);

    const normalizedRecords: NormalizedRecord[] = [];
    const deadLetterItems: DeadLetterItem[] = [];
    const seenHashes = new Set<string>();

    let duplicateCount = 0;

    // 2. Process and validate rows
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];

      // Validate non-null row object
      if (!row || typeof row !== 'object' || Object.keys(row).length === 0) {
        deadLetterItems.push({
          id: `dlq_${crypto.randomBytes(10).toString('hex')}`,
          tenantId,
          dataSourceId,
          jobId: job.id,
          rowIndex: i + 1,
          rawRow: row,
          errorCode: 'EMPTY_OR_INVALID_ROW',
          errorMessage: 'Row payload is null, undefined, or empty object',
          failedAt: new Date().toISOString(),
          resolved: false,
        });
        continue;
      }

      // Check for required external ID or synthesize
      const externalIdCol = options.externalIdColumn || this.detectExternalIdColumn(row);
      const externalId = externalIdCol && row[externalIdCol] ? String(row[externalIdCol]) : `ext_${i + 1}`;

      // Calculate row checksum for deduplication
      const rowHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(row))
        .digest('hex');

      if (enableDeduplication) {
        if (seenHashes.has(rowHash)) {
          duplicateCount++;
          continue;
        }
        seenHashes.add(rowHash);
      }

      // Clean payload: strip dangerous injection strings
      const cleanedPayload: Record<string, unknown> = {};
      let hasError = false;

      for (const [key, val] of Object.entries(row)) {
        if (key.startsWith('__proto__') || key === 'constructor') {
          hasError = true;
          deadLetterItems.push({
            id: `dlq_${crypto.randomBytes(10).toString('hex')}`,
            tenantId,
            dataSourceId,
            jobId: job.id,
            rowIndex: i + 1,
            rawRow: row,
            errorCode: 'PROTOTYPE_POLLUTION_DETECTED',
            errorMessage: `Forbidden object key: '${key}'`,
            failedAt: new Date().toISOString(),
            resolved: false,
          });
          break;
        }
        cleanedPayload[key] = val;
      }

      if (hasError) continue;

      // Construct normalized record
      normalizedRecords.push({
        id: `rec_${crypto.randomBytes(12).toString('hex')}`,
        tenantId,
        dataSourceId,
        jobId: job.id,
        entityType,
        externalId,
        payload: cleanedPayload,
        schemaVersion: '1.0.0',
        ingestedAt: new Date().toISOString(),
        rowChecksum: rowHash,
      });
    }

    const durationMs = Math.max(Date.now() - startTime, 1);
    const recordsPerSecond = Math.round((normalizedRecords.length / (durationMs / 1000)) * 100) / 100;

    // 3. Determine final status
    let finalStatus: IngestionJob['status'] = 'COMPLETED';
    if (deadLetterItems.length > 0 && normalizedRecords.length > 0) {
      finalStatus = 'PARTIAL';
    } else if (deadLetterItems.length > 0 && normalizedRecords.length === 0) {
      finalStatus = 'FAILED';
    }

    // 4. Persist in Database strictly isolated by Tenant
    const updatedJob = db.updateIngestionJob(job.id, {
      status: finalStatus,
      totalRecords: rawRows.length,
      validRecords: normalizedRecords.length,
      errorRecords: deadLetterItems.length,
      duplicateRecords: duplicateCount,
      durationMs,
      completedAt: new Date().toISOString(),
    });

    db.insertNormalizedRecords(normalizedRecords);
    db.insertDeadLetterItems(deadLetterItems);

    // 5. Append Tamper-Evident Audit Trail Record
    db.appendAuditLog({
      tenantId,
      actorId: initiatedBy,
      actorEmail: initiatedBy,
      actorRole: 'PROCESS_ENGINEER',
      action: 'DATA_INGESTION_COMPLETED',
      resourceType: 'DATA_PIPELINE',
      resourceId: job.id,
      details: {
        dataSourceId,
        sourceType,
        totalRows: rawRows.length,
        validRows: normalizedRecords.length,
        errorRows: deadLetterItems.length,
        duplicateRows: duplicateCount,
        durationMs,
        finalStatus,
      },
      status: finalStatus === 'FAILED' ? 'FAILURE' : 'SUCCESS',
    });

    return {
      job: updatedJob,
      normalizedRecords,
      deadLetterItems,
      metrics: {
        totalRows: rawRows.length,
        validRows: normalizedRecords.length,
        errorRows: deadLetterItems.length,
        duplicateRows: duplicateCount,
        durationMs,
        recordsPerSecond,
      },
    };
  }

  private static detectExternalIdColumn(row: Record<string, unknown>): string | null {
    const candidates = ['id', 'ID', 'order_id', 'OrderID', 'order_number', 'telemetry_id', 'ticket_id', 'code', 'sku', 'SKU'];
    for (const c of candidates) {
      if (c in row && row[c]) return c;
    }
    return null;
  }
}
