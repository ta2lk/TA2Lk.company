/**
 * Industrial Brain — Entity Resolution Engine
 * Phase 3: Entity Resolution & Knowledge Graph
 *
 * Implements deterministic matching, fuzzy string similarity, conflict resolution,
 * confidence scoring, and strict Human Review Queue routing for low-confidence matches.
 */

import crypto from 'crypto';
import { OntologyNode, HumanReviewItem } from './ontology.ts';

export interface ResolutionResult {
  action: 'CREATED_NEW' | 'MERGED_AUTOMATIC' | 'QUEUED_FOR_REVIEW';
  node: OntologyNode;
  confidence: number;
  reviewItem?: HumanReviewItem;
  mergedFromId?: string;
}

export class EntityResolver {
  /**
   * Calculates Normalized Levenshtein distance between two strings (0.0 = completely different, 1.0 = identical)
   */
  public static calculateStringSimilarity(s1: string, s2: string): number {
    const a = s1.trim().toLowerCase();
    const b = s2.trim().toLowerCase();

    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;

    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    const distance = matrix[b.length][a.length];
    const maxLength = Math.max(a.length, b.length);
    return Math.max(0, 1.0 - distance / maxLength);
  }

  /**
   * Evaluates match confidence between an existing node and an incoming candidate
   */
  public static evaluateMatch(
    existing: OntologyNode,
    incoming: Partial<OntologyNode>
  ): { confidence: number; matchReasons: string[] } {
    const matchReasons: string[] = [];

    // Rule 1: Exact canonical ID or Serial Number match
    if (
      incoming.canonicalId &&
      existing.canonicalId.toLowerCase() === incoming.canonicalId.toLowerCase()
    ) {
      matchReasons.push(`Exact canonical ID match: "${existing.canonicalId}"`);
      return { confidence: 1.0, matchReasons };
    }

    // Rule 2: Exact serial / asset tag inside attributes
    const existingTag = (existing.attributes?.asset_tag || existing.attributes?.serial_number || existing.attributes?.order_number) as string;
    const incomingTag = (incoming.attributes?.asset_tag || incoming.attributes?.serial_number || incoming.attributes?.order_number) as string;

    if (existingTag && incomingTag && existingTag.toLowerCase() === incomingTag.toLowerCase()) {
      matchReasons.push(`Exact asset tag/serial match: "${existingTag}"`);
      return { confidence: 0.98, matchReasons };
    }

    // Rule 3: Fuzzy matching on Name & Type
    let totalScore = 0;
    let weightSum = 0;

    if (existing.entityType === incoming.entityType) {
      totalScore += 0.3;
      weightSum += 0.3;
      matchReasons.push(`Same entity type: ${existing.entityType}`);
    } else {
      return { confidence: 0.0, matchReasons: ['Entity types differ'] };
    }

    if (existing.name && incoming.name) {
      const nameSim = this.calculateStringSimilarity(existing.name, incoming.name);
      totalScore += nameSim * 0.5;
      weightSum += 0.5;
      if (nameSim > 0.6) {
        matchReasons.push(`Name similarity: ${(nameSim * 100).toFixed(1)}% ("${existing.name}" vs "${incoming.name}")`);
      }
    }

    // Check additional attribute overlaps (model, manufacturer)
    const existingModel = (existing.attributes?.model || existing.attributes?.product_id) as string;
    const incomingModel = (incoming.attributes?.model || incoming.attributes?.product_id) as string;

    if (existingModel && incomingModel) {
      const modelSim = this.calculateStringSimilarity(existingModel, incomingModel);
      totalScore += modelSim * 0.2;
      weightSum += 0.2;
      if (modelSim > 0.7) {
        matchReasons.push(`Model/Product similarity: ${(modelSim * 100).toFixed(1)}%`);
      }
    }

    const confidence = weightSum > 0 ? Math.round((totalScore / weightSum) * 100) / 100 : 0.0;
    return { confidence, matchReasons };
  }

  /**
   * Merges two nodes deterministically, keeping attribute history and incrementing version
   */
  public static mergeNodes(primary: OntologyNode, incoming: Partial<OntologyNode>): OntologyNode {
    const updatedAttributes = {
      ...primary.attributes,
      ...(incoming.attributes || {}),
    };

    const combinedSourceRefs = [
      ...primary.sourceRefs,
      ...(incoming.sourceRefs || []),
    ];

    return {
      ...primary,
      name: incoming.name && incoming.name.length > primary.name.length ? incoming.name : primary.name,
      description: incoming.description || primary.description,
      attributes: updatedAttributes,
      sourceRefs: combinedSourceRefs,
      version: primary.version + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Resolves an incoming node against existing nodes in the tenant
   */
  public static resolve(
    existingNodes: OntologyNode[],
    incoming: Partial<OntologyNode> & { tenantId: string; canonicalId: string; name: string; entityType: any; category: any }
  ): ResolutionResult {
    let bestMatch: { node: OntologyNode; confidence: number; matchReasons: string[] } | null = null;

    for (const node of existingNodes) {
      if (node.tenantId !== incoming.tenantId) continue; // Strict tenant isolation

      const evaluation = this.evaluateMatch(node, incoming);
      if (evaluation.confidence > (bestMatch?.confidence || 0)) {
        bestMatch = {
          node,
          confidence: evaluation.confidence,
          matchReasons: evaluation.matchReasons,
        };
      }
    }

    // High confidence (>= 0.80): Safe Automatic Merge
    if (bestMatch && bestMatch.confidence >= 0.80) {
      const merged = this.mergeNodes(bestMatch.node, incoming);
      return {
        action: 'MERGED_AUTOMATIC',
        node: merged,
        confidence: bestMatch.confidence,
        mergedFromId: bestMatch.node.id,
      };
    }

    // Ambiguous confidence (0.50 <= c < 0.80): Route to Human Review Queue!
    if (bestMatch && bestMatch.confidence >= 0.50) {
      const reviewItem: HumanReviewItem = {
        id: `hrq_${crypto.randomBytes(8).toString('hex')}`,
        tenantId: incoming.tenantId,
        primaryNodeId: bestMatch.node.id,
        candidateNodeId: `temp_${crypto.randomBytes(6).toString('hex')}`,
        confidence: bestMatch.confidence,
        status: 'PENDING',
        matchReasons: bestMatch.matchReasons,
        proposedMergedNode: {
          ...incoming,
          attributes: { ...bestMatch.node.attributes, ...(incoming.attributes || {}) },
        },
        createdAt: new Date().toISOString(),
      };

      // Create distinct node for now until human approval
      const newNode: OntologyNode = {
        id: `node_${crypto.randomBytes(8).toString('hex')}`,
        tenantId: incoming.tenantId,
        canonicalId: incoming.canonicalId,
        entityType: incoming.entityType,
        category: incoming.category,
        name: incoming.name,
        description: incoming.description,
        attributes: incoming.attributes || {},
        sourceRefs: incoming.sourceRefs || [],
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        action: 'QUEUED_FOR_REVIEW',
        node: newNode,
        confidence: bestMatch.confidence,
        reviewItem,
      };
    }

    // Low confidence (< 0.50): Create distinct new entity
    const newNode: OntologyNode = {
      id: `node_${crypto.randomBytes(8).toString('hex')}`,
      tenantId: incoming.tenantId,
      canonicalId: incoming.canonicalId,
      entityType: incoming.entityType,
      category: incoming.category,
      name: incoming.name,
      description: incoming.description,
      attributes: incoming.attributes || {},
      sourceRefs: incoming.sourceRefs || [],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      action: 'CREATED_NEW',
      node: newNode,
      confidence: 1.0,
    };
  }
}
