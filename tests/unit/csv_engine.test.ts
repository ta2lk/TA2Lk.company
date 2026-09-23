/**
 * Phase 2 Unit Tests: CSV Ingestion Engine
 */

import { CsvEngine } from '../../packages/connectors/csvEngine.ts';
import { SchemaDetector } from '../../packages/connectors/schemaDetector.ts';

export async function runCsvEngineTests(): Promise<{ passed: number; failed: number }> {
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

  console.log('\n--- 6. Running CSV Ingestion Engine Unit Tests ---');

  // Test 1: Comma delimiter with mixed industrial types
  const csvComma = `order_id,product_sku,planned_units,defect_rate,is_critical,recorded_at
WO-101,SKU-TITANIUM-01,150,0.015,true,2026-09-23T08:00:00Z
WO-102,SKU-ALUMINUM-02,500,0.002,false,2026-09-23T08:30:00Z
WO-103,SKU-STEEL-03,2400,0.041,true,2026-09-23T09:00:00Z`;

  const parsedComma = CsvEngine.parseCsv(csvComma);
  assert(parsedComma.schema.detectedDelimiter === ',', 'Auto-detected comma delimiter');
  assert(parsedComma.rows.length === 3, 'Extracted exactly 3 records');

  const cols = parsedComma.schema.columns;
  assert(cols.find((c) => c.name === 'planned_units')?.inferredType === 'INTEGER', 'Inferred planned_units as INTEGER');
  assert(cols.find((c) => c.name === 'defect_rate')?.inferredType === 'FLOAT', 'Inferred defect_rate as FLOAT');
  assert(cols.find((c) => c.name === 'is_critical')?.inferredType === 'BOOLEAN', 'Inferred is_critical as BOOLEAN');
  assert(cols.find((c) => c.name === 'recorded_at')?.inferredType === 'TIMESTAMP', 'Inferred recorded_at as TIMESTAMP');
  assert(cols.find((c) => c.name === 'product_sku')?.inferredType === 'STRING', 'Inferred product_sku as STRING');

  // Test 2: Semicolon delimiter (European industrial standard format)
  const csvSemicolon = `MachineID;Temperature;Pressure;Status
CNC_01;45.8;12.2;OK
CNC_02;51.2;12.1;WARNING
CNC_03;42.0;11.9;OK`;

  const parsedSemi = CsvEngine.parseCsv(csvSemicolon);
  assert(parsedSemi.schema.detectedDelimiter === ';', 'Auto-detected semicolon delimiter');
  assert(parsedSemi.rows.length === 3, 'Extracted records from semicolon CSV');
  assert(parsedSemi.schema.columns.length === 4, 'Discovered 4 distinct columns');

  // Test 3: Tab delimiter discovery
  const csvTab = `tag\tvalue\ttimestamp\nSENS_A\t100\t2026-09-23T10:00:00Z\nSENS_B\t200\t2026-09-23T10:01:00Z`;
  const parsedTab = CsvEngine.parseCsv(csvTab);
  assert(parsedTab.schema.detectedDelimiter === '\t', 'Auto-detected tab delimiter');

  // Test 4: Quoted fields handling commas inside text
  const csvQuotes = `id,description,qty\n1,"Part A, High Precision Grade",10\n2,"Part B, Sub-assembly",20`;
  const parsedQuotes = CsvEngine.parseCsv(csvQuotes);
  assert(parsedQuotes.rows[0].description === 'Part A, High Precision Grade', 'Correctly preserved comma inside quoted string');

  // Test 5: Empty CSV detection
  let caughtEmpty = false;
  try {
    CsvEngine.parseCsv('');
  } catch {
    caughtEmpty = true;
  }
  assert(caughtEmpty, 'Properly rejected empty CSV payload');

  return { passed, failed };
}
