import React, { useEffect, useState } from 'react';
import {
  Share2,
  GitMerge,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Clock,
  Zap,
  Building2,
  Cpu,
  Layers,
  Wrench,
  Package,
  RefreshCw,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api.ts';

type GraphSubTab = 'topology' | 'context' | 'traversal' | 'review' | 'resolve';

export const KnowledgeGraphView: React.FC<{ activeTenantId?: string }> = ({ activeTenantId }) => {
  const [subTab, setSubTab] = useState<GraphSubTab>('topology');
  const [nodes, setNodes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [contextDossier, setContextDossier] = useState<any>(null);
  const [traversalResult, setTraversalResult] = useState<any>(null);
  const [traversalDir, setTraversalDir] = useState<'DOWNSTREAM' | 'UPSTREAM' | 'BOTH'>('BOTH');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Resolution Simulator State
  const [simName, setSimName] = useState('Hermle C42-U CNC Milling Machine');
  const [simCanonicalId, setSimCanonicalId] = useState('CMMS-HERMLE-01');
  const [simEntityType, setSimEntityType] = useState('Machine');
  const [simCategory, setSimCategory] = useState('ASSET');
  const [simResolutionResult, setSimResolutionResult] = useState<any>(null);

  useEffect(() => {
    loadGraphData();
  }, [activeTenantId, subTab]);

  const loadGraphData = async () => {
    try {
      setLoading(true);
      const [nodesRes, statsRes, reviewRes] = await Promise.all([
        api.getGraphNodes(),
        api.getGraphStats(),
        api.getReviewQueue(),
      ]);

      setNodes(nodesRes.nodes);
      setStats(statsRes);
      setReviewItems(reviewRes.items);

      if (nodesRes.nodes.length > 0 && !selectedNodeId) {
        // Select machine by default if available
        const mach = nodesRes.nodes.find((n: any) => n.entityType === 'Machine') || nodesRes.nodes[0];
        setSelectedNodeId(mach.id);
        fetchContext(mach.id);
      }
    } catch (err) {
      console.error('Failed to load graph data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      await api.seedDemoGraph();
      setFeedback({ type: 'success', message: 'Standard Industrial Hierarchy (Plant → Line → Machine → Sensor → WorkOrder) seeded successfully!' });
      await loadGraphData();
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const fetchContext = async (nodeId: string) => {
    try {
      setLoading(true);
      const dossier = await api.getEntityContext(nodeId);
      setContextDossier(dossier);
    } catch (err) {
      console.error('Failed to fetch context dossier:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTraverse = async () => {
    if (!selectedNodeId) return;
    try {
      setLoading(true);
      const result = await api.traverseGraph({
        nodeId: selectedNodeId,
        direction: traversalDir,
        maxDepth: 3,
      });
      setTraversalResult(result);
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleResolveEntity = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const res = await api.createGraphNode({
        canonicalId: simCanonicalId,
        name: simName,
        entityType: simEntityType,
        category: simCategory,
        attributes: { simulated: true, testedAt: new Date().toISOString() },
      });
      setSimResolutionResult(res);
      setFeedback({
        type: 'success',
        message: `Entity Resolution Result: ${res.action} (Confidence: ${(res.confidence * 100).toFixed(1)}%)`,
      });
      await loadGraphData();
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewDecision = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      setLoading(true);
      await api.decideReviewItem(id, decision, 'Engineer decision via Knowledge Graph Console');
      setFeedback({
        type: 'success',
        message: `Candidate ${decision === 'APPROVED' ? 'Approved & Merged' : 'Rejected'} successfully.`,
      });
      await loadGraphData();
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const getBadgeColor = (category: string) => {
    switch (category) {
      case 'ENTERPRISE': return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'ASSET': return 'bg-blue-950/80 text-blue-300 border-blue-800';
      case 'PROCESS': return 'bg-purple-950/80 text-purple-300 border-purple-800';
      case 'PRODUCT': return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      case 'MAINTENANCE': return 'bg-orange-950/80 text-orange-300 border-orange-800';
      case 'QUALITY': return 'bg-red-950/80 text-red-300 border-red-800';
      default: return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-950/80 border border-amber-800/80 text-amber-300 rounded uppercase">
                Phase 3 // Knowledge Graph Active
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 rounded flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Deterministic Entity Resolution & Human Review Queue</span>
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-2 font-mono">
              Industrial Knowledge Graph & Context Engine
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Maps enterprise assets, processes, and telemetry into a bi-directional, time-aware graph. Builds complete 360° entity context dossiers in &lt;100ms.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSeedDemo}
              disabled={loading}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded text-xs font-mono flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>Seed Standard Graph</span>
            </button>
            <button
              onClick={loadGraphData}
              disabled={loading}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition cursor-pointer"
              title="Refresh Graph"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Feedback */}
        {feedback && (
          <div
            className={`mt-4 p-3 rounded border text-xs font-mono flex items-center space-x-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-red-950/40 border-red-800 text-red-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded font-mono text-xs">
          <div className="text-[10px] uppercase text-zinc-500">Ontology Nodes</div>
          <div className="text-lg font-bold text-white mt-0.5">{stats?.totalNodes ?? nodes.length}</div>
        </div>
        <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded font-mono text-xs">
          <div className="text-[10px] uppercase text-zinc-500">Active Relationships</div>
          <div className="text-lg font-bold text-white mt-0.5">{stats?.totalEdges ?? 0}</div>
        </div>
        <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded font-mono text-xs">
          <div className="text-[10px] uppercase text-zinc-500">Context Build Latency</div>
          <div className="text-lg font-bold text-emerald-400 mt-0.5">
            {contextDossier ? `${contextDossier.executionTimeMs}ms` : '< 1ms'}
          </div>
        </div>
        <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded font-mono text-xs">
          <div className="text-[10px] uppercase text-zinc-500">Human Review Queue</div>
          <div className={`text-lg font-bold mt-0.5 ${reviewItems.length > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
            {reviewItems.length}
          </div>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setSubTab('topology')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-mono transition ${
            subTab === 'topology'
              ? 'bg-amber-500 text-zinc-950 font-bold'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>1. Graph Topology</span>
        </button>

        <button
          onClick={() => setSubTab('context')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-mono transition ${
            subTab === 'context'
              ? 'bg-amber-500 text-zinc-950 font-bold'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>2. 360° Context Dossier (&lt;100ms)</span>
        </button>

        <button
          onClick={() => setSubTab('traversal')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-mono transition ${
            subTab === 'traversal'
              ? 'bg-amber-500 text-zinc-950 font-bold'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>3. Bi-Directional Traversal</span>
        </button>

        <button
          onClick={() => setSubTab('review')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-mono transition ${
            subTab === 'review'
              ? 'bg-amber-500 text-zinc-950 font-bold'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>4. Human Review Queue ({reviewItems.length})</span>
        </button>

        <button
          onClick={() => setSubTab('resolve')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-mono transition ${
            subTab === 'resolve'
              ? 'bg-amber-500 text-zinc-950 font-bold'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <GitMerge className="w-3.5 h-3.5" />
          <span>5. Entity Resolution Sandbox</span>
        </button>
      </div>

      {/* SUBTAB 1: TOPOLOGY */}
      {subTab === 'topology' && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold flex items-center space-x-2">
              <Share2 className="w-4 h-4 text-amber-400" />
              <span>Discovered Knowledge Graph Entities</span>
            </h3>
            <span className="text-[10px] font-mono text-zinc-400">Click any entity to inspect its 360° context</span>
          </div>

          {nodes.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-500 space-y-2">
              <p>Knowledge Graph is empty for this tenant.</p>
              <button
                onClick={handleSeedDemo}
                className="px-3 py-1.5 bg-amber-500 text-zinc-950 font-bold rounded text-xs"
              >
                Click here to seed Standard Industrial Hierarchy
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {nodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => {
                    setSelectedNodeId(node.id);
                    fetchContext(node.id);
                    setSubTab('context');
                  }}
                  className={`p-3.5 rounded border transition cursor-pointer ${
                    selectedNodeId === node.id
                      ? 'bg-zinc-800 border-amber-500'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono border ${getBadgeColor(node.category)}`}>
                      {node.category} // {node.entityType}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">v{node.version}</span>
                  </div>
                  <div className="text-xs font-bold text-white mt-2 truncate">{node.name}</div>
                  <div className="text-[10px] font-mono text-zinc-400 mt-1">{node.canonicalId}</div>

                  <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span>{node.sourceRefs?.length || 1} source(s)</span>
                    <span className="text-amber-400 flex items-center space-x-1">
                      <span>View Context</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: 360° CONTEXT DOSSIER */}
      {subTab === 'context' && (
        <div className="space-y-4">
          {contextDossier ? (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getBadgeColor(contextDossier.targetEntity.category)}`}>
                      {contextDossier.targetEntity.category} // {contextDossier.targetEntity.entityType}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono flex items-center space-x-1">
                      <Zap className="w-3 h-3" />
                      <span>Context Built in {contextDossier.executionTimeMs}ms (&lt; 100ms DoD)</span>
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight mt-1.5 font-mono">
                    {contextDossier.targetEntity.name}
                  </h3>
                  <div className="text-xs font-mono text-zinc-400 mt-0.5">
                    Canonical ID: <strong className="text-amber-400">{contextDossier.targetEntity.canonicalId}</strong> • Version {contextDossier.targetEntity.version}
                  </div>
                </div>

                <div className="text-xs font-mono text-zinc-400">
                  <select
                    value={selectedNodeId}
                    onChange={(e) => {
                      setSelectedNodeId(e.target.value);
                      fetchContext(e.target.value);
                    }}
                    className="bg-zinc-950 border border-zinc-800 rounded p-2 text-amber-400 focus:outline-none"
                  >
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.entityType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Summary Narrative */}
              <div className="p-3.5 rounded bg-zinc-950 border border-zinc-800/80 font-mono text-xs text-zinc-300">
                <div className="text-[10px] uppercase text-zinc-500 font-semibold mb-1">Operational Summary</div>
                <div>{contextDossier.summaryNarrative}</div>
              </div>

              {/* 360-degree Context Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
                {/* Enterprise Hierarchy */}
                <div className="p-4 rounded bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="text-[10px] uppercase text-amber-400 font-bold flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Enterprise Hierarchy</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div>Plant: <span className="text-white font-semibold">{contextDossier.hierarchy.plant?.name || 'N/A'}</span></div>
                    <div>Line: <span className="text-white font-semibold">{contextDossier.hierarchy.line?.name || 'N/A'}</span></div>
                    <div>Cell / Station: <span className="text-zinc-400">{contextDossier.hierarchy.cell?.name || contextDossier.hierarchy.station?.name || 'Assigned to Line Main'}</span></div>
                  </div>
                </div>

                {/* Connected Sensors & IoT */}
                <div className="p-4 rounded bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="text-[10px] uppercase text-blue-400 font-bold flex items-center space-x-1.5">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Connected Sensors ({contextDossier.connectedAssets.sensors.length})</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {contextDossier.connectedAssets.sensors.length === 0 ? (
                      <div className="text-zinc-500">No sensors bound to asset</div>
                    ) : (
                      contextDossier.connectedAssets.sensors.map((s: any) => (
                        <div key={s.id} className="text-zinc-300 text-[11px] flex justify-between">
                          <span>{s.name}</span>
                          <span className="text-blue-400">{s.attributes?.metric || 'active'}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Active Work Orders */}
                <div className="p-4 rounded bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="text-[10px] uppercase text-purple-400 font-bold flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Active Work Orders ({contextDossier.activeProcesses.workOrders.length})</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {contextDossier.activeProcesses.workOrders.length === 0 ? (
                      <div className="text-zinc-500">No active work orders</div>
                    ) : (
                      contextDossier.activeProcesses.workOrders.map((wo: any) => (
                        <div key={wo.id} className="text-zinc-300 text-[11px]">
                          <div className="font-semibold text-white">{wo.name}</div>
                          <div className="text-[10px] text-purple-300">Status: {wo.attributes?.status || 'RUNNING'}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Maintenance Events */}
                <div className="p-4 rounded bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="text-[10px] uppercase text-orange-400 font-bold flex items-center space-x-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Maintenance Orders ({contextDossier.maintenanceHistory.maintenanceOrders.length})</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {contextDossier.maintenanceHistory.maintenanceOrders.length === 0 ? (
                      <div className="text-zinc-500">No open maintenance orders</div>
                    ) : (
                      contextDossier.maintenanceHistory.maintenanceOrders.map((mo: any) => (
                        <div key={mo.id} className="text-zinc-300 text-[11px]">
                          <div className="font-semibold text-white">{mo.name}</div>
                          <div className="text-[10px] text-orange-300">{mo.attributes?.scheduledDate || 'Scheduled'}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Products & SKUs */}
                <div className="p-4 rounded bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="text-[10px] uppercase text-emerald-400 font-bold flex items-center space-x-1.5">
                    <Package className="w-3.5 h-3.5" />
                    <span>Target Products & SKUs ({contextDossier.activeProcesses.products.length})</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {contextDossier.activeProcesses.products.length === 0 ? (
                      <div className="text-zinc-500">No product definitions attached</div>
                    ) : (
                      contextDossier.activeProcesses.products.map((p: any) => (
                        <div key={p.id} className="text-zinc-300 text-[11px]">
                          <div className="font-semibold text-white">{p.name}</div>
                          <div className="text-[10px] text-zinc-400">{p.canonicalId}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Multi-Source Provenance */}
                <div className="p-4 rounded bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="text-[10px] uppercase text-zinc-400 font-bold flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Source Provenance</span>
                  </div>
                  <div className="space-y-1 pt-1">
                    {contextDossier.targetEntity.sourceRefs?.map((sr: any, idx: number) => (
                      <div key={idx} className="p-1.5 rounded bg-zinc-900 text-[10px] flex justify-between">
                        <span className="text-zinc-300">{sr.sourceId}</span>
                        <span className="text-amber-400 font-bold">{sr.externalId}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs font-mono text-zinc-500">
              Select an entity from the Topology tab to generate its 360° context.
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: BI-DIRECTIONAL TRAVERSAL */}
      {subTab === 'traversal' && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-5 space-y-4 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs uppercase tracking-wider text-zinc-300 font-semibold">
                Bi-Directional Graph Traversal Engine
              </h3>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Inspect Upstream (Root Cause / Hierarchy) or Downstream (Impact / Components) paths.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={traversalDir}
                onChange={(e) => setTraversalDir(e.target.value as any)}
                className="bg-zinc-950 border border-zinc-800 rounded p-2 text-white"
              >
                <option value="DOWNSTREAM">DOWNSTREAM (Forward Impact)</option>
                <option value="UPSTREAM">UPSTREAM (Parent / Root Cause)</option>
                <option value="BOTH">BOTH DIRECTIONS</option>
              </select>

              <button
                onClick={handleTraverse}
                disabled={loading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded transition cursor-pointer"
              >
                Execute Traversal
              </button>
            </div>
          </div>

          {traversalResult ? (
            <div className="mt-4 space-y-3 pt-3 border-t border-zinc-800">
              <div className="flex items-center space-x-4 text-zinc-400 text-[11px]">
                <span>Root: <strong className="text-white">{traversalResult.rootNode.name}</strong></span>
                <span>Hops Discovered: <strong className="text-amber-400">{traversalResult.steps.length}</strong></span>
                <span>Time: <strong className="text-emerald-400">{traversalResult.executionTimeMs}ms</strong></span>
              </div>

              <div className="space-y-2 mt-2">
                {traversalResult.steps.map((step: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400">
                        HOP {step.depth}
                      </span>
                      {step.direction === 'UPSTREAM' ? (
                        <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <div>
                        <span className="text-white font-bold">{step.node.name}</span>
                        <span className="text-zinc-500 text-[11px] ml-2">({step.node.entityType})</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {step.edge?.relationType || 'ROOT'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-zinc-500">
              Click "Execute Traversal" to compute connected path.
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: HUMAN REVIEW QUEUE */}
      {subTab === 'review' && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-5 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider text-amber-400 font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Human Review Queue (Confidence 0.50 - 0.79)</span>
            </h3>
            <span className="text-zinc-400">Pending Decisions: {reviewItems.length}</span>
          </div>

          <p className="text-zinc-400 text-[11px]">
            Strict Rule Enforced: Entities with match confidence &lt; 0.8 are never merged automatically. A qualified engineer must review and approve or reject.
          </p>

          {reviewItems.length === 0 ? (
            <div className="py-10 text-center text-zinc-500">
              Human Review Queue is clear. No ambiguous entity matches pending.
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              {reviewItems.map((item) => (
                <div key={item.id} className="p-4 rounded bg-zinc-950 border border-amber-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px]">
                      Match Confidence: {(item.confidence * 100).toFixed(1)}% (Ambiguous)
                    </span>
                    <span className="text-[10px] text-zinc-500">ID: {item.id}</span>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="text-zinc-400 uppercase text-[10px]">Detection Reasons:</div>
                    {item.matchReasons?.map((r: string, idx: number) => (
                      <div key={idx} className="text-zinc-200">• {r}</div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleReviewDecision(item.id, 'REJECTED')}
                      disabled={loading}
                      className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center space-x-1 transition cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      <span>Reject (Keep Distinct)</span>
                    </button>
                    <button
                      onClick={() => handleReviewDecision(item.id, 'APPROVED')}
                      disabled={loading}
                      className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center space-x-1 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Merge Entities</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 5: RESOLUTION SANDBOX */}
      {subTab === 'resolve' && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-5 space-y-4 font-mono text-xs">
          <h3 className="text-xs uppercase tracking-wider text-zinc-300 font-semibold">
            Deterministic Entity Resolution Sandbox
          </h3>
          <p className="text-zinc-400 text-[11px]">
            Test how incoming records match existing entities using Levenshtein distance, exact asset tags, and confidence thresholds.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">INCOMING ASSET NAME</label>
              <input
                type="text"
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">CANONICAL / SOURCE ID</label>
              <input
                type="text"
                value={simCanonicalId}
                onChange={(e) => setSimCanonicalId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white"
              />
            </div>
          </div>

          <button
            onClick={handleResolveEntity}
            disabled={loading}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded flex items-center space-x-1.5 transition cursor-pointer"
          >
            <GitMerge className="w-3.5 h-3.5 fill-current" />
            <span>Simulate Resolution</span>
          </button>

          {simResolutionResult && (
            <div className="p-4 rounded bg-zinc-950 border border-zinc-800 space-y-2 mt-4">
              <div className="text-[10px] uppercase text-zinc-500">Resolution Decision:</div>
              <div className="text-white font-bold text-sm">
                Action: <span className="text-amber-400">{simResolutionResult.action}</span>
              </div>
              <div>Confidence Score: <strong className="text-emerald-400">{(simResolutionResult.confidence * 100).toFixed(1)}%</strong></div>
              <div className="text-zinc-400 text-[11px]">Target Node ID: {simResolutionResult.node?.id} (v{simResolutionResult.node?.version})</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
