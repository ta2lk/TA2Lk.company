/**
 * Industrial Brain — Health & Observability Routes
 * Phase 1: Core Platform
 */

import { Router, Request, Response } from 'express';
import { db } from '../db/database.ts';

export const healthRouter = Router();

const startTime = Date.now();

healthRouter.get('/health', (req: Request, res: Response): void => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const memory = process.memoryUsage();
  const dbHealth = db.checkHealth();

  res.status(200).json({
    status: 'healthy',
    service: 'industrial-brain-core',
    version: '1.0.0',
    phase: 'PHASE_1_CORE_PLATFORM',
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    system: {
      nodeVersion: process.version,
      memoryHeapUsedMB: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      memoryHeapTotalMB: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
    },
    database: {
      status: dbHealth.status,
      organizationsCount: dbHealth.organizationsCount,
      usersCount: dbHealth.usersCount,
      auditLogsCount: dbHealth.auditLogsCount,
    },
    multiTenancy: {
      strictIsolation: true,
      enforcedAt: 'DATABASE_AND_MIDDLEWARE',
    },
    auditEngine: {
      algorithm: 'HMAC-SHA256',
      tamperEvident: true,
    },
  });
});
