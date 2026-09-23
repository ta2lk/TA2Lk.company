import React, { useEffect, useState } from 'react';
import { Server, Activity, CheckCircle2, RefreshCw, FileCode, Cpu, Database, Shield } from 'lucide-react';
import { api } from '../services/api.ts';

export const SystemHealthView: React.FC = () => {
  const [healthData, setHealthData] = useState<any>(null);
  const [openapiSpec, setOpenapiSpec] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'openapi'>('diagnostics');

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const start = performance.now();
      const [hRes, spec] = await Promise.all([api.getHealth(), api.getOpenApiSpec()]);
      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(elapsed);
      setHealthData(hRes);
      setOpenapiSpec(spec);
    } catch (err) {
      console.error('Failed to fetch health info:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 rounded uppercase">
                System Observability
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-300 rounded">
                API: /api/v1
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-2 font-mono">
              System Diagnostics & OpenAPI Specification
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Live diagnostics, memory footprint, runtime version, and formal OpenAPI 3.0 schema endpoints.
            </p>
          </div>

          <button
            onClick={fetchHealth}
            disabled={loading}
            className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs flex items-center space-x-2 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Diagnostics</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`px-3 py-1.5 rounded text-xs font-mono transition ${
            activeTab === 'diagnostics'
              ? 'bg-zinc-800 text-white font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Live Diagnostics
        </button>
        <button
          onClick={() => setActiveTab('openapi')}
          className={`px-3 py-1.5 rounded text-xs font-mono transition ${
            activeTab === 'openapi'
              ? 'bg-zinc-800 text-white font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          OpenAPI 3.0 JSON Spec
        </button>
      </div>

      {activeTab === 'diagnostics' ? (
        <div className="space-y-6">
          {/* Status Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
              <div className="text-xs text-zinc-400 font-mono">SERVICE STATUS</div>
              <div className="mt-2 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-base font-bold font-mono text-white uppercase">
                  {healthData?.status || 'Unknown'}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                Uptime: {healthData?.uptimeSeconds ?? 0}s
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
              <div className="text-xs text-zinc-400 font-mono">API LATENCY</div>
              <div className="mt-2 text-base font-bold font-mono text-amber-400">
                {latencyMs !== null ? `${latencyMs} ms` : 'Measuring...'}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1 font-mono">Local loopback probe</div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
              <div className="text-xs text-zinc-400 font-mono">MEMORY HEAP USED</div>
              <div className="mt-2 text-base font-bold font-mono text-white">
                {healthData?.system?.memoryHeapUsedMB ?? '0'} MB
              </div>
              <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                Total: {healthData?.system?.memoryHeapTotalMB ?? '0'} MB
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
              <div className="text-xs text-zinc-400 font-mono">MULTI-TENANCY</div>
              <div className="mt-2 text-base font-bold font-mono text-emerald-400">
                STRICT
              </div>
              <div className="text-[11px] text-zinc-400 mt-1 font-mono">DB & Middleware layer</div>
            </div>
          </div>

          {/* Detailed Health Diagnostic Payload */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3 flex items-center space-x-2">
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
              <span>Full Health Diagnostic Response (/api/v1/health)</span>
            </h3>
            <pre className="bg-zinc-950 border border-zinc-800 rounded p-4 text-xs font-mono text-emerald-400 overflow-x-auto">
              {JSON.stringify(healthData, null, 2)}
            </pre>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span>OpenAPI 3.0 Document (/api/v1/openapi.json)</span>
            </h3>
            <span className="text-[11px] font-mono text-zinc-400">Spec Version: 3.0.3</span>
          </div>
          <pre className="bg-zinc-950 border border-zinc-800 rounded p-4 text-xs font-mono text-amber-300 overflow-x-auto max-h-[600px]">
            {JSON.stringify(openapiSpec, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
