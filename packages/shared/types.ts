/**
 * Industrial Brain — Shared Domain Models & Types
 * Phase 1: Core Platform
 */

export type SystemRole =
  | 'SUPER_ADMIN'
  | 'ORG_ADMIN'
  | 'PLANT_MANAGER'
  | 'PROCESS_ENGINEER'
  | 'OPERATOR'
  | 'AUDITOR'
  | 'VIEWER';

export type Permission =
  // Organization management
  | 'org:read'
  | 'org:write'
  | 'org:delete'
  // User & Membership management
  | 'user:read'
  | 'user:invite'
  | 'user:manage_roles'
  // Industrial Data & Connectors
  | 'data:read'
  | 'data:ingest'
  | 'data:manage'
  // Knowledge Layer
  | 'knowledge:read'
  | 'knowledge:explore'
  // Audit Trail
  | 'audit:read'
  | 'audit:export'
  // Policy & Action Engine
  | 'policy:read'
  | 'policy:write'
  | 'action:propose'
  | 'action:approve'
  | 'action:execute'
  // System Administration
  | 'system:admin';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  tenantId: string;
  role: SystemRole;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  userEmail?: string;
  userFullName?: string;
  organizationName?: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  timestamp: string;
  checksum: string;
}

export interface AuthSession {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    isSuperAdmin: boolean;
  };
  activeTenantId?: string;
  activeRole?: SystemRole;
  permissions?: Permission[];
  organizations: Array<{
    tenantId: string;
    organizationName: string;
    role: SystemRole;
  }>;
}
