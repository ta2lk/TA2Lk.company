/**
 * Industrial Brain — Semantic Vector Search Engine
 * Phase 4: Context Engine & Hybrid Search
 *
 * Computes semantic dense representations and performs high-speed cosine similarity matching
 * with strict multi-tenant isolation.
 */

import crypto from 'crypto';
import { DocumentChunk } from './types.ts';

export class VectorEngine {
  private static VECTOR_DIM = 64;

  /**
   * Generates a deterministic normalized semantic embedding vector
   * Uses word and subword n-gram feature hashing with L2 normalization
   */
  public static generateEmbedding(text: string): number[] {
    const vector = new Array(this.VECTOR_DIM).fill(0);
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 0);

    if (tokens.length === 0) return vector;

    for (const token of tokens) {
      // 1. Direct word token bucket
      const hash = crypto.createHash('md5').update(token).digest();
      const bucket = hash.readUInt16BE(0) % this.VECTOR_DIM;
      vector[bucket] += 2.0;

      // 2. Character n-grams for subword semantic capture (e.g. "heat" in "overheating", "therm" in "thermal")
      for (let i = 0; i <= token.length - 4; i++) {
        const ngram = token.substring(i, i + 4);
        const ngHash = crypto.createHash('md5').update(ngram).digest();
        const ngBucket = ngHash.readUInt16BE(0) % this.VECTOR_DIM;
        vector[ngBucket] += 0.5;
      }
    }

    // L2 Normalize
    let norm = 0;
    for (let i = 0; i < this.VECTOR_DIM; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < this.VECTOR_DIM; i++) {
        vector[i] = vector[i] / norm;
      }
    }

    return vector;
  }

  /**
   * Computes cosine similarity between two unit vectors (range: -1.0 to 1.0)
   */
  public static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    return Math.max(-1.0, Math.min(1.0, dot));
  }

  /**
   * Performs semantic vector search over candidate chunks
   */
  public static search(
    query: string,
    tenantId: string,
    candidateChunks: DocumentChunk[],
    topK: number = 20
  ): Array<{ chunkId: string; similarity: number }> {
    const queryVec = this.generateEmbedding(query);

    const scored: Array<{ chunkId: string; similarity: number }> = [];

    for (const chunk of candidateChunks) {
      if (chunk.tenantId !== tenantId) continue; // Strict tenant isolation

      const chunkVec = chunk.embedding || this.generateEmbedding(chunk.content);
      const sim = this.cosineSimilarity(queryVec, chunkVec);

      if (sim > 0.0) {
        scored.push({
          chunkId: chunk.id,
          similarity: Math.round(sim * 1000) / 1000,
        });
      }
    }

    return scored.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }
}
