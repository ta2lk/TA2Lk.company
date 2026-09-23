import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  User,
  Hash,
  FileJson
} from 'lucide-react';
import { AuditLogItem, api } from '../services/api.ts';

export const AuditView: React.FC<{ activeTenantId?: string }> = ({ activeTenantId }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  useEffect(() => {
    loadLogs();
  }, [activeTenantId, statusFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs({
        status: statusFilter || undefined,
        action: actionFilter || undefined,
        limit: 100,
      });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    try {
      setVerifying(true);
      const res = await api.verifyAuditIntegrity();
      setVerificationResult(res);
      // Refresh logs to update verification badges
      await loadLogs();
    } catch (err) {
      console.error('Failed to verify audit logs:', err);
    } finally {
      setVerifying(false);
    }
  };

  const handleExportPackage = async () => {
    try {
      const exportPkg = await api.exportAuditPackage();
      const blob = new Blob([JSON.stringify(exportPkg, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_compliance_package_${activeTenantId}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export audit package:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 rounded uppercase">
                Tamper-Evident Audit Trail // HMAC-SHA256
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-300 rounded">
                Tenant: {activeTenantId}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-2 font-mono">
              Cryptographic Audit Trail & Governance Log
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Every sensitive action (logins, role changes, tenant switches, data operations) is deterministically signed with a cryptographic HMAC-SHA256 checksum. Any retroactive tampering is mathematically detectable.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleVerifyIntegrity}
              disabled={verifying}
              className="px-3 py-2 rounded bg-zinc-900 border border-zinc-700 hover:border-emerald-500 text-emerald-400 font-mono text-xs flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
              <span>{verifying ? 'Verifying Hashes...' : 'Verify Cryptographic Integrity'}</span>
            </button>
            <button
              onClick={handleExportPackage}
              className="px-3 py-2 rounded bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-zinc-200 font-mono text-xs flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Signed Package</span>
            </button>
          </div>
        </div>

        {/* Verification Result Banner */}
        {verificationResult && (
          <div
            className={`mt-4 p-3 rounded border text-xs font-mono flex items-center justify-between ${
              verificationResult.isChainIntact
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                : 'bg-red-950/40 border-red-800/80 text-red-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              {verificationResult.isChainIntact ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>
                Verified {verificationResult.recordsChecked} audit records. Integrity status:{' '}
                <strong>{verificationResult.isChainIntact ? '100% UNCOMPROMISED (ZERO TAMPERING)' : 'TAMPERING DETECTED!'}</strong>
              </span>
            </div>
            <span className="text-[11px] text-zinc-400">
              Valid: {verificationResult.validRecords} | Tampered: {verificationResult.tamperedRecords}
            </span>
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/80 text-xs">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search action or event..."
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadLogs()}
              className="w-full bg-zinc-950 border border-zinc-800 rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-amber-500"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
            <option value="BLOCKED">BLOCKED</option>
          </select>
        </div>

        <div className="flex items-center space-x-3 text-zinc-400 font-mono text-[11px] w-full sm:w-auto justify-end">
          <span>Total Records: {total}</span>
          <button
            onClick={loadLogs}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
            title="Refresh logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/90 text-zinc-400 font-mono uppercase text-[10px] border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4">Resource</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">HMAC Integrity</th>
                <th className="py-2.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-400">
                    Loading cryptographic audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-400">
                    No audit records match the selected criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-900/30 transition">
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : log.status === 'BLOCKED'
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-zinc-200">{log.action}</td>
                    <td className="py-2.5 px-4">
                      <div className="text-zinc-300">{log.actorEmail}</div>
                      <div className="text-[10px] text-zinc-400">{log.actorRole}</div>
                    </td>
                    <td className="py-2.5 px-4 text-zinc-400">
                      <div>{log.resourceType}</div>
                      {log.resourceId && <div className="text-[10px] text-zinc-400">{log.resourceId}</div>}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="flex items-center space-x-1 text-[10px] text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        <span className="truncate max-w-[100px]" title={log.checksum}>
                          {log.checksum.substring(0, 12)}...
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-2xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileJson className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white font-mono">
                  Audit Entry Inspection: {selectedLog.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-zinc-400 hover:text-white font-mono text-xs"
              >
                [CLOSE]
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-zinc-950 p-3 rounded border border-zinc-800 text-zinc-300">
              <div>
                <span className="text-zinc-400">Tenant ID: </span>
                {selectedLog.tenantId}
              </div>
              <div>
                <span className="text-zinc-400">Status: </span>
                {selectedLog.status}
              </div>
              <div>
                <span className="text-zinc-400">Actor Email: </span>
                {selectedLog.actorEmail}
              </div>
              <div>
                <span className="text-zinc-400">Actor Role: </span>
                {selectedLog.actorRole}
              </div>
              <div>
                <span className="text-zinc-400">Action: </span>
                {selectedLog.action}
              </div>
              <div>
                <span className="text-zinc-400">Timestamp: </span>
                {selectedLog.timestamp}
              </div>
              <div className="col-span-2 break-all">
                <span className="text-zinc-400">HMAC-SHA256 Checksum: </span>
                <span className="text-emerald-400">{selectedLog.checksum}</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-mono text-zinc-400 mb-1.5">Action Details & Payload Diff:</div>
              <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 text-xs font-mono text-amber-300 overflow-x-auto max-h-60">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs font-mono"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
