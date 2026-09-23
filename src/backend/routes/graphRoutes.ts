/**
 * Industrial Brain — Knowledge Graph & Entity Resolution API Routes
 * Phase 3: Entity Resolution & Knowledge Graph
 */

import { Router, Response } from 'express';
import crypto from 'crypto';
import { authenticate, enforceTenant, requirePermission, AuthenticatedRequest } from '../middleware/auth.ts';
import { globalGraphStore } from '../../../packages/graph/graphStore.ts';
import { EntityResolver } from '../../../packages/graph/entityResolver.ts';
import { ContextBuilder } from '../../../packages/graph/contextBuilder.ts';
import { globalReviewQueue } from '../../../packages/graph/humanReviewQueue.ts';
import { db } from '../db/database.ts';

export const graphRouter = Router();

graphRouter.use(authenticate);

/**
 * GET /api/v1/graph/nodes
 * Lists graph nodes for the active tenant
 */
graphRouter.get(
  '/nodes',
  enforceTenant,
  requirePermission('knowledge:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const entityType = req.query.entityType as any;
      const nodes = globalGraphStore.listNodesForTenant(req.tenant!.id, entityType);
      res.status(200).json({
        tenantId: req.tenant!.id,
        total: nodes.length,
        nodes,
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
    }
  }
);

/**
 * POST /api/v1/graph/nodes
 * Adds a new node or automatically resolves and merges if matching entity exists
 */
graphRouter.post(
  '/nodes',
  enforceTenant,
  requirePermission('knowledge:explore'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { canonicalId, name, entityType, category, attributes, description } = req.body;

      if (!canonicalId || !name || !entityType || !category) {
        res.status(400).json({ error: 'Bad Request', message: 'canonicalId, name, entityType, and category are required' });
        return;
      }

      const existingNodes = globalGraphStore.listNodesForTenant(req.tenant!.id);
      const resolution = EntityResolver.resolve(existingNodes, {
        tenantId: req.tenant!.id,
        canonicalId,
        name,
        entityType,
        category,
        description,
        attributes: attributes || {},
        sourceRefs: [{ sourceId: 'API_DIRECT', externalId: canonicalId, confidence: 1.0 }],
      });

      if (resolution.reviewItem) {
        globalReviewQueue.enqueue(resolution.reviewItem);
      }

      globalGraphStore.addNode(resolution.node);

      res.status(resolution.action === 'CREATED_NEW' ? 201 : 200).json(resolution);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
    }
  }
);

/**
 * POST /api/v1/graph/edges
 * Adds a bi-directional edge between two nodes in the active tenant
 */
graphRouter.post(
  '/edges',
  enforceTenant,
  requirePermission('knowledge:explore'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { sourceId, targetId, relationType, properties, confidence, validFrom, validTo } = req.body;

      if (!sourceId || !targetId || !relationType) {
        res.status(400).json({ error: 'Bad Request', message: 'sourceId, targetId, and relationType are required' });
        return;
      }

      const edge = globalGraphStore.addEdge(req.tenant!.id, sourceId, targetId, relationType, {
        properties,
        confidence,
        validFrom,
        validTo,
      });

      res.status(201).json({ edge });
    } catch (err) {
      res.status(400).json({ error: 'Graph Edge Error', message: (err as Error).message });
    }
  }
);

/**
 * GET /api/v1/graph/nodes/:id/context
 * Fast Context Builder: Returns 360-degree context dossier in < 100ms
 */
graphRouter.get(
  '/nodes/:id/context',
  enforceTenant,
  requirePermission('knowledge:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const dossier = ContextBuilder.buildContext(globalGraphStore, req.params.id, req.tenant!.id);
      res.status(200).json(dossier);
    } catch (err) {
      res.status(404).json({ error: 'Context Build Error', message: (err as Error).message });
    }
  }
);

/**
 * GET /api/v1/graph/traverse
 * Bi-directional graph traversal API (Upstream, Downstream, Both)
 */
graphRouter.get(
  '/traverse',
  enforceTenant,
  requirePermission('knowledge:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const startNodeId = req.query.nodeId as string;
      const direction = (req.query.direction as any) || 'BOTH';
      const maxDepth = req.query.maxDepth ? parseInt(req.query.maxDepth as string, 10) : 3;

      if (!startNodeId) {
        res.status(400).json({ error: 'Bad Request', message: 'nodeId parameter is required' });
        return;
      }

      const result = globalGraphStore.traverse(startNodeId, req.tenant!.id, {
        direction,
        maxDepth,
      });

      res.status(200).json(result);
    } catch (err) {
      res.status(400).json({ error: 'Traversal Error', message: (err as Error).message });
    }
  }
);

/**
 * GET /api/v1/graph/review-queue
 * Lists pending candidates requiring human review (confidence 0.5 - 0.8)
 */
graphRouter.get(
  '/review-queue',
  enforceTenant,
  requirePermission('knowledge:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const items = globalReviewQueue.getPending(req.tenant!.id);
      res.status(200).json({ items });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
    }
  }
);

/**
 * POST /api/v1/graph/review-queue/:id/decide
 * Applies human decision (APPROVED / REJECTED)
 */
graphRouter.post(
  '/review-queue/:id/decide',
  enforceTenant,
  requirePermission('action:approve'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { decision, notes } = req.body;
      if (!decision || (decision !== 'APPROVED' && decision !== 'REJECTED')) {
        res.status(400).json({ error: 'Bad Request', message: 'decision must be APPROVED or REJECTED' });
        return;
      }

      const result = globalReviewQueue.decide(
        req.params.id,
        req.tenant!.id,
        decision,
        req.user!.email,
        notes,
        globalGraphStore
      );

      res.status(200).json(result);
    } catch (err) {
      res.status(400).json({ error: 'Review Decision Error', message: (err as Error).message });
    }
  }
);

/**
 * GET /api/v1/graph/stats
 * Returns knowledge graph topology metrics for the active tenant
 */
graphRouter.get(
  '/stats',
  enforceTenant,
  requirePermission('knowledge:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const nodes = globalGraphStore.listNodesForTenant(req.tenant!.id);
      const edges = globalGraphStore.listEdgesForTenant(req.tenant!.id);

      const categoryCounts: Record<string, number> = {};
      const typeCounts: Record<string, number> = {};

      for (const n of nodes) {
        categoryCounts[n.category] = (categoryCounts[n.category] || 0) + 1;
        typeCounts[n.entityType] = (typeCounts[n.entityType] || 0) + 1;
      }

      res.status(200).json({
        tenantId: req.tenant!.id,
        totalNodes: nodes.length,
        totalEdges: edges.length,
        categoryCounts,
        typeCounts,
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
    }
  }
);

/**
 * POST /api/v1/graph/seed-demo
 * Seeds the standard Plant -> Line -> Machine -> Sensor hierarchy for the active tenant
 */
graphRouter.post(
  '/seed-demo',
  enforceTenant,
  requirePermission('knowledge:explore'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const tid = req.tenant!.id;

      // 1. Plant
      const plant = globalGraphStore.addNode({
        id: `node_plant_${tid}`,
        tenantId: tid,
        canonicalId: 'PLANT-STUTTGART-01',
        entityType: 'Plant',
        category: 'ENTERPRISE',
        name: 'Stuttgart Advanced Assembly Plant #1',
        attributes: { location: 'Baden-Württemberg', squareMeters: 45000 },
        sourceRefs: [{ sourceId: 'ERP_SYSTEM', externalId: 'PLANT-01', confidence: 1.0 }],
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 2. Line
      const line = globalGraphStore.addNode({
        id: `node_line_${tid}`,
        tenantId: tid,
        canonicalId: 'LINE-TURBINE-04',
        entityType: 'Line',
        category: 'ENTERPRISE',
        name: 'Turbine Blade Precision Machining Line 4',
        attributes: { targetCycleTimeSec: 180, taktTimeSec: 210 },
        sourceRefs: [{ sourceId: 'MES_SYSTEM', externalId: 'LINE-04', confidence: 1.0 }],
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 3. Machine
      const machine = globalGraphStore.addNode({
        id: `node_mach_${tid}`,
        tenantId: tid,
        canonicalId: 'CNC-5AXIS-03',
        entityType: 'Machine',
        category: 'ASSET',
        name: 'Hermle C42U 5-Axis Milling Center',
        attributes: { model: 'C42U Dynamic', spindleRPM: 18000, installationYear: 2024 },
        sourceRefs: [{ sourceId: 'CMMS_SYSTEM', externalId: 'EQ-CNC-03', confidence: 1.0 }],
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 4. Sensors
      const vibSensor = globalGraphStore.addNode({
        id: `node_sens_vib_${tid}`,
        tenantId: tid,
        canonicalId: 'SENS-VIB-SPINDLE',
        entityType: 'Sensor',
        category: 'ASSET',
        name: 'Spindle Bearing Triaxial Vibration Transducer',
        attributes: { metric: 'vibration_rms', unit: 'mm/s', sampleRateHz: 1000 },
        sourceRefs: [{ sourceId: 'SCADA_IOT', externalId: 'TAG_VIB_01', confidence: 1.0 }],
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const tempSensor = globalGraphStore.addNode({
        id: `node_sens_temp_${tid}`,
        tenantId: tid,
        canonicalId: 'SENS-TEMP-COOLANT',
        entityType: 'Sensor',
        category: 'ASSET',
        name: 'High-Pressure Coolant Temperature Thermocouple',
        attributes: { metric: 'temperature', unit: 'celsius', thresholdMax: 65 },
        sourceRefs: [{ sourceId: 'SCADA_IOT', externalId: 'TAG_TEMP_02', confidence: 1.0 }],
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 5. Work Order & Product
      const workOrder = globalGraphStore.addNode({
        id: `node_wo_${tid}`,
        tenantId: tid,
        canonicalId: 'WO-2026-9041',
        entityType: 'WorkOrder',
        category: 'PROCESS',
        name: 'Work Order #9041: Ti-6Al-4V Aero Blisk Batch',
        attributes: { plannedQty: 80, completedQty: 42, status: 'IN_PROGRESS' },
        sourceRefs: [{ sourceId: 'SAP_ERP', externalId: 'ORD-9041', confidence: 1.0 }],
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const product = globalGraphStore.addNode({
        id: `node_sku_${tid}`,
        tenantId: tid,
        canonicalId: 'SKU-AERO-BLADE-TI',
        entityType: 'SKU',
        category: 'PRODUCT',
        name: 'Titanium Aerospace Stator Blade (Stage 3)',
        attributes: { materialGrade: 'Ti-6Al-4V', weightKg: 1.45 },
        sourceRefs: [{ sourceId: 'PLM_SYSTEM', externalId: 'PRD-AERO-03', confidence: 1.0 }],
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 6. Maintenance Order
      const mntOrder = globalGraphStore.addNode({
        id: `node_mnt_${tid}`,
        tenantId: tid,
        canonicalId: 'MNT-PREV-2026-04',
        entityType: 'MaintenanceOrder',
        category: 'MAINTENANCE',
        name: 'Q3 Scheduled Spindle Calibration & Lubrication',
        attributes: { scheduledDate: '2026-09-30', intervalHours: 500, status: 'SCHEDULED' },
        sourceRefs: [{ sourceId: 'MAXIMO_CMMS', externalId: 'WO-MNT-04', confidence: 1.0 }],
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Edges (Bi-directional relationships)
      globalGraphStore.addEdge(tid, plant.id, line.id, 'CONTAINS');
      globalGraphStore.addEdge(tid, line.id, machine.id, 'CONTAINS');
      globalGraphStore.addEdge(tid, machine.id, vibSensor.id, 'HAS_SENSOR');
      globalGraphStore.addEdge(tid, machine.id, tempSensor.id, 'HAS_SENSOR');
      globalGraphStore.addEdge(tid, machine.id, workOrder.id, 'EXECUTES');
      globalGraphStore.addEdge(tid, workOrder.id, product.id, 'PRODUCES');
      globalGraphStore.addEdge(tid, machine.id, mntOrder.id, 'MAINTAINED_BY');

      // Also create a sample Human Review item for demonstration
      globalReviewQueue.enqueue({
        id: `hrq_demo_${tid}`,
        tenantId: tid,
        primaryNodeId: machine.id,
        candidateNodeId: `cand_cnc_${tid}`,
        confidence: 0.74, // 0.74 triggers Human Review Queue!
        status: 'PENDING',
        matchReasons: [
          'Same entity type: Machine',
          'Name similarity: 72.5% ("Hermle C42U 5-Axis Milling Center" vs "Hermle C42-U CNC Milling Machine")',
        ],
        proposedMergedNode: {
          name: 'Hermle C42U 5-Axis Milling Center',
          attributes: { ...machine.attributes, secondaryAssetTag: 'CNC-STUTTGART-ALT-03' },
        },
        createdAt: new Date().toISOString(),
      });

      db.appendAuditLog({
        tenantId: tid,
        actorId: req.user!.email,
        actorEmail: req.user!.email,
        actorRole: req.membership!.role,
        action: 'KNOWLEDGE_GRAPH_INITIALIZED',
        resourceType: 'KNOWLEDGE_GRAPH',
        resourceId: machine.id,
        details: { plant: plant.name, line: line.name, machine: machine.name, nodesCount: 7, edgesCount: 7 },
        status: 'SUCCESS',
      });

      res.status(201).json({
        message: 'Standard Industrial Knowledge Graph seeded successfully',
        seededNodes: [plant, line, machine, vibSensor, tempSensor, workOrder, product, mntOrder],
      });
    } catch (err) {
      res.status(500).json({ error: 'Seed Graph Error', message: (err as Error).message });
    }
  }
);
