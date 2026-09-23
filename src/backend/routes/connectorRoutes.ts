/**
 * Industrial Brain — Connectors & Ingestion API Routes
 * Phase 2: Real Data Connectors
 */

import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { authenticate, enforceTenant, requirePermission, AuthenticatedRequest } from '../middleware/auth.ts';
import { CsvEngine } from '../../../packages/connectors/csvEngine.ts';
import { ExcelEngine } from '../../../packages/connectors/excelEngine.ts';
import { PostgresEngine, PostgresConnectionConfig } from '../../../packages/connectors/postgresEngine.ts';
import { RestEngine, RestConnectorConfig } from '../../../packages/connectors/restEngine.ts';
import { IngestionPipeline } from '../../../packages/connectors/pipeline.ts';

export const connectorRouter = Router();

connectorRouter.use(authenticate);

// ================= DATA SOURCES =================

/**
 * GET /api/v1/connectors/datasources
 * Lists all data sources registered for the active tenant
 */
connectorRouter.get(
  '/datasources',
  enforceTenant,
  requirePermission('data:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const sources = db.listDataSourcesForTenant(req.tenant!.id);
      res.status(200).json({ dataSources: sources });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
    }
  }
);

/**
 * POST /api/v1/connectors/datasources
 * Registers a new data source for the active tenant
 */
connectorRouter.post(
  '/datasources',
  enforceTenant,
  requirePermission('data:manage'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { name, type, config } = req.body;
      if (!name || !type) {
        res.status(400).json({ error: 'Bad Request', message: 'name and type are required' });
        return;
      }

      const ds = db.createDataSource(req.tenant!.id, name, type, config || {});

      db.appendAuditLog({
        tenantId: req.tenant!.id,
        actorId: req.user!.userId,
        actorEmail: req.user!.email,
        actorRole: req.membership!.role,
        action: 'DATA_SOURCE_CREATED',
        resourceType: 'DATA_SOURCE',
        resourceId: ds.id,
        details: { name, type },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'SUCCESS',
      });

      res.status(201).json({ dataSource: ds });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
    }
  }
);

// ================= CSV INGESTION =================

/**
 * POST /api/v1/connectors/csv/preview
 * Analyzes CSV text, auto-detects delimiter, infers types, returns schema & preview
 */
connectorRouter.post(
  '/csv/preview',
  enforceTenant,
  requirePermission('data:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { csvContent } = req.body;
      if (!csvContent || typeof csvContent !== 'string') {
        res.status(400).json({ error: 'Bad Request', message: 'csvContent string is required' });
        return;
      }

      const preview = CsvEngine.previewCsv(csvContent);
      res.status(200).json({ preview });
    } catch (err) {
      res.status(400).json({ error: 'CSV Parsing Error', message: (err as Error).message });
    }
  }
);

/**
 * POST /api/v1/connectors/csv/ingest
 * Ingests CSV content into the database with schema normalization and DLQ isolation
 */
connectorRouter.post(
  '/csv/ingest',
  enforceTenant,
  requirePermission('data:ingest'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { csvContent, dataSourceId, entityType, externalIdColumn, enableDeduplication } = req.body;

      if (!csvContent || typeof csvContent !== 'string') {
        res.status(400).json({ error: 'Bad Request', message: 'csvContent string is required' });
        return;
      }

      const parsed = CsvEngine.parseCsv(csvContent);
      const dsId = dataSourceId || `ds_csv_${Date.now()}`;

      const result = await IngestionPipeline.execute(
        req.tenant!.id,
        dsId,
        'CSV',
        parsed.rows,
        req.user!.email,
        {
          entityType: entityType || 'CSV_IMPORT',
          externalIdColumn,
          enableDeduplication: enableDeduplication !== false,
        }
      );

      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: 'CSV Ingestion Error', message: (err as Error).message });
    }
  }
);

// ================= EXCEL (XLSX) INGESTION =================

/**
 * POST /api/v1/connectors/xlsx/inspect
 * Inspects uploaded XLSX buffer (base64) and enumerates sheets
 */
connectorRouter.post(
  '/xlsx/inspect',
  enforceTenant,
  requirePermission('data:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { base64Data } = req.body;
      if (!base64Data || typeof base64Data !== 'string') {
        res.status(400).json({ error: 'Bad Request', message: 'base64Data string is required' });
        return;
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const inspection = ExcelEngine.inspectWorkbook(buffer);
      res.status(200).json({ inspection });
    } catch (err) {
      res.status(400).json({ error: 'Excel Inspection Error', message: (err as Error).message });
    }
  }
);

/**
 * POST /api/v1/connectors/xlsx/ingest
 * Ingests a specific sheet from uploaded XLSX workbook
 */
connectorRouter.post(
  '/xlsx/ingest',
  enforceTenant,
  requirePermission('data:ingest'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { base64Data, sheetName, dataSourceId, entityType, externalIdColumn, enableDeduplication } = req.body;

      if (!base64Data || typeof base64Data !== 'string') {
        res.status(400).json({ error: 'Bad Request', message: 'base64Data string is required' });
        return;
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const parsed = ExcelEngine.parseSheet(buffer, sheetName);
      const dsId = dataSourceId || `ds_xlsx_${Date.now()}`;

      const result = await IngestionPipeline.execute(
        req.tenant!.id,
        dsId,
        'XLSX',
        parsed.rows,
        req.user!.email,
        {
          entityType: entityType || `XLSX_${parsed.sheetName.toUpperCase()}`,
          externalIdColumn,
          enableDeduplication: enableDeduplication !== false,
          sheetName: parsed.sheetName,
        }
      );

      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: 'Excel Ingestion Error', message: (err as Error).message });
    }
  }
);

// ================= POSTGRESQL READ-ONLY CONNECTOR =================

/**
 * POST /api/v1/connectors/postgres/test
 * Tests PostgreSQL read-only connectivity and introspects available schemas/tables
 */
connectorRouter.post(
  '/postgres/test',
  enforceTenant,
  requirePermission('data:read'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const config: PostgresConnectionConfig = req.body.config || {
        host: 'localhost',
        port: 5432,
        database: 'industrial_erp',
        user: 'readonly_operator',
      };

      const tables = await PostgresEngine.introspectSchema(config);
      res.status(200).json({
        status: 'CONNECTED',
        mode: 'READ_ONLY_ENFORCED',
        tables,
      });
    } catch (err) {
      res.status(400).json({ error: 'Postgres Connection Error', message: (err as Error).message });
    }
  }
);

/**
 * POST /api/v1/connectors/postgres/sync
 * Safely executes read-only SELECT query and ingests table into database
 */
connectorRouter.post(
  '/postgres/sync',
  enforceTenant,
  requirePermission('data:ingest'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { tableName, timestampColumn, lastSyncTimestamp, limit, dataSourceId, entityType } = req.body;

      if (!tableName) {
        res.status(400).json({ error: 'Bad Request', message: 'tableName is required' });
        return;
      }

      const config: PostgresConnectionConfig = req.body.config || {
        host: 'localhost',
        port: 5432,
        database: 'industrial_erp',
        user: 'readonly_operator',
      };

      const syncResult = await PostgresEngine.executeSafeSync(config, tableName, {
        timestampColumn,
        lastSyncTimestamp,
        limit,
      });

      const dsId = dataSourceId || `ds_pg_${Date.now()}`;
      const result = await IngestionPipeline.execute(
        req.tenant!.id,
        dsId,
        'POSTGRES',
        syncResult.rows,
        req.user!.email,
        {
          entityType: entityType || `PG_${tableName.toUpperCase()}`,
          enableDeduplication: true,
        }
      );

      res.status(201).json({
        ...result,
        nextSyncTimestamp: syncResult.nextSyncTimestamp,
      });
    } catch (err) {
      res.status(400).json({ error: 'Postgres Sync Error', message: (err as Error).message });
    }
  }
);

// ================= GENERIC REST CONNECTOR =================

/**
 * POST /api/v1/connectors/rest/test
 * Validates endpoint URL for SSRF protection and executes test probe
 */
connectorRouter.post(
  '/rest/test',
  enforceTenant,
  requirePermission('data:read'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const config: RestConnectorConfig = req.body;
      if (!config.endpointUrl) {
        res.status(400).json({ error: 'Bad Request', message: 'endpointUrl is required' });
        return;
      }

      const result = await RestEngine.fetchRecords(config, { timeoutMs: 5000 });
      res.status(200).json({
        status: 'SUCCESS',
        recordsExtracted: result.rows.length,
        schema: result.schema,
        sampleRows: result.rows.slice(0, 5),
      });
    } catch (err) {
      res.status(400).json({ error: 'REST Test Error', message: (err as Error).message });
    }
  }
);

/**
 * POST /api/v1/connectors/rest/sync
 * Ingests records from external REST API endpoint with retry & backoff
 */
connectorRouter.post(
  '/rest/sync',
  enforceTenant,
  requirePermission('data:ingest'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { endpointUrl, method, headers, authType, authKey, authValue, paginationType, pageSize, maxPages, recordsJsonPath, dataSourceId, entityType } = req.body;

      if (!endpointUrl) {
        res.status(400).json({ error: 'Bad Request', message: 'endpointUrl is required' });
        return;
      }

      const restResult = await RestEngine.fetchRecords({
        endpointUrl,
        method,
        headers,
        authType,
        authKey,
        authValue,
        paginationType,
        pageSize,
        maxPages,
        recordsJsonPath,
      });

      const dsId = dataSourceId || `ds_rest_${Date.now()}`;
      const result = await IngestionPipeline.execute(
        req.tenant!.id,
        dsId,
        'REST',
        restResult.rows,
        req.user!.email,
        {
          entityType: entityType || 'REST_PAYLOAD',
          enableDeduplication: true,
        }
      );

      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: 'REST Ingestion Error', message: (err as Error).message });
    }
  }
);

// ================= INGESTED RECORDS & JOBS =================

/**
 * GET /api/v1/connectors/records
 * Queries normalized records strictly for the active tenant
 */
connectorRouter.get(
  '/records',
  enforceTenant,
  requirePermission('data:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const entityType = req.query.entityType as string | undefined;
      const dataSourceId = req.query.dataSourceId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const { items, total } = db.listNormalizedRecordsForTenant(req.tenant!.id, {
        entityType,
        dataSourceId,
        limit,
        offset,
      });

      res.status(200).json({
        tenantId: req.tenant!.id,
        total,
        records: items,
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
    }
  }
);

/**
 * GET /api/v1/connectors/jobs
 * Lists ingestion execution jobs for the active tenant
 */
connectorRouter.get(
  '/jobs',
  enforceTenant,
  requirePermission('data:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const jobs = db.listIngestionJobsForTenant(req.tenant!.id);
      res.status(200).json({ jobs });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
    }
  }
);

/**
 * GET /api/v1/connectors/dlq
 * Lists Dead Letter Queue items for the active tenant
 */
connectorRouter.get(
  '/dlq',
  enforceTenant,
  requirePermission('data:read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const items = db.listDeadLetterForTenant(req.tenant!.id);
      res.status(200).json({ deadLetterItems: items });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
    }
  }
);

/**
 * POST /api/v1/connectors/dlq/:id/resolve
 * Marks a DLQ item as resolved
 */
connectorRouter.post(
  '/dlq/:id/resolve',
  enforceTenant,
  requirePermission('data:manage'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const resolved = db.resolveDeadLetterItem(req.params.id, req.tenant!.id);
      if (!resolved) {
        res.status(404).json({ error: 'Not Found', message: 'DLQ item not found in tenant' });
        return;
      }
      res.status(200).json({ success: true, message: 'DLQ entry resolved' });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: (err as Error).message });
    }
  }
);
