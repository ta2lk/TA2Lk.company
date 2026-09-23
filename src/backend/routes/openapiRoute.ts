/**
 * Industrial Brain — OpenAPI 3.0 Specification
 * Phase 1: Core Platform
 */

import { Router, Request, Response } from 'express';

export const openapiRouter = Router();

const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Industrial Brain API',
    description:
      'Operational Intelligence Platform — Strict Multi-tenancy, RBAC, Tamper-Evident Audit Trails & Policy Controls',
    version: '1.0.0',
    contact: {
      name: 'Industrial Brain Engineering',
      email: 'security@industrial-brain.internal',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Current Environment API Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      TenantHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Tenant-ID',
        description: 'Target Tenant Organization ID',
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'System health and diagnostics',
        responses: {
          '200': { description: 'System healthy and responsive' },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register user and create initial tenant organization',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'fullName', 'organizationName'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  fullName: { type: 'string' },
                  organizationName: { type: 'string' },
                  organizationSlug: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Registration successful' },
          '400': { description: 'Bad Request' },
          '409': { description: 'User or Organization conflict' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate credentials and obtain JWT bearer token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'JWT token issued' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get active user profile and tenant memberships',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Current user context' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/organizations': {
      get: {
        summary: 'List organizations the user belongs to',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'List of accessible organizations' },
        },
      },
      post: {
        summary: 'Create a new tenant organization',
        security: [{ BearerAuth: [] }],
        responses: {
          '201': { description: 'Organization created' },
        },
      },
    },
    '/organizations/{tenantId}/members': {
      get: {
        summary: 'List members of the organization (strictly tenant isolated)',
        security: [{ BearerAuth: [], TenantHeader: [] }],
        responses: {
          '200': { description: 'List of organization members' },
          '403': { description: 'Cross-tenant access forbidden' },
        },
      },
      post: {
        summary: 'Assign or invite member with role',
        security: [{ BearerAuth: [], TenantHeader: [] }],
        responses: {
          '200': { description: 'Member assigned' },
        },
      },
    },
    '/rbac/roles': {
      get: {
        summary: 'List all system roles and permission sets',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Role permission matrix' },
        },
      },
    },
    '/audit/logs': {
      get: {
        summary: 'Retrieve tamper-evident audit trail for tenant',
        security: [{ BearerAuth: [], TenantHeader: [] }],
        responses: {
          '200': { description: 'Audit records with HMAC integrity status' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/audit/verify': {
      post: {
        summary: 'Perform cryptographic verification across audit log chain',
        security: [{ BearerAuth: [], TenantHeader: [] }],
        responses: {
          '200': { description: 'Audit chain verification report' },
        },
      },
    },
  },
};

openapiRouter.get('/openapi.json', (req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify(openapiSpec, null, 2));
});
