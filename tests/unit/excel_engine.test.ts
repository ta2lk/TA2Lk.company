/**
 * Phase 2 Unit Tests: Excel Ingestion Engine
 */

import { ExcelEngine } from '../../packages/connectors/excelEngine.ts';

export async function runExcelEngineTests(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
      console.log(`  [PASS] ${msg}`);
    } else {
      failed++;
      console.error(`  [FAIL] ${msg}`);
    }
  }

  console.log('\n--- 7. Running Excel (XLSX) Ingestion Engine Unit Tests ---');

  // Generate authentic binary workbook with multiple sheets
  const workbookBuffer = ExcelEngine.createSampleWorkbook();
  assert(Buffer.isBuffer(workbookBuffer) && workbookBuffer.length > 0, 'Generated valid binary XLSX workbook');

  // Test 1: Multi-sheet discovery
  const inspection = ExcelEngine.inspectWorkbook(workbookBuffer);
  assert(inspection.sheetNames.length === 2, 'Discovered exactly 2 sheets in workbook');
  assert(inspection.sheetNames.includes('ProductionOrders'), 'Discovered ProductionOrders sheet');
  assert(inspection.sheetNames.includes('MaintenanceLogs'), 'Discovered MaintenanceLogs sheet');

  // Test 2: Ingest Sheet 1 (ProductionOrders)
  const ordersResult = ExcelEngine.parseSheet(workbookBuffer, 'ProductionOrders');
  assert(ordersResult.sheetName === 'ProductionOrders', 'Parsed targeted sheet ProductionOrders');
  assert(ordersResult.rows.length === 3, 'Extracted 3 production order rows');
  assert(ordersResult.schema.columns.length === 6, 'Discovered 6 columns in orders sheet');
  assert(ordersResult.rows[0].OrderID === 'PO-9001', 'Extracted correct OrderID from row 0');

  // Test 3: Ingest Sheet 2 (MaintenanceLogs)
  const maintenanceResult = ExcelEngine.parseSheet(workbookBuffer, 'MaintenanceLogs');
  assert(maintenanceResult.sheetName === 'MaintenanceLogs', 'Parsed targeted sheet MaintenanceLogs');
  assert(maintenanceResult.rows.length === 2, 'Extracted 2 maintenance log rows');
  assert(maintenanceResult.rows[0].EquipmentID === 'CNC-MILL-03', 'Extracted correct EquipmentID from maintenance row');

  // Test 4: Target non-existent sheet throws descriptive error
  let nonExistentCaught = false;
  try {
    ExcelEngine.parseSheet(workbookBuffer, 'NonExistentSheet');
  } catch (err) {
    nonExistentCaught = (err as Error).message.includes('does not exist');
  }
  assert(nonExistentCaught, 'Rejection of non-existent sheet produces descriptive error');

  return { passed, failed };
}
