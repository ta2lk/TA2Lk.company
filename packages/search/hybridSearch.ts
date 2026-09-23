/**
 * Industrial Brain — Hybrid Search Engine with Reciprocal Rank Fusion (RRF)
 * Phase 4: Context Engine & Hybrid Search
 *
 * Fuses BM25 exact keyword retrieval, Semantic Vector Search, and
 * Knowledge Graph entity proximity in < 200ms with strict multi-tenancy.
 */

import { DocumentChunk, IndustrialDocument, HybridSearchResult, SearchResultItem } from './types.ts';
import { IndustrialDocumentChunker } from './documentChunker.ts';
import { BM25Engine } from './bm25Engine.ts';
import { VectorEngine } from './vectorEngine.ts';
import { GraphStore } from '../graph/graphStore.ts';

export class HybridSearchEngine {
  private bm25: BM25Engine;
  private graphStore: GraphStore;

  // Documents and Chunks storage: tenantId -> list
  private documents: Map<string, IndustrialDocument> = new Map();
  private chunks: Map<string, DocumentChunk> = new Map();

  constructor(graphStore?: GraphStore) {
    this.bm25 = new BM25Engine();
    this.graphStore = graphStore || new GraphStore();
  }

  public indexDocument(doc: IndustrialDocument, knownCanonicalIds: string[] = []): DocumentChunk[] {
    const chunks = IndustrialDocumentChunker.chunkDocument(doc, { knownEntityCanonicalIds: knownCanonicalIds });
    this.addDocument(doc, chunks);
    return chunks;
  }

  public addDocument(doc: IndustrialDocument, docChunks: DocumentChunk[]): void {
    this.documents.set(doc.id, doc);
    for (const chunk of docChunks) {
      if (!chunk.embedding) {
        chunk.embedding = VectorEngine.generateEmbedding(chunk.content);
      }
      this.chunks.set(chunk.id, chunk);
      this.bm25.indexChunk(chunk);
    }
  }

  public getDocumentsForTenant(tenantId: string): IndustrialDocument[] {
    return Array.from(this.documents.values()).filter((d) => d.tenantId === tenantId);
  }

  public getChunksForTenant(tenantId: string): DocumentChunk[] {
    return Array.from(this.chunks.values()).filter((c) => c.tenantId === tenantId);
  }

  /**
   * Executes Hybrid Search fusing BM25, Semantic Vector, and Graph Traversal using RRF
   */
  public search(
    query: string,
    tenantId: string,
    options: {
      targetEntityId?: string;
      topK?: number;
      rrfConstantK?: number;
    } = {}
  ): HybridSearchResult {
    const startTime = performance.now();
    const topK = options.topK || 10;
    const k = options.rrfConstantK || 60; // Standard RRF smoothing constant

    const candidateChunks = this.getChunksForTenant(tenantId);
    if (candidateChunks.length === 0) {
      return {
        query,
        tenantId,
        totalHits: 0,
        results: [],
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
      };
    }

    // 1. Channel 1: BM25 Exact Keyword Search
    const bm25Hits = this.bm25.search(query, tenantId, candidateChunks);

    // 2. Channel 2: Semantic Vector Cosine Similarity Search
    const vectorHits = VectorEngine.search(query, tenantId, candidateChunks, 30);

    // 3. Channel 3: Knowledge Graph Traversal & Entity Linking Proximity
    // Find entities relevant to query or targetEntityId
    const graphRelevance = new Map<string, number>(); // chunkId -> score
    let targetEntityNodes: string[] = [];

    if (options.targetEntityId) {
      try {
        const traversal = this.graphStore.traverse(options.targetEntityId, tenantId, {
          direction: 'BOTH',
          maxDepth: 2,
        });
        targetEntityNodes = traversal.nodes.map((n) => n.id).concat(options.targetEntityId);
      } catch {
        targetEntityNodes = [options.targetEntityId];
      }
    }

    // Score chunks that reference target or connected graph entities
    for (const chunk of candidateChunks) {
      let gScore = 0;
      for (const linkedId of chunk.linkedEntityIds) {
        if (targetEntityNodes.includes(linkedId)) {
          gScore += 1.0;
        }
        // Also check if canonicalId of an entity appears in query
        const node = this.graphStore.getNode(linkedId, tenantId);
        if (node && query.toLowerCase().includes(node.canonicalId.toLowerCase())) {
          gScore += 2.0;
        }
      }
      if (gScore > 0) {
        graphRelevance.set(chunk.id, gScore);
      }
    }

    // Sort graph candidates to establish rank
    const graphRanked = Array.from(graphRelevance.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([chunkId]) => chunkId);

    // Map ranks for each channel
    const bm25RankMap = new Map<string, number>();
    bm25Hits.forEach((h, idx) => bm25RankMap.set(h.chunkId, idx + 1));

    const vectorRankMap = new Map<string, number>();
    vectorHits.forEach((h, idx) => vectorRankMap.set(h.chunkId, idx + 1));

    const graphRankMap = new Map<string, number>();
    graphRanked.forEach((chunkId, idx) => graphRankMap.set(chunkId, idx + 1));

    // 4. Reciprocal Rank Fusion (RRF)
    // RRF_score = sum(1 / (k + rank_i))
    const allCandidateIds = new Set<string>([
      ...bm25RankMap.keys(),
      ...vectorRankMap.keys(),
      ...graphRankMap.keys(),
    ]);

    const rrfScores = new Map<string, { rrf: number; reasons: string[] }>();

    for (const chunkId of allCandidateIds) {
      let score = 0;
      const reasons: string[] = [];

      // Channel 1: BM25
      const bm25Rank = bm25RankMap.get(chunkId);
      if (bm25Rank !== undefined) {
        score += 1.0 / (k + bm25Rank);
        const bm25Hit = bm25Hits.find((h) => h.chunkId === chunkId);
        if (bm25Hit?.matchReasons) {
          reasons.push(...bm25Hit.matchReasons);
        }
      }

      // Channel 2: Vector
      const vecRank = vectorRankMap.get(chunkId);
      if (vecRank !== undefined) {
        score += 1.0 / (k + vecRank);
        const vecHit = vectorHits.find((h) => h.chunkId === chunkId);
        reasons.push(`Semantic similarity: ${(vecHit!.similarity * 100).toFixed(1)}% (Rank #${vecRank})`);
      }

      // Channel 3: Graph
      const gRank = graphRankMap.get(chunkId);
      if (gRank !== undefined) {
        score += 1.5 / (k + gRank); // Slight boost for verified Knowledge Graph linkage
        reasons.push(`Knowledge Graph entity proximity (Rank #${gRank})`);
      }

      rrfScores.set(chunkId, {
        rrf: Math.round(score * 10000) / 10000,
        reasons,
      });
    }

    // Assemble final ranked items
    const rankedResults: SearchResultItem[] = [];

    const sortedChunks = Array.from(rrfScores.entries())
      .sort((a, b) => b[1].rrf - a[1].rrf)
      .slice(0, topK);

    for (const [chunkId, rrfData] of sortedChunks) {
      const chunk = this.chunks.get(chunkId);
      if (!chunk) continue;
      const document = this.documents.get(chunk.documentId);
      if (!document) continue;

      const bm25Item = bm25Hits.find((h) => h.chunkId === chunkId);
      const vecItem = vectorHits.find((h) => h.chunkId === chunkId);
      const gScore = graphRelevance.get(chunkId) || 0;

      rankedResults.push({
        chunk,
        document,
        bm25Score: bm25Item?.score || 0,
        vectorScore: vecItem?.similarity || 0,
        graphScore: gScore,
        rrfScore: rrfData.rrf,
        matchReasons: rrfData.reasons,
      });
    }

    const duration = performance.now() - startTime;

    return {
      query,
      tenantId,
      totalHits: rankedResults.length,
      results: rankedResults,
      executionTimeMs: Math.round(duration * 100) / 100,
    };
  }
}
