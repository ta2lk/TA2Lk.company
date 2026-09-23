/**
 * Industrial Brain — Okapi BM25 Exact Keyword Search Engine
 * Phase 4: Context Engine & Hybrid Search
 *
 * Implements token-level BM25 scoring with specialized industrial token preservation
 * (e.g. error codes, chemical formulas, model names) and exact code boosting.
 */

import { DocumentChunk } from './types.ts';

export class BM25Engine {
  private k1: number = 1.5;
  private b: number = 0.75;

  // Tenant-partitioned inverted indices: tenantId -> term -> Set<chunkId>
  private invertedIndex: Map<string, Map<string, Set<string>>> = new Map();
  // Tenant-partitioned chunk term frequencies: tenantId -> chunkId -> Map<term, freq>
  private termFrequencies: Map<string, Map<string, Map<string, number>>> = new Map();
  // Tenant-partitioned chunk lengths: tenantId -> chunkId -> length
  private docLengths: Map<string, Map<string, number>> = new Map();

  /**
   * Tokenizes text preserving industrial identifiers (hyphens, dots, underscores)
   */
  public static tokenize(text: string): string[] {
    const rawTokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\-_./]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 0);

    const tokens: string[] = [];
    for (const t of rawTokens) {
      tokens.push(t);
      // If token has hyphens (e.g. e-4012), index both combined and split parts
      if (t.includes('-')) {
        tokens.push(t.replace(/-/g, ''));
      }
    }
    return tokens;
  }

  public indexChunk(chunk: DocumentChunk): void {
    const tid = chunk.tenantId;
    if (!this.invertedIndex.has(tid)) {
      this.invertedIndex.set(tid, new Map());
      this.termFrequencies.set(tid, new Map());
      this.docLengths.set(tid, new Map());
    }

    const tenantInverted = this.invertedIndex.get(tid)!;
    const tenantTf = this.termFrequencies.get(tid)!;
    const tenantLengths = this.docLengths.get(tid)!;

    const tokens = BM25Engine.tokenize(chunk.content);
    tenantLengths.set(chunk.id, tokens.length);

    const tfMap = new Map<string, number>();
    for (const token of tokens) {
      tfMap.set(token, (tfMap.get(token) || 0) + 1);

      if (!tenantInverted.has(token)) {
        tenantInverted.set(token, new Set());
      }
      tenantInverted.get(token)!.add(chunk.id);
    }
    tenantTf.set(chunk.id, tfMap);

    // Also index explicit error codes with high weight
    for (const ec of chunk.errorCodes) {
      const ecToken = ec.toLowerCase();
      if (!tenantInverted.has(ecToken)) {
        tenantInverted.set(ecToken, new Set());
      }
      tenantInverted.get(ecToken)!.add(chunk.id);
      tfMap.set(ecToken, (tfMap.get(ecToken) || 0) + 5);
    }
  }

  public removeChunk(chunkId: string, tenantId: string): void {
    const tenantInverted = this.invertedIndex.get(tenantId);
    const tenantTf = this.termFrequencies.get(tenantId);
    const tenantLengths = this.docLengths.get(tenantId);

    if (!tenantInverted || !tenantTf || !tenantLengths) return;

    tenantTf.delete(chunkId);
    tenantLengths.delete(chunkId);

    for (const chunkSet of tenantInverted.values()) {
      chunkSet.delete(chunkId);
    }
  }

  /**
   * Scores a set of chunks against a query using Okapi BM25 with exact-code boosting
   */
  public search(
    query: string,
    tenantId: string,
    candidateChunks: DocumentChunk[]
  ): Array<{ chunkId: string; score: number; matchReasons: string[] }> {
    const tenantInverted = this.invertedIndex.get(tenantId);
    const tenantTf = this.termFrequencies.get(tenantId);
    const tenantLengths = this.docLengths.get(tenantId);

    if (!tenantInverted || !tenantTf || !tenantLengths || candidateChunks.length === 0) {
      return [];
    }

    const queryTokens = BM25Engine.tokenize(query);
    if (queryTokens.length === 0) return [];

    const N = candidateChunks.length;
    let totalLength = 0;
    for (const len of tenantLengths.values()) {
      totalLength += len;
    }
    const avgdl = totalLength / (tenantLengths.size || 1);

    const scores = new Map<string, { score: number; reasons: string[] }>();

    for (const qTerm of queryTokens) {
      const docSet = tenantInverted.get(qTerm);
      const nq = docSet ? docSet.size : 0;
      if (nq === 0) continue;

      // Robertson-Spärck Jones IDF formula
      const idf = Math.log(1 + (N - nq + 0.5) / (nq + 0.5));

      for (const chunk of candidateChunks) {
        if (chunk.tenantId !== tenantId) continue; // Strict tenant isolation

        const tfMap = tenantTf.get(chunk.id);
        const f = tfMap?.get(qTerm) || 0;
        if (f === 0) continue;

        const docLen = tenantLengths.get(chunk.id) || 1;
        const numerator = f * (this.k1 + 1);
        const denominator = f + this.k1 * (1 - this.b + this.b * (docLen / avgdl));
        const termScore = idf * (numerator / denominator);

        if (!scores.has(chunk.id)) {
          scores.set(chunk.id, { score: 0, reasons: [] });
        }
        const entry = scores.get(chunk.id)!;
        entry.score += termScore;
        entry.reasons.push(`Matched keyword "${qTerm}" (TF: ${f}, IDF: ${idf.toFixed(2)})`);
      }
    }

    // Exact Error Code and Phrase Boost
    const normalizedQuery = query.trim().toUpperCase();
    for (const chunk of candidateChunks) {
      if (chunk.tenantId !== tenantId) continue;

      // Check if query matches error code exactly
      const hasExactErrorCode = chunk.errorCodes.some(
        (ec) => ec.toUpperCase() === normalizedQuery || normalizedQuery.includes(ec.toUpperCase())
      );

      if (hasExactErrorCode) {
        if (!scores.has(chunk.id)) {
          scores.set(chunk.id, { score: 0, reasons: [] });
        }
        const entry = scores.get(chunk.id)!;
        entry.score += 50.0; // High deterministic boost for exact error code hit!
        entry.reasons.unshift(`Exact industrial error code match [${normalizedQuery}]`);
      }

      // Check section header match
      if (chunk.sectionHeader && normalizedQuery.includes(chunk.sectionHeader.toUpperCase())) {
        if (!scores.has(chunk.id)) {
          scores.set(chunk.id, { score: 0, reasons: [] });
        }
        const entry = scores.get(chunk.id)!;
        entry.score += 10.0;
        entry.reasons.push(`Matched section header "${chunk.sectionHeader}"`);
      }
    }

    return Array.from(scores.entries())
      .map(([chunkId, data]) => ({
        chunkId,
        score: Math.round(data.score * 100) / 100,
        matchReasons: data.reasons,
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
  }
}
