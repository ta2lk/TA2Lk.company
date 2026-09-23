/**
 * Industrial Brain — Role-Based Access Control (RBAC) Engine
 * Phase 1: Core Platform
 */

import { SystemRole, Permission } from './types.ts';

export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  SUPER_ADMIN: [
    'org:read',
    'org:write',
    'org:delete',
    'user:read',
    'user:invite',
    'user:manage_roles',
    'data:read',
    'data:ingest',
    'data:manage',
    'knowledge:read',
    'knowledge:explore',
    'audit:read',
    'audit:export',
    'policy:read',
    'policy:write',
    'action:propose',
    'action:approve',
    'action:execute',
    'system:admin',
  ],
  ORG_ADMIN: [
    'org:read',
    'org:write',
    'user:read',
    'user:invite',
    'user:manage_roles',
    'data:read',
    'data:ingest',
    'data:manage',
    'knowledge:read',
    'knowledge:explore',
    'audit:read',
    'audit:export',
    'policy:read',
    'policy:write',
    'action:propose',
    'action:approve',
    'action:execute',
  ],
  PLANT_MANAGER: [
    'org:read',
    'user:read',
    'data:read',
    'data:ingest',
    'data:manage',
    'knowledge:read',
    'knowledge:explore',
    'audit:read',
    'policy:read',
    'action:propose',
    'action:approve',
  ],
  PROCESS_ENGINEER: [
    'org:read',
    'user:read',
    'data:read',
    'data:ingest',
    'knowledge:read',
    'knowledge:explore',
    'audit:read',
    'action:propose',
  ],
  OPERATOR: [
    'org:read',
    'data:read',
    'knowledge:read',
    'action:propose',
  ],
  AUDITOR: [
    'org:read',
    'user:read',
    'data:read',
    'knowledge:read',
    'audit:read',
    'audit:export',
    'policy:read',
  ],
  VIEWER: [
    'org:read',
    'data:read',
    'knowledge:read',
  ],
};

/**
 * Evaluates whether a role possesses a specific permission.
 */
export function hasPermission(role: SystemRole, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(permission);
}

/**
 * Evaluates whether a role possesses all required permissions.
 */
export function hasAllPermissions(role: SystemRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Evaluates whether a role possesses at least one of the specified permissions.
 */
export function hasAnyPermission(role: SystemRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
