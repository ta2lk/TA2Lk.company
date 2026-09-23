/**
 * Industrial Brain — Search Engine Module Entry & Default Seeder
 * Phase 4: Context Engine & Hybrid Search
 */

import crypto from 'crypto';
import { HybridSearchEngine } from './hybridSearch.ts';
import { IndustrialDocumentChunker } from './documentChunker.ts';
import { globalGraphStore } from '../graph/graphStore.ts';
import { IndustrialDocument } from './types.ts';

export const globalSearchEngine = new HybridSearchEngine(globalGraphStore);

/**
 * Seeds standard technical documentation (Manuals, SOPs, Troubleshooting Guides) for a tenant
 */
export function seedStandardIndustrialDocuments(tenantId: string): IndustrialDocument[] {
  const doc1: IndustrialDocument = {
    id: `doc_manual_${tenantId}`,
    tenantId,
    title: 'Hermle C42U 5-Axis Milling Center Maintenance Manual & Alarm Codes',
    docType: 'MANUAL',
    sourceFile: 'C42U_Manual_Rev2026.pdf',
    mimeType: 'application/pdf',
    content: `# Hermle C42U 5-Axis Milling Center Technical Specification & Maintenance Guide

## 1. Machine Operating Specifications
The Hermle C42U Dynamic 5-axis machining center operates under precision industrial conditions.
- Spindle Max Speed: 18000 RPM
- Coolant Circuit Pressure: 4.2 bar
- Hydraulic Clamping Pressure: 180 bar
- High Pressure Coolant Delivery: 250 bar
- Axis Travel (X/Y/Z): 800 mm / 800 mm / 550 mm
- Rapid Traverse Rate: 60 m/s

## 2. Alarm and Error Code Diagnostic Matrix
The following matrix details critical alarm codes and corrective maintenance actions:

| Error Code | Fault Description | Immediate Protective Action | Corrective Maintenance Action |
| --- | --- | --- | --- |
| E-4012 | Spindle Bearing Over-Temperature (>68°C) | Spindle Emergency Halt | Verify coolant chiller flow at 4.2 bar, replace micron filter, inspect thermocouple SENS-TEMP-COOLANT |
| E-4015 | Hydraulic Clamping Pressure Loss (<180 bar) | Abort Tool Change Cycle | Inspect proportional valve PV-02, refill HLP-46 hydraulic fluid, verify line pressure |
| ERR-HYD-04 | High-Pressure Coolant Pump Cavitation | Pump Throttle to 30% | Clear swarf chip basket, check intake filter, confirm 250 bar delivery pump seal integrity |
| ALM-902 | Axis Drive Position Deviation | Feed Hold on Axis C | Calibrate absolute rotary glass scales, inspect Heidenhain encoder cable |

## 3. Lubrication & Preventative Maintenance Schedule
- Inspect spindle oil-air lubrication every 250 operating hours.
- Verify central grease reservoir pressure every 500 operating hours.`,
    metadata: {
      author: 'Hermle AG Technical Support',
      revision: '2026.4',
      applicableModel: 'C42U Dynamic',
    },
    linkedEntityIds: ['CNC-5AXIS-03', 'SENS-TEMP-COOLANT', 'SENS-VIB-SPINDLE'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const doc2: IndustrialDocument = {
    id: `doc_sop_${tenantId}`,
    tenantId,
    title: 'Standard Operating Procedure: Aerospace Titanium Turbine Blade Machining',
    docType: 'SOP',
    sourceFile: 'SOP_AERO_TI_BLADE_04.md',
    mimeType: 'text/markdown',
    content: `# Standard Operating Procedure: Ti-6Al-4V Aerospace Blade Machining

## 1. Purpose and Scope
This SOP defines parameters for roughing and semi-finishing titanium alloy (Ti-6Al-4V) aero stator blades on 5-axis CNC machining centers.

## 2. Pre-Operation Checklist
1. Verify work order WO-2026-9041 matches loaded raw billet material cert (Grade 5 Titanium).
2. Measure tool runout on solid carbide ball-nose endmill (maximum allowable runout: 0.003 mm).
3. Ensure coolant concentration is calibrated between 8.5% and 10.0%.

## 3. Cutting Parameters
- Cutting Speed (Vc): 65 m/min
- Spindle Speed: 4200 RPM
- Feed per tooth (fz): 0.08 mm
- Radial depth of cut (ae): 0.5 mm
- Axial depth of cut (ap): 12.0 mm

## 4. Quality Inspection Criteria
Inspect finished blade profile using laser scanning arm. Maximum allowable surface deviation is +/- 0.015 mm.`,
    metadata: {
      department: 'Aerospace Machining Division',
      docCode: 'SOP-AERO-04',
      validity: '2026-2027',
    },
    linkedEntityIds: ['WO-2026-9041', 'SKU-AERO-BLADE-TI', 'LINE-TURBINE-04'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const chunks1 = IndustrialDocumentChunker.chunkDocument(doc1, {
    knownEntityCanonicalIds: ['CNC-5AXIS-03', 'Hermle C42U'],
  });
  globalSearchEngine.addDocument(doc1, chunks1);

  const chunks2 = IndustrialDocumentChunker.chunkDocument(doc2, {
    knownEntityCanonicalIds: ['WO-2026-9041', 'SKU-AERO-BLADE-TI'],
  });
  globalSearchEngine.addDocument(doc2, chunks2);

  return [doc1, doc2];
}
