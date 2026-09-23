/**
 * Industrial Brain — Schema Detector & Type Inference Engine
 * Phase 2: Real Data Connectors
 */

import { InferredColumnType, ColumnSchema, SchemaDetectionResult } from './types.ts';

export class SchemaDetector {
  /**
   * Detects the best delimiter from candidate delimiters
   */
  public static detectDelimiter(sampleLines: string[]): string {
    const candidates = [',', ';', '\t', '|'];
    let bestDelimiter = ',';
    let maxConsistency = -1;

    for (const d of candidates) {
      const counts = sampleLines.map((line) => this.splitLine(line, d).length);
      const isConsistent = counts.length > 0 && counts.every((c) => c === counts[0] && c > 1);
      if (isConsistent && counts[0] > maxConsistency) {
        maxConsistency = counts[0];
        bestDelimiter = d;
      }
    }

    return bestDelimiter;
  }

  /**
   * Splits a CSV line taking into account quoted strings
   */
  public static splitLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  /**
   * Infers the primitive data type of a string value
   */
  public static inferValueType(val: unknown): InferredColumnType {
    if (val === null || val === undefined || val === '') {
      return 'STRING';
    }

    const str = String(val).trim();

    // Boolean check
    if (/^(true|false|yes|no)$/i.test(str)) {
      return 'BOOLEAN';
    }

    // Integer check
    if (/^-?\d+$/.test(str)) {
      return 'INTEGER';
    }

    // Float check
    if (/^-?\d+\.\d+$/.test(str)) {
      return 'FLOAT';
    }

    // Timestamp check (ISO 8601 or common datetime)
    if (/^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/.test(str)) {
      const parsed = Date.parse(str);
      if (!isNaN(parsed)) {
        return 'TIMESTAMP';
      }
    }

    // JSON check
    if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
      try {
        JSON.parse(str);
        return 'JSON';
      } catch {
        // Not JSON
      }
    }

    return 'STRING';
  }

  /**
   * Analyzes an array of row objects to discover schema, types, nullability
   */
  public static analyzeRows(rows: Record<string, unknown>[], previewLimit = 10): SchemaDetectionResult {
    if (!rows || rows.length === 0) {
      return {
        totalColumns: 0,
        totalRowsDetected: 0,
        columns: [],
        previewRows: [],
        validationWarnings: ['Empty dataset provided.'],
      };
    }

    const columnNames = Object.keys(rows[0]);
    const columns: ColumnSchema[] = [];
    const warnings: string[] = [];

    for (const colName of columnNames) {
      let hasNull = false;
      const typeOccurrences: Record<InferredColumnType, number> = {
        INTEGER: 0,
        FLOAT: 0,
        BOOLEAN: 0,
        TIMESTAMP: 0,
        STRING: 0,
        JSON: 0,
      };

      const sampleValues: unknown[] = [];
      const distinctSet = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const rawVal = rows[i][colName];
        if (rawVal === null || rawVal === undefined || rawVal === '') {
          hasNull = true;
          continue;
        }

        const inferred = this.inferValueType(rawVal);
        typeOccurrences[inferred]++;
        distinctSet.add(String(rawVal));

        if (sampleValues.length < 5) {
          sampleValues.push(rawVal);
        }
      }

      // Determine predominant type
      let resolvedType: InferredColumnType = 'STRING';
      const nonNullCount = rows.length - (hasNull ? 1 : 0);

      if (typeOccurrences.INTEGER > 0 && typeOccurrences.FLOAT === 0 && typeOccurrences.STRING === 0) {
        resolvedType = 'INTEGER';
      } else if (typeOccurrences.FLOAT > 0 && typeOccurrences.STRING === 0) {
        resolvedType = 'FLOAT';
      } else if (typeOccurrences.TIMESTAMP > 0 && typeOccurrences.STRING === 0) {
        resolvedType = 'TIMESTAMP';
      } else if (typeOccurrences.BOOLEAN > 0 && typeOccurrences.STRING === 0) {
        resolvedType = 'BOOLEAN';
      } else if (typeOccurrences.JSON > 0) {
        resolvedType = 'JSON';
      }

      if (distinctSet.size === 1 && rows.length > 5) {
        warnings.push(`Column '${colName}' has only 1 distinct value across all rows.`);
      }

      columns.push({
        name: colName,
        inferredType: resolvedType,
        nullable: hasNull,
        sampleValues,
        uniqueCount: distinctSet.size,
      });
    }

    return {
      totalColumns: columns.length,
      totalRowsDetected: rows.length,
      columns,
      previewRows: rows.slice(0, previewLimit),
      validationWarnings: warnings,
    };
  }
}
