/**
 * Industrial Brain — RBAC Metadata & Verification Routes
 * Phase 1: Core Platform
 */

import { Router, Response } from 'express';
import { ROLE_PERMISSIONS, hasPermission } from '../../../packages/shared/rbac.ts';
import { SystemRole, Permission } from '../../../packages/shared/types.ts';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.ts';

export const rbacRouter = Router();

rbacRouter.use(authenticate);

/**
 * GET /api/v1/rbac/roles
 * Lists all defined system roles and assigned permissions
 */
rbacRouter.get('/roles', (req: AuthenticatedRequest, res: Response): void => {
  res.status(200).json({
    roles: Object.keys(ROLE_PERMISSIONS).map((role) => ({
      role,
      permissions: ROLE_PERMISSIONS[role as SystemRole],
      description: getRoleDescription(role as SystemRole),
    })),
  });
});

/**
 * GET /api/v1/rbac/permissions
 * Lists all granular system permissions
 */
rbacRouter.get('/permissions', (req: AuthenticatedRequest, res: Response): void => {
  const allPermissions: Array<{ id: Permission; category: string; description: string }> = [
    { id: 'org:read', category: 'Organization', description: 'Read organization metadata and configuration' },
    { id: 'org:write', category: 'Organization', description: 'Modify organization settings and policies' },
    { id: 'org:delete', category: 'Organization', description: 'Decommission or archive organization' },
    { id: 'user:read', category: 'Identity', description: 'View tenant users and active memberships' },
    { id: 'user:invite', category: 'Identity', description: 'Invite new operators and engineers' },
    { id: 'user:manage_roles', category: 'Identity', description: 'Modify roles and permissions of members' },
    { id: 'data:read', category: 'Data & Connectors', description: 'Read ingested industrial records and metrics' },
    { id: 'data:ingest', category: 'Data & Connectors', description: 'Trigger manual sync or upload datasets' },
    { id: 'data:manage', category: 'Data & Connectors', description: 'Configure connectors and schema mappings' },
    { id: 'knowledge:read', category: 'Knowledge Layer', description: 'Search and inspect resolved industrial entities' },
    { id: 'knowledge:explore', category: 'Knowledge Layer', description: 'Inspect relationship graphs and provenance' },
    { id: 'audit:read', category: 'Governance', description: 'Read tamper-evident audit trail entries' },
    { id: 'audit:export', category: 'Governance', description: 'Export signed audit compliance packages' },
    { id: 'policy:read', category: 'Policy Engine', description: 'View active governance rules and thresholds' },
    { id: 'policy:write', category: 'Policy Engine', description: 'Update approval rules and risk thresholds' },
    { id: 'action:propose', category: 'Action Engine', description: 'Submit an operational action for review' },
    { id: 'action:approve', category: 'Action Engine', description: 'Approve or reject pending high-risk actions' },
    { id: 'action:execute', category: 'Action Engine', description: 'Execute verified actions on external targets' },
    { id: 'system:admin', category: 'Platform', description: 'Super-admin platform maintenance and telemetry' },
  ];

  res.status(200).json({ permissions: allPermissions });
});

/**
 * POST /api/v1/rbac/check
 * Verifies if a role has specific permissions
 */
rbacRouter.post('/check', (req: AuthenticatedRequest, res: Response): void => {
  const { role, permissions } = req.body;

  if (!role || !Array.isArray(permissions)) {
    res.status(400).json({ error: 'Bad Request', message: 'role and permissions array are required' });
    return;
  }

  const results: Record<string, boolean> = {};
  for (const perm of permissions) {
    results[perm] = hasPermission(role as SystemRole, perm as Permission);
  }

  res.status(200).json({
    role,
    results,
    isAuthorized: Object.values(results).every(Boolean),
  });
});

function getRoleDescription(role: SystemRole): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Full platform control, root governance, and multi-tenant oversight.';
    case 'ORG_ADMIN':
      return 'Full organization control, member provisioning, connector setup, and policy management.';
    case 'PLANT_MANAGER':
      return 'Plant-level oversight, production and maintenance analytics, and operational action approval.';
    case 'PROCESS_ENGINEER':
      return 'Telemetry inspection, data ingestion, root-cause investigation, and proposing corrective actions.';
    case 'OPERATOR':
      return 'Production shift monitoring, execution acknowledgment, and standard task dispatch.';
    case 'AUDITOR':
      return 'Read-only compliance verification, cryptographic audit log inspection, and export.';
    case 'VIEWER':
      return 'Strict read-only viewer for operational telemetry and status dashboards.';
  }
}
