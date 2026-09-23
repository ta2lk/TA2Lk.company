/**
 * Industrial Brain — Human Review Queue
 * Phase 3: Entity Resolution & Knowledge Graph
 *
 * Governs low-confidence entity match candidates (0.5 <= confidence < 0.8)
 * requiring human engineering verification.
 */

import { HumanReviewItem, OntologyNode } from './ontology.ts';
import { EntityResolver } from './entityResolver.ts';
import { GraphStore } from './graphStore.ts';
import { db } from '../../src/backend/db/database.ts';

export class HumanReviewQueue {
  private queue: Map<string, HumanReviewItem> = new Map();

  public enqueue(item: HumanReviewItem): HumanReviewItem {
    this.queue.set(item.id, item);
    return item;
  }

  public getPending(tenantId: string): HumanReviewItem[] {
    return Array.from(this.queue.values())
      .filter((it) => it.tenantId === tenantId && it.status === 'PENDING')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getItem(id: string, tenantId: string): HumanReviewItem | null {
    const item = this.queue.get(id);
    if (!item || item.tenantId !== tenantId) return null;
    return item;
  }

  /**
   * Applies human decision to approve merge or reject as separate entity
   */
  public decide(
    itemId: string,
    tenantId: string,
    decision: 'APPROVED' | 'REJECTED',
    reviewerEmail: string,
    notes?: string,
    graph?: GraphStore
  ): { item: HumanReviewItem; mergedNode?: OntologyNode } {
    const item = this.getItem(itemId, tenantId);
    if (!item) {
      throw new Error(`Review item ${itemId} not found in tenant ${tenantId}`);
    }

    if (item.status !== 'PENDING') {
      throw new Error(`Review item ${itemId} has already been decided (${item.status})`);
    }

    item.status = decision;
    item.reviewedBy = reviewerEmail;
    item.reviewedAt = new Date().toISOString();
    item.decisionNotes = notes;

    let mergedNode: OntologyNode | undefined;

    if (decision === 'APPROVED' && graph) {
      const primary = graph.getNode(item.primaryNodeId, tenantId);
      if (primary) {
        mergedNode = EntityResolver.mergeNodes(primary, item.proposedMergedNode);
        graph.addNode(mergedNode);
      }
    }

    // Append tamper-evident audit record
    db.appendAuditLog({
      tenantId,
      actorId: reviewerEmail,
      actorEmail: reviewerEmail,
      actorRole: 'PROCESS_ENGINEER',
      action: decision === 'APPROVED' ? 'ENTITY_MERGE_APPROVED' : 'ENTITY_MERGE_REJECTED',
      resourceType: 'KNOWLEDGE_GRAPH',
      resourceId: item.primaryNodeId,
      details: {
        reviewItemId: item.id,
        confidence: item.confidence,
        decision,
        notes,
      },
      status: 'SUCCESS',
    });

    return { item, mergedNode };
  }
}

export const globalReviewQueue = new HumanReviewQueue();
