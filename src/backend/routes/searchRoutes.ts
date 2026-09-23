/**
 * Industrial Brain — Search & Context Engine API Routes
 * Phase 4: Context Engine & Hybrid Search
 */

import { Router, Response } from 'express';
import crypto from 'crypto';
import { authenticate, enforceTenant, requirePermission, AuthenticatedRequest } from '../middleware/auth.ts';
import { globalSearchEngine, seedStandardIndustrialDocuments } from '../../../packages/search/index.ts';
import { IndustrialDocumentChunker } from '../../../packages/search/documentChunker.ts';
import { ContextAssembler } from '../../../packages/search/contextAssembler.ts';
import { globalGraphStore } from '../../../packages/graph/graphStore.ts';
import { IndustrialDocument } from '../../../packages/search/types.ts';
import { db } from '../db/database.ts';

export const searchRouter = Router();

searchRouter.use(authenticate);

/**
 * GET /api/v1/search/hybrid
 * Executes Hybrid Search fusing BM25, Semantic Vector, and Graph Traversal using RRF (<200ms)
 */
searchRouter.get(
  '/hybrid',
  enforceTenant,
  requirePermission('knowledge:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const q = req.query.q as string;
      const targetEntityId = req.query.targetEntityId as string | undefined;
      const topK = req.query.topK ? parseInt(req.query.topK as string, 10) : 10;

      if (!q || q.trim().length === 0) {
        res.status(400).json({ error: 'Bad Request', message: 'Query parameter q is required' });
        return;
      }

      const results = globalSearchEngine.search(q, req.tenant!.id, {
        targetEntityId,
        topK,
      });

      res.status(200).json(results);
    } catch (err) {
      res.status(500).json({ error: 'Hybrid Search Error', message: (err as Error).message });
    }
  }
);

/**
 * GET /api/v1/search/context
 * Context Assembler: Generates rich multi-modal reasoning context
 */
searchRouter.get(
  '/context',
  enforceTenant,
  requirePermission('knowledge:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const q = (req.query.q as string) || '';
      const targetEntityId = req.query.targetEntityId as string | undefined;

      const assembled = ContextAssembler.assembleContext(
        q,
        req.tenant!.id,
        globalSearchEngine,
        globalGraphStore,
        targetEntityId
      );

      res.status(200).json(assembled);
    } catch (err) {
      res.status(500).json({ error: 'Context Assembly Error', message: (err as Error).message });
    }
  }
);

/**
 * POST /api/v1/documents/ingest
 * Ingests, chunks, indexes and links an industrial document
 */
searchRouter.post(
  '/documents/ingest',
  enforceTenant,
  requirePermission('data:ingest'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { title, docType, content, sourceFile, mimeType, metadata, linkedEntityIds } = req.body;

      if (!title || !docType || !content) {
        res.status(400).json({ error: 'Bad Request', message: 'title, docType, and content are required' });
        return;
      }

      const doc: IndustrialDocument = {
        id: `doc_${crypto.randomBytes(8).toString('hex')}`,
        tenantId: req.tenant!.id,
        title,
        docType,
        sourceFile,
        mimeType: mimeType || 'text/plain',
        content,
        metadata: metadata || {},
        linkedEntityIds: linkedEntityIds || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Retrieve known entity canonical IDs from tenant graph for automatic linking
      const tenantNodes = globalGraphStore.listNodesForTenant(req.tenant!.id);
      const knownIds = tenantNodes.map((n) => n.canonicalId);

      const chunks = IndustrialDocumentChunker.chunkDocument(doc, {
        knownEntityCanonicalIds: knownIds,
      });

      globalSearchEngine.addDocument(doc, chunks);

      // Audit ingestion
      db.appendAuditLog({
        tenantId: req.tenant!.id,
        actorId: req.user!.email,
        actorEmail: req.user!.email,
        actorRole: req.membership!.role,
        action: 'DOCUMENT_INGESTED',
        resourceType: 'TECHNICAL_DOCS',
        resourceId: doc.id,
        details: {
          title: doc.title,
          docType: doc.docType,
          chunkCount: chunks.length,
          tablesFound: chunks.filter((c) => c.isTable).length,
          errorCodesExtracted: Array.from(new Set(chunks.flatMap((c) => c.errorCodes))),
        },
        status: 'SUCCESS',
      });

      res.status(201).json({
        document: doc,
        chunkCount: chunks.length,
        chunks,
      });
    } catch (err) {
      res.status(500).json({ error: 'Document Ingestion Error', message: (err as Error).message });
    }
  }
);

/**
 * GET /api/v1/documents
 * Lists all documents in active tenant
 */
searchRouter.get(
  '/documents',
  enforceTenant,
  requirePermission('knowledge:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const docs = globalSearchEngine.getDocumentsForTenant(req.tenant!.id);
      res.status(200).json({
        tenantId: req.tenant!.id,
        total: docs.length,
        documents: docs,
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
    }
  }
);

/**
 * GET /api/v1/documents/:id/chunks
 * Lists chunks for a specific document
 */
searchRouter.get(
  '/documents/:id/chunks',
  enforceTenant,
  requirePermission('knowledge:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const allChunks = globalSearchEngine.getChunksForTenant(req.tenant!.id);
      const docChunks = allChunks.filter((c) => c.documentId === req.params.id);
      res.status(200).json({
        documentId: req.params.id,
        totalChunks: docChunks.length,
        chunks: docChunks,
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
    }
  }
);

/**
 * POST /api/v1/search/seed-docs
 * Seeds standard technical documentation (Hermle Manual + Aero SOP)
 */
searchRouter.post(
  '/seed-docs',
  enforceTenant,
  requirePermission('knowledge:explore'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const docs = seedStandardIndustrialDocuments(req.tenant!.id);

      db.appendAuditLog({
        tenantId: req.tenant!.id,
        actorId: req.user!.email,
        actorEmail: req.user!.email,
        actorRole: req.membership!.role,
        action: 'TECHNICAL_DOCS_INITIALIZED',
        resourceType: 'TECHNICAL_DOCS',
        resourceId: req.tenant!.id,
        details: { docCount: docs.length, titles: docs.map((d) => d.title) },
        status: 'SUCCESS',
      });

      res.status(201).json({
        message: 'Standard technical documents and error code matrix seeded successfully',
        documents: docs,
      });
    } catch (err) {
      res.status(500).json({ error: 'Seed Docs Error', message: (err as Error).message });
    }
  }
);
