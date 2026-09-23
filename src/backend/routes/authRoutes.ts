/**
 * Industrial Brain — Authentication API Routes
 * Phase 1: Core Platform
 */

import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { hashPassword, verifyPassword, createToken } from '../security/auth.ts';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.ts';
import { createRateLimiter } from '../security/rateLimiter.ts';
import { ROLE_PERMISSIONS } from '../../../packages/shared/rbac.ts';
import { SystemRole } from '../../../packages/shared/types.ts';

export const authRouter = Router();

// Rate limiter: max 30 login/register requests per minute per IP
const authLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60 * 1000 });

/**
 * POST /api/v1/auth/register
 * Creates a new user and an initial organization (tenant)
 */
authRouter.post('/register', authLimiter, (req, res): void => {
  try {
    const { email, password, fullName, organizationName, organizationSlug } = req.body;

    if (!email || !password || !fullName || !organizationName) {
      res.status(400).json({ error: 'Bad Request', message: 'email, password, fullName, and organizationName are required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Bad Request', message: 'Password must be at least 8 characters long' });
      return;
    }

    const slug = (organizationSlug || organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-')).toLowerCase();

    // Check if user already exists
    if (db.getUserByEmail(email)) {
      res.status(409).json({ error: 'Conflict', message: 'A user with this email already exists' });
      return;
    }

    if (db.getOrganizationBySlug(slug)) {
      res.status(409).json({ error: 'Conflict', message: `Organization slug "${slug}" is already registered` });
      return;
    }

    const { hash, salt } = hashPassword(password);
    const user = db.createUser(email, fullName, hash, salt, false);
    const org = db.createOrganization(organizationName, slug);
    const membership = db.createMembership(user.id, org.id, 'ORG_ADMIN');

    // Audit log
    db.appendAuditLog({
      tenantId: org.id,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: 'ORG_ADMIN',
      action: 'ORGANIZATION_CREATED',
      resourceType: 'ORGANIZATION',
      resourceId: org.id,
      details: { organizationName, slug },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
    });

    const token = createToken({
      userId: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      activeTenantId: org.id,
      activeRole: membership.role,
    });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user,
      activeTenant: org,
      activeRole: membership.role,
      permissions: ROLE_PERMISSIONS['ORG_ADMIN'],
      organizations: [
        {
          tenantId: org.id,
          organizationName: org.name,
          role: membership.role,
        },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
  }
});

/**
 * POST /api/v1/auth/login
 * Validates credentials and returns JWT token
 */
authRouter.post('/login', authLimiter, (req, res): void => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Bad Request', message: 'Email and password are required' });
      return;
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
      return;
    }

    if (!verifyPassword(password, user.passwordHash, user.salt)) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
      return;
    }

    const orgs = db.listOrganizationsForUser(user.id);
    const defaultOrg = orgs.length > 0 ? orgs[0] : null;
    const activeRole = defaultOrg ? defaultOrg.role : ('VIEWER' as SystemRole);

    const token = createToken({
      userId: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      activeTenantId: defaultOrg?.tenantId,
      activeRole,
    });

    if (defaultOrg) {
      db.appendAuditLog({
        tenantId: defaultOrg.tenantId,
        actorId: user.id,
        actorEmail: user.email,
        actorRole: activeRole,
        action: 'USER_LOGIN',
        resourceType: 'AUTH',
        resourceId: user.id,
        details: { loginMethod: 'PASSWORD' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'SUCCESS',
      });
    }

    const { passwordHash: _, salt: __, ...sanitizedUser } = user;

    res.status(200).json({
      message: 'Authentication successful',
      token,
      user: sanitizedUser,
      activeTenantId: defaultOrg?.tenantId,
      activeRole,
      permissions: ROLE_PERMISSIONS[activeRole] || [],
      organizations: orgs,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
  }
});

/**
 * GET /api/v1/auth/me
 * Retrieves current authenticated user context
 */
authRouter.get('/me', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = db.getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ error: 'User Not Found' });
      return;
    }

    const orgs = db.listOrganizationsForUser(user.id);
    const activeTenantId = req.user.activeTenantId || (orgs.length > 0 ? orgs[0].tenantId : undefined);
    const activeOrg = activeTenantId ? db.getOrganization(activeTenantId) : null;
    const activeRole = (req.user.activeRole as SystemRole) || (orgs.find(o => o.tenantId === activeTenantId)?.role || 'VIEWER');

    const { passwordHash: _, salt: __, ...sanitized } = user;

    res.status(200).json({
      user: sanitized,
      activeTenant: activeOrg,
      activeRole,
      permissions: ROLE_PERMISSIONS[activeRole] || [],
      organizations: orgs,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
  }
});

/**
 * POST /api/v1/auth/switch-tenant
 * Switches active organization context and issues fresh token
 */
authRouter.post('/switch-tenant', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { tenantId } = req.body;
    if (!tenantId) {
      res.status(400).json({ error: 'Bad Request', message: 'tenantId is required' });
      return;
    }

    const org = db.getOrganization(tenantId);
    if (!org) {
      res.status(404).json({ error: 'Not Found', message: 'Target organization not found' });
      return;
    }

    const membership = db.getMembership(req.user!.userId, tenantId);
    if (!membership && !req.user!.isSuperAdmin) {
      res.status(403).json({ error: 'Forbidden', message: 'You are not a member of this organization' });
      return;
    }

    const activeRole = membership?.role || ('SUPER_ADMIN' as SystemRole);

    const token = createToken({
      userId: req.user!.userId,
      email: req.user!.email,
      isSuperAdmin: req.user!.isSuperAdmin,
      activeTenantId: org.id,
      activeRole,
    });

    res.status(200).json({
      message: 'Active tenant switched',
      token,
      activeTenant: org,
      activeRole,
      permissions: ROLE_PERMISSIONS[activeRole] || [],
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
  }
});
