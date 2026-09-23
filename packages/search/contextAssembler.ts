/**
 * Industrial Brain — Operational Context Assembler
 * Phase 4: Context Engine & Hybrid Search
 *
 * Synthesizes 360° Knowledge Graph entity state, connected telemetry,
 * and relevant manual/SOP documentation into an unified reasoning context.
 */

import { AssembledOperationalContext } from './types.ts';
import { HybridSearchEngine } from './hybridSearch.ts';
import { ContextBuilder } from '../graph/contextBuilder.ts';
import { GraphStore } from '../graph/graphStore.ts';

export class ContextAssembler {
  /**
   * Assembles rich multi-modal context for reasoning
   */
  public static assembleContext(
    query: string,
    tenantId: string,
    searchEngine: HybridSearchEngine,
    graphStore: GraphStore,
    targetEntityId?: string
  ): AssembledOperationalContext {
    const startTime = performance.now();

    // 1. Entity Context Dossier (if target entity provided)
    let entityDossier: any = null;
    let connectedGraphNodes: any[] = [];

    if (targetEntityId) {
      try {
        entityDossier = ContextBuilder.buildContext(graphStore, targetEntityId, tenantId);
        connectedGraphNodes = [
          entityDossier.targetEntity,
          ...entityDossier.connectedAssets.sensors,
          ...entityDossier.activeProcesses.workOrders,
          ...entityDossier.maintenanceHistory.maintenanceOrders,
        ];
      } catch (err) {
        console.warn(`Could not build entity dossier for ${targetEntityId}:`, err);
      }
    }

    // 2. Hybrid Search for relevant SOPs, Manuals, and Technical Specs
    const searchResult = searchEngine.search(query, tenantId, {
      targetEntityId,
      topK: 5,
    });

    // 3. Assemble unified prompt context
    const lines: string[] = [];
    lines.push('=== INDUSTRIAL OPERATIONAL CONTEXT ===');
    lines.push(`QUERY: ${query}`);
    lines.push(`TENANT: ${tenantId}`);
    lines.push(`TIMESTAMP: ${new Date().toISOString()}`);

    if (entityDossier) {
      lines.push('\n[PHYSICAL ASSET & TOPOLOGY]');
      lines.push(`Asset: ${entityDossier.targetEntity.name} (${entityDossier.targetEntity.canonicalId})`);
      lines.push(`Hierarchy: Plant: ${entityDossier.hierarchy.plant?.name || 'N/A'} // Line: ${entityDossier.hierarchy.line?.name || 'N/A'}`);
      lines.push(`Sensors (${entityDossier.connectedAssets.sensors.length}): ${entityDossier.connectedAssets.sensors.map((s: any) => s.name).join(', ') || 'None'}`);
      lines.push(`Active Work Orders: ${entityDossier.activeProcesses.workOrders.map((w: any) => w.name).join(' | ') || 'None'}`);
      lines.push(`Maintenance History: ${entityDossier.maintenanceHistory.maintenanceOrders.map((m: any) => m.name).join(' | ') || 'None'}`);
    }

    lines.push('\n[RETRIEVED TECHNICAL DOCUMENTATION (HYBRID BM25 + VECTOR + GRAPH)]');
    if (searchResult.results.length === 0) {
      lines.push('No matching technical manuals or SOP documents found.');
    } else {
      searchResult.results.forEach((item, idx) => {
        lines.push(`\n--- Document Source #${idx + 1}: ${item.document.title} [Type: ${item.document.docType}] ---`);
        if (item.chunk.sectionHeader) {
          lines.push(`Section: ${item.chunk.sectionHeader}`);
        }
        if (item.chunk.errorCodes.length > 0) {
          lines.push(`Error Codes Cited: ${item.chunk.errorCodes.join(', ')}`);
        }
        if (Object.keys(item.chunk.technicalSpecs).length > 0) {
          lines.push(`Specs: ${JSON.stringify(item.chunk.technicalSpecs)}`);
        }
        lines.push(`Content:\n${item.chunk.content}`);
      });
    }

    const duration = performance.now() - startTime;

    return {
      targetEntityId,
      query,
      tenantId,
      executionTimeMs: Math.round(duration * 100) / 100,
      entityDossier,
      relevantChunks: searchResult.results,
      connectedGraphNodes,
      assembledPromptContext: lines.join('\n'),
    };
  }
}
