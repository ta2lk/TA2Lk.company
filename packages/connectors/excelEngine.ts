/**
 * Industrial Brain — Excel (XLSX) Ingestion Engine
 * Phase 2: Real Data Connectors
 */

import * as XLSX from 'xlsx';
import crypto from 'crypto';
import { SchemaDetector } from './schemaDetector.ts';
import { SchemaDetectionResult } from './types.ts';

export interface SheetInfo {
  name: string;
  rowCount: number;
  columnCount: number;
}

export interface WorkbookInspection {
  sheetNames: string[];
  sheets: SheetInfo[];
  rawChecksum: string;
}

export interface ExcelParseResult {
  sheetName: string;
  schema: SchemaDetectionResult;
  rows: Record<string, unknown>[];
  rawChecksum: string;
}

export class ExcelEngine {
  /**
   * Inspects an Excel workbook buffer to discover all sheets and metrics
   */
  public static inspectWorkbook(buffer: Buffer): WorkbookInspection {
    const rawChecksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheets: SheetInfo[] = workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
      return {
        name,
        rowCount: range.e.r - range.s.r + 1,
        columnCount: range.e.c - range.s.c + 1,
      };
    });

    return {
      sheetNames: workbook.SheetNames,
      sheets,
      rawChecksum,
    };
  }

  /**
   * Parses a specific sheet or the first sheet if none specified
   */
  public static parseSheet(buffer: Buffer, targetSheetName?: string): ExcelParseResult {
    const rawChecksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheetName = targetSheetName || workbook.SheetNames[0];
    if (!workbook.Sheets[sheetName]) {
      throw new Error(`Sheet '${sheetName}' does not exist in workbook. Available sheets: ${workbook.SheetNames.join(', ')}`);
    }

    const sheet = workbook.Sheets[sheetName];
    // Convert to array of row objects
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      raw: false, // Return strings for consistent type inference
    });

    if (rawRows.length === 0) {
      throw new Error(`Sheet '${sheetName}' is empty.`);
    }

    const schema = SchemaDetector.analyzeRows(rawRows);

    return {
      sheetName,
      schema,
      rows: rawRows,
      rawChecksum,
    };
  }

  /**
   * Creates an in-memory sample XLSX buffer for testing and demonstration
   */
  public static createSampleWorkbook(): Buffer {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Production Orders
    const ordersData = [
      { OrderID: 'PO-9001', LineID: 'L1', ProductSKU: 'P-STEEL-44', TargetQty: 1200, Status: 'IN_PROGRESS', Timestamp: '2026-09-23T08:00:00Z' },
      { OrderID: 'PO-9002', LineID: 'L2', ProductSKU: 'P-POLY-12', TargetQty: 450, Status: 'COMPLETED', Timestamp: '2026-09-23T09:30:00Z' },
      { OrderID: 'PO-9003', LineID: 'L1', ProductSKU: 'P-ALUM-88', TargetQty: 2500, Status: 'QUEUED', Timestamp: '2026-09-23T11:15:00Z' },
    ];
    const wsOrders = XLSX.utils.json_to_sheet(ordersData);
    XLSX.utils.book_append_sheet(wb, wsOrders, 'ProductionOrders');

    // Sheet 2: Maintenance Logs
    const maintenanceData = [
      { MaintenanceID: 'MNT-101', EquipmentID: 'CNC-MILL-03', Technician: 'K. Weber', Issue: 'Spindle vibration > 4.2mm/s', ActionTaken: 'Rebalanced bearing mount', Resolved: 'true' },
      { MaintenanceID: 'MNT-102', EquipmentID: 'INJECT-PRESS-01', Technician: 'M. Thorne', Issue: 'Hydraulic pressure drop', ActionTaken: 'Replaced high-pressure seal', Resolved: 'true' },
    ];
    const wsMaintenance = XLSX.utils.json_to_sheet(maintenanceData);
    XLSX.utils.book_append_sheet(wb, wsMaintenance, 'MaintenanceLogs');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
