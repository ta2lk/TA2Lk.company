import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Building2,
  Database,
  Layers,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Activity
} from 'lucide-react';
import { OrganizationInfo, AuditLogItem, api } from '../services/api.ts';

interface DashboardViewProps {
  activeTenant: OrganizationInfo | null;
  activeRole: string;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeTenant,
  activeRole,
  onNavigateToTab,
}) => {
  const [recentLogs, setRecentLogs] = useState<AuditLogItem[]>([]);
  const [ingestedRecordsCount, setIngestedRecordsCount] = useState<number>(0);
  const [jobsCount, setJobsCount] = useState<number>(0);
  const [dlqCount, setDlqCount] = useState<number>(0);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTenant) {
      loadTenantData();
    }
  }, [activeTenant?.id]);

  const loadTenantData = async () => {
    try {
      setLoading(true);
      const [auditRes, recsRes, jobsRes, dlqRes] = await Promise.all([
        api.getAuditLogs({ limit: 5 }),
        api.getNormalizedRecords({ limit: 5 }),
        api.getIngestionJobs(),
        api.getDeadLetterQueue(),
      ]);

      setRecentLogs(auditRes.logs);
      setIngestedRecordsCount(recsRes.total);
      setRecentRecords(recsRes.records);
      setJobsCount(jobsRes.jobs.length);
      setDlqCount(dlqRes.deadLetterItems.length);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Platform Banner */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-950/80 border border-amber-800/80 text-amber-300 rounded uppercase">
                Phase 2 // Real Data Connectors Active
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 rounded flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Tenant Isolation & DLQ Enforced</span>
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-2 font-mono">
              {activeTenant ? activeTenant.name : 'No Tenant Selected'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Industrial Brain operational intelligence layer mounted over tenant{' '}
              <code className="text-amber-400 bg-zinc-950 px-1 py-0.5 rounded font-mono">{activeTenant?.id}</code>
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <button
              onClick={() => onNavigateToTab('datasources')}
              className="px-3 py-2 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 fill-current" />
              <span>Open Ingestion Console</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => onNavigateToTab('audit')}
              className="px-3 py-2 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 flex items-center space-x-1.5 transition cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Inspect Audit Trail</span>
            </button>
          </div>
        </div>
      </div>

      {/* Industrial Telemetry Cards — Real values from Ingested Pipeline, or Anti-Mock warning */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
            <span>Operational Telemetry & Ingestion Metrics</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
              REAL DATA ONLY
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Ingested Records */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4">
            <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
              <span>Normalized Records</span>
              <Layers className="w-3.5 h-3.5 text-amber-400" />
            </div>
            {ingestedRecordsCount > 0 ? (
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-white">{ingestedRecordsCount}</div>
                <div className="text-[11px] text-emerald-400 font-mono mt-1">
                  Validated & Stored in Tenant
                </div>
              </div>
            ) : (
              <div className="mt-3 py-2 px-2.5 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-500 flex items-center space-x-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
                <span>No data available</span>
              </div>
            )}
            <div className="mt-2 text-[11px] text-zinc-500">
              CSV, XLSX, PostgreSQL, and REST pipeline outputs.
            </div>
          </div>

          {/* Card 2: Ingestion Jobs */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4">
            <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
              <span>Execution Jobs</span>
              <Clock className="w-3.5 h-3.5 text-blue-400" />
            </div>
            {jobsCount > 0 ? (
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-white">{jobsCount}</div>
                <div className="text-[11px] text-blue-400 font-mono mt-1">
                  Completed Ingestion Runs
                </div>
              </div>
            ) : (
              <div className="mt-3 py-2 px-2.5 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-500 flex items-center space-x-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
                <span>No data available</span>
              </div>
            )}
            <div className="mt-2 text-[11px] text-zinc-500">
              Deduplication and schema inference runs.
            </div>
          </div>

          {/* Card 3: Dead-Letter Queue */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4">
            <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
              <span>Dead-Letter Queue (DLQ)</span>
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-bold font-mono ${dlqCount > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                {dlqCount}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono mt-1">
                {dlqCount === 0 ? 'Zero malformed records' : 'Quarantined malformed rows'}
              </div>
            </div>
            <div className="mt-2 text-[11px] text-zinc-500">
              Isolates corrupted input from production schema.
            </div>
          </div>

          {/* Card 4: SCADA/OEE Gateway */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4">
            <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
              <span>SCADA / OPC-UA Gateway</span>
              <Activity className="w-3.5 h-3.5 text-zinc-600" />
            </div>
            <div className="mt-3 py-2 px-2.5 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-500 flex items-center space-x-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
              <span>No data available</span>
            </div>
            <div className="mt-2 text-[11px] text-zinc-500">
              Industrial IoT gateway scheduled for Phase 7.
            </div>
          </div>
        </div>
      </div>

      {/* Core Platform Tenancy & Audit Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenant Configuration Card */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-5">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Active Tenant Boundaries</span>
          </h3>

          <div className="mt-4 space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Tenant Identifier:</span>
              <span className="font-mono text-zinc-200">{activeTenant?.id}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Organization Slug:</span>
              <span className="font-mono text-zinc-200">{activeTenant?.slug}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Status:</span>
              <span className="px-1.5 py-0.2 text-[10px] font-mono bg-emerald-950 border border-emerald-800 text-emerald-300 rounded uppercase">
                {activeTenant?.status}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Active User Role:</span>
              <span className="font-mono font-semibold text-amber-400">{activeRole}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-zinc-400">Cross-Tenant Isolation:</span>
              <span className="text-emerald-400 font-mono flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3" />
                <span>HARD ISOLATION</span>
              </span>
            </div>
          </div>
        </div>

        {/* Live Tenant Audit Trail */}
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recent Audit Events (Strictly Tenant {activeTenant?.id})</span>
            </h3>
            <button
              onClick={() => onNavigateToTab('audit')}
              className="text-xs text-amber-400 hover:text-amber-300 font-mono flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {loading ? (
              <div className="text-xs text-zinc-400 py-4 text-center font-mono">Loading audit stream...</div>
            ) : recentLogs.length === 0 ? (
              <div className="text-xs text-zinc-500 py-4 text-center font-mono">No audit logs recorded for this tenant yet.</div>
            ) : (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="px-3 py-2 rounded bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : log.status === 'BLOCKED'
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {log.status}
                    </span>
                    <span className="font-mono text-zinc-200 font-semibold">{log.action}</span>
                    <span className="text-zinc-500 text-[11px] font-mono">by {log.actorEmail}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
