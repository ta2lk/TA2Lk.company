/**
 * Industrial Brain — CSV Ingestion Engine
 * Phase 2: Real Data Connectors
 */

import crypto from 'crypto';
import { SchemaDetector } from './schemaDetector.ts';
import { SchemaDetectionResult, IngestionOptions } from './types.ts';

export interface CsvParseResult {
  schema: SchemaDetectionResult;
  rows: Record<string, unknown>[];
  rawChecksum: string;
}

export class CsvEngine {
  /**
   * Parses raw CSV text, detects delimiter, discovers schema, and extracts records
   */
  public static parseCsv(csvContent: string): CsvParseResult {
    const rawChecksum = crypto.createHash('sha256').update(csvContent, 'utf8').digest('hex');

    const lines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      throw new Error('CSV content is empty');
    }

    const delimiter = SchemaDetector.detectDelimiter(lines.slice(0, 10));
    const headerLine = lines[0];
    const headers = SchemaDetector.splitLine(headerLine, delimiter).map((h) =>
      h.replace(/^["']|["']$/g, '').trim()
    );

    if (headers.length === 0 || headers.some((h) => !h)) {
      throw new Error('CSV headers must be non-empty strings');
    }

    const rows: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = SchemaDetector.splitLine(lines[i], delimiter);
      const row: Record<string, unknown> = {};

      for (let j = 0; j < headers.length; j++) {
        const rawVal = values[j] !== undefined ? values[j].replace(/^["']|["']$/g, '').trim() : null;
        row[headers[j]] = rawVal;
      }

      rows.push(row);
    }

    const schema = SchemaDetector.analyzeRows(rows);
    schema.detectedDelimiter = delimiter;

    return {
      schema,
      rows,
      rawChecksum,
    };
  }

  /**
   * Generates a preview with type inference
   */
  public static previewCsv(csvContent: string, maxRows = 10): SchemaDetectionResult {
    const result = this.parseCsv(csvContent);
    return {
      ...result.schema,
      previewRows: result.rows.slice(0, maxRows),
    };
  }
}
