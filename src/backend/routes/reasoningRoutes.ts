/**
 * Industrial Brain — Reasoning & Decision Engine API Routes
 * Phase 5: Reasoning & Decision Engine
 */

import { Router, Response } from 'express';
import crypto from 'crypto';
import { authenticate, enforceTenant, requirePermission, AuthenticatedRequest } from '../middleware/auth.ts';
import { ReasoningService } from '../../../packages/reasoning/index.ts';
import { RCAEngine, IncidentInput } from '../../../packages/reasoning/rcaEngine.ts';
import { CorrelationEngine, TelemetryPoint } from '../../../packages/reasoning/correlationEngine.ts';
import { globalSearchEngine } from '../../../packages/search/index.ts';
import { globalGraphStore } from '../../../packages/graph/graphStore.ts';
import { db } from '../db/database.ts';

export const reasoningRouter = Router();

reasoningRouter.use(authenticate);

/**
 * GET /api/v1/reasoning/incidents
 * Lists active factory anomalies/incidents for the tenant
 */
reasoningRouter.get(
  '/incidents',
  enforceTenant,
  requirePermission('knowledge:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const incidents = ReasoningService.getIncidentsForTenant(req.tenant!.id);
      res.status(200).json({
        tenantId: req.tenant!.id,
        total: incidents.length,
        incidents,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve incidents', message: (err as Error).message });
    }
  }
);

/**
 * POST /api/v1/reasoning/rca
 * Executes evidence-grounded Root Cause Analysis (0% Hallucination)
 */
reasoningRouter.post(
  '/rca',
  enforceTenant,
  requirePermission('action:propose'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { incidentId, customIncident } = req.body;

      let rcaResult;
      if (customIncident) {
        const incidentData: IncidentInput = {
          ...customIncident,
          tenantId: req.tenant!.id,
          id: customIncident.id || `inc_${crypto.randomBytes(6).toString('hex')}`,
        };
        rcaResult = RCAEngine.analyzeIncident(incidentData, globalSearchEngine, globalGraphStore);
      } else {
        const id = incidentId || ReasoningService.getIncidentsForTenant(req.tenant!.id)[0]?.id;
        rcaResult = ReasoningService.runRCA(id, req.tenant!.id);
      }

      // Record tamper-evident audit record for RCA reasoning
      db.appendAuditLog({
        tenantId: req.tenant!.id,
        actorId: req.user!.email,
        actorEmail: req.user!.email,
        actorRole: req.membership!.role,
        action: 'REASONING_RCA_EXECUTED',
        resourceType: 'REASONING_ENGINE',
        resourceId: rcaResult.id,
        details: {
          incidentId: rcaResult.incidentId,
          targetEntityId: rcaResult.targetEntityId,
          primaryRootCause: rcaResult.rootCauses[0]?.failureMode,
          probability: rcaResult.rootCauses[0]?.probability,
          recommendationsCount: rcaResult.recommendations.length,
          evidenceCount: rcaResult.rootCauses.flatMap((r) => r.evidenceChain).length,
          unsupportedClaims: rcaResult.unsupportedClaimsDetected,
        },
        status: 'SUCCESS',
      });

      res.status(200).json(rcaResult);
    } catch (err) {
      res.status(500).json({ error: 'RCA Execution Error', message: (err as Error).message });
    }
  }
);

/**
 * POST /api/v1/reasoning/correlate
 * Evaluates multi-signal correlation and anomaly cascades
 */
reasoningRouter.post(
  '/correlate',
  enforceTenant,
  requirePermission('knowledge:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { telemetry, timeWindowSeconds } = req.body;

      if (!telemetry || !Array.isArray(telemetry)) {
        res.status(400).json({ error: 'Bad Request', message: 'telemetry array is required' });
        return;
      }

      const patterns = CorrelationEngine.analyzeCorrelations(
        telemetry as TelemetryPoint[],
        timeWindowSeconds || 300
      );

      res.status(200).json({
        patternsCount: patterns.length,
        patterns,
      });
    } catch (err) {
      res.status(500).json({ error: 'Correlation Error', message: (err as Error).message });
    }
  }
);
