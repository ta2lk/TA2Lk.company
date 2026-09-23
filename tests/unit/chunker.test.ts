/**
 * Phase 4 Unit Tests: Industrial Document Chunker
 */

import { IndustrialDocumentChunker } from '../../packages/search/documentChunker.ts';
import { IndustrialDocument } from '../../packages/search/types.ts';

export async function runChunkerTests(): Promise<{ passed: number; failed: number }> {
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

  console.log('\n--- 15. Running Structure-Aware Industrial Chunker Unit Tests ---');

  const sampleDoc: IndustrialDocument = {
    id: 'doc_test_manual',
    tenantId: 'tenant_chunker_test',
    title: 'Hydraulic System Operations Manual',
    docType: 'MANUAL',
    mimeType: 'text/markdown',
    content: `# Hydraulic Unit System Specifications

## Section 1: Operating Pressures
The primary line pressure must be maintained at standard operational set points.
- Normal Working Pressure: 210 bar
- Maximum Allowable Pressure: 250 bar
- Reservoir Temperature: 65 °C

## Section 2: Fault and Error Diagnostics
Critical alarms indicate subsystem faults:

| Error Code | Subsystem | Action |
| --- | --- | --- |
| E-4012 | Spindle Chiller | Inspect valve PV-01 |
| ERR-HYD-04 | High-Pressure Pump | Replace suction seal |
| ALM-902 | Axis Drive | Check encoder |

## Section 3: Routine Maintenance
Check hydraulic fluid levels on a weekly basis.`,
    metadata: {},
    linkedEntityIds: ['EQ-HYD-01'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const chunks = IndustrialDocumentChunker.chunkDocument(sampleDoc, {
    knownEntityCanonicalIds: ['EQ-HYD-01', 'CNC-MILL-01'],
  });

  // Test 1: Chunks generated
  assert(chunks.length >= 3, `Generated ${chunks.length} structured chunks`);

  // Test 2: Table preserved intact
  const tableChunk = chunks.find((c) => c.isTable);
  assert(tableChunk !== undefined, 'Table successfully isolated into an atomic chunk (Zero mid-table cutting)');
  assert(tableChunk?.tableData !== undefined && tableChunk.tableData.length >= 3, 'Table contains all rows intact');

  // Test 3: Error codes extraction
  const allErrors = new Set(chunks.flatMap((c) => c.errorCodes));
  assert(allErrors.has('E-4012'), 'Extracted industrial error code E-4012');
  assert(allErrors.has('ERR-HYD-04'), 'Extracted industrial error code ERR-HYD-04');
  assert(allErrors.has('ALM-902'), 'Extracted industrial error code ALM-902');

  // Test 4: Technical specs extraction
  const allSpecs = chunks.map((c) => c.technicalSpecs);
  const hasPressure = allSpecs.some((s) => s['Normal Working Pressure'] === '210 bar');
  assert(hasPressure, 'Extracted key-value technical parameter (210 bar)');

  // Test 5: Entity Linking
  assert(chunks[0].linkedEntityIds.includes('EQ-HYD-01'), 'Chunk inherits entity linking (EQ-HYD-01)');

  return { passed, failed };
}
