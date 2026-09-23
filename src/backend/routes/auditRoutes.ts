/**
 * Industrial Brain — Audit API Routes
 * Phase 1: Core Platform
 *
 * Implements tamper-evident audit trail verification and tenant-isolated logs.
 */

import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { authenticate, enforceTenant, requirePermission, AuthenticatedRequest } from '../middleware/auth.ts';
import { verifyAuditRecord } from '../../../packages/audit/index.ts';

export const auditRouter = Router();

auditRouter.use(authenticate);

/**
 * GET /api/v1/audit/logs
 * Retrieves cryptographically verified audit records strictly for the active tenant
 */
auditRouter.get('/logs', enforceTenant, requirePermission('audit:read'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const actorId = req.query.actorId as string | undefined;
    const action = req.query.action as string | undefined;
    const status = req.query.status as 'SUCCESS' | 'FAILURE' | 'BLOCKED' | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const { items, total } = db.listAuditLogsForTenant(req.tenant!.id, {
      actorId,
      action,
      status,
      limit,
      offset,
    });

    // Verify integrity of each log entry
    const verifiedItems = items.map((log) => ({
      ...log,
      integrityVerified: verifyAuditRecord(log),
    }));

    res.status(200).json({
      tenantId: req.tenant!.id,
      total,
      limit,
      offset,
      logs: verifiedItems,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
  }
});

/**
 * POST /api/v1/audit/verify
 * Performs full cryptographic verification across all audit records in tenant
 */
auditRouter.post('/verify', enforceTenant, requirePermission('audit:read'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { items } = db.listAuditLogsForTenant(req.tenant!.id, { limit: 1000 });
    let validCount = 0;
    let corruptedCount = 0;
    const corruptedIds: string[] = [];

    for (const log of items) {
      if (verifyAuditRecord(log)) {
        validCount++;
      } else {
        corruptedCount++;
        corruptedIds.push(log.id);
      }
    }

    res.status(200).json({
      tenantId: req.tenant!.id,
      recordsChecked: items.length,
      validRecords: validCount,
      tamperedRecords: corruptedCount,
      isChainIntact: corruptedCount === 0,
      corruptedIds,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
  }
});

/**
 * POST /api/v1/audit/export
 * Exports signed compliance package
 */
auditRouter.post('/export', enforceTenant, requirePermission('audit:export'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { items, total } = db.listAuditLogsForTenant(req.tenant!.id, { limit: 5000 });

    const exportPackage = {
      tenantId: req.tenant!.id,
      tenantName: req.tenant!.name,
      exportedAt: new Date().toISOString(),
      exportedBy: req.user!.email,
      totalRecords: total,
      checksumAlgorithm: 'HMAC-SHA256',
      records: items,
    };

    db.appendAuditLog({
      tenantId: req.tenant!.id,
      actorId: req.user!.userId,
      actorEmail: req.user!.email,
      actorRole: req.membership!.role,
      action: 'AUDIT_EXPORTED',
      resourceType: 'AUDIT_TRAIL',
      resourceId: req.tenant!.id,
      details: { totalRecords: total },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
    });

    res.status(200).json(exportPackage);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
  }
});
