/**
 * Industrial Brain — Reasoning Engine Entry & Default Incident Scenarios
 * Phase 5: Reasoning & Decision Engine
 */

import { IncidentInput, RCAEngine } from './rcaEngine.ts';
import { CorrelationEngine } from './correlationEngine.ts';
import { globalSearchEngine } from '../search/index.ts';
import { globalGraphStore } from '../graph/graphStore.ts';
import { RCAResult } from './types.ts';

export class ReasoningService {
  private static activeIncidents: Map<string, IncidentInput[]> = new Map();

  public static getIncidentsForTenant(tenantId: string): IncidentInput[] {
    if (!this.activeIncidents.has(tenantId)) {
      // Seed default real industrial incident scenario
      const mach = globalGraphStore.listNodesForTenant(tenantId).find((n) => n.entityType === 'Machine');
      const defaultMachId = mach ? mach.id : `node_mach_${tenantId}`;

      const defaultIncident: IncidentInput = {
        id: `inc_spindle_overheat_${tenantId}`,
        tenantId,
        targetEntityId: defaultMachId,
        errorCode: 'E-4012',
        description: 'CNC-5AXIS-03 spindle bearing temperature climbed past 68°C safety threshold during titanium aero-blade contouring.',
        activeWorkOrderId: `node_wo_${tenantId}`,
        telemetry: [
          {
            entityId: 'SENS-TEMP-COOLANT',
            metric: 'Coolant Temperature',
            value: 74.2,
            threshold: 68.0,
            timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
          },
          {
            entityId: 'SENS-PRESS-CHILLER',
            metric: 'Coolant Circuit Pressure',
            value: 1.8,
            threshold: 4.2,
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          },
          {
            entityId: 'SENS-VIB-SPINDLE',
            metric: 'Spindle Bearing Vibration',
            value: 4.2,
            threshold: 4.5,
            timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          },
        ],
        operatorNotes: 'Operator noticed sudden spindle feed hold alarm while running work order WO-2026-9041.',
      };

      this.activeIncidents.set(tenantId, [defaultIncident]);
    }
    return this.activeIncidents.get(tenantId)!;
  }

  public static runRCA(incidentId: string, tenantId: string): RCAResult {
    const incidents = this.getIncidentsForTenant(tenantId);
    let incident = incidents.find((i) => i.id === incidentId);

    if (!incident) {
      // Fallback to first available or synthesized
      incident = incidents[0];
    }

    return RCAEngine.analyzeIncident(incident, globalSearchEngine, globalGraphStore);
  }
}
