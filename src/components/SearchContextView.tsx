/**
 * Industrial Brain — Search Console & Operational Context Engine View
 * Phase 4: Context Engine & Hybrid Search
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  FileText,
  Layers,
  Zap,
  BookOpen,
  Filter,
  CheckCircle,
  AlertTriangle,
  Database,
  RefreshCw,
  PlusCircle,
  Cpu,
  ChevronRight,
  Code,
  Tag,
  Hash,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api.ts';

interface SearchContextViewProps {
  activeTenantId?: string;
}

export const SearchContextView: React.FC<SearchContextViewProps> = ({ activeTenantId }) => {
  const [activeSubTab, setActiveSubTab] = useState<'search' | 'context' | 'documents' | 'ingest'>('search');
  const [query, setQuery] = useState('E-4012');
  const [targetEntityId, setTargetEntityId] = useState('');
  const [topK, setTopK] = useState(5);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hybrid Search Results
  const [searchResults, setSearchResults] = useState<{
    query: string;
    totalHits: number;
    results: any[];
    executionTimeMs: number;
  } | null>(null);

  // Assembled Context
  const [assembledContext, setAssembledContext] = useState<any | null>(null);
  const [contextLoading, setContextLoading] = useState(false);

  // Document Library
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [docChunks, setDocChunks] = useState<any[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  // Ingestion Form State
  const [ingestTitle, setIngestTitle] = useState('');
  const [ingestDocType, setIngestDocType] = useState('MANUAL');
  const [ingestContent, setIngestContent] = useState('');
  const [ingestSourceFile, setIngestSourceFile] = useState('');
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);

  // Graph nodes for entity selector
  const [graphNodes, setGraphNodes] = useState<any[]>([]);

  // Load initial documents and graph nodes
  useEffect(() => {
    loadInitialData();
  }, [activeTenantId]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch documents
      const docRes = await api.getDocuments();
      if (docRes.documents.length === 0) {
        // Automatically seed standard documents if tenant library is empty
        await api.seedStandardDocs();
        const recheck = await api.getDocuments();
        setDocuments(recheck.documents);
      } else {
        setDocuments(docRes.documents);
      }

      // 2. Fetch Knowledge Graph nodes for linking
      const graphRes = await api.getGraphNodes();
      setGraphNodes(graphRes.nodes);

      // Run default search
      executeSearch('E-4012');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const executeSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.searchHybrid({
        q: searchQuery,
        targetEntityId: targetEntityId || undefined,
        topK,
      });
      setSearchResults(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssembleContext = async () => {
    setContextLoading(true);
    setError(null);
    try {
      const res = await api.getAssembledContext({
        q: query,
        targetEntityId: targetEntityId || undefined,
      });
      setAssembledContext(res);
      setActiveSubTab('context');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setContextLoading(false);
    }
  };

  const handleSelectDoc = async (doc: any) => {
    setSelectedDoc(doc);
    setLoadingChunks(true);
    try {
      const res = await api.getDocumentChunks(doc.id);
      setDocChunks(res.chunks);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingChunks(false);
    }
  };

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestTitle || !ingestContent) return;
    setLoading(true);
    setIngestStatus(null);
    try {
      const res = await api.ingestDocument({
        title: ingestTitle,
        docType: ingestDocType,
        content: ingestContent,
        sourceFile: ingestSourceFile || undefined,
      });
      setIngestStatus(`Document successfully ingested! Created ${res.chunkCount} structured chunks.`);
      setIngestTitle('');
      setIngestContent('');
      setIngestSourceFile('');
      // Reload documents
      const docsRes = await api.getDocuments();
      setDocuments(docsRes.documents);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const quickQueries = [
    { label: 'E-4012 (Spindle Alarm)', q: 'E-4012' },
    { label: 'ERR-HYD-04 (Coolant Cavitation)', q: 'ERR-HYD-04' },
    { label: 'Hydraulic Clamping (<180 bar)', q: 'Hydraulic Clamping Pressure Loss' },
    { label: 'Ti-6Al-4V Aero Blade SOP', q: 'Ti-6Al-4V aerospace blade cutting speed' },
    { label: 'Spindle Temperature Limit', q: 'spindle bearing over-temperature limit' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>PHASE 4 // CONTEXT ENGINE & HYBRID SEARCH</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-3">
            <span>Hybrid Search & Operational Context Engine</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded border border-cyan-800 bg-cyan-950/60 text-cyan-300">
              BM25 + Semantic Vector + Graph RRF
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real data retrieval engine combining exact keyword matching, dense semantic representations, and Knowledge Graph entity topology.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadInitialData()}
            className="flex items-center space-x-1 px-3 py-1.5 rounded text-xs font-mono border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded border border-rose-900/50 bg-rose-950/20 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveSubTab('search')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition ${
            activeSubTab === 'search'
              ? 'bg-cyan-500 text-zinc-950 font-bold border border-cyan-400'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Hybrid Search Console</span>
        </button>

        <button
          onClick={() => setActiveSubTab('context')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition ${
            activeSubTab === 'context'
              ? 'bg-cyan-500 text-zinc-950 font-bold border border-cyan-400'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Assembled Reasoning Context</span>
        </button>

        <button
          onClick={() => setActiveSubTab('documents')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition ${
            activeSubTab === 'documents'
              ? 'bg-cyan-500 text-zinc-950 font-bold border border-cyan-400'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Document Library & Chunks ({documents.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ingest')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition ${
            activeSubTab === 'ingest'
              ? 'bg-cyan-500 text-zinc-950 font-bold border border-cyan-400'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Ingest Technical Document</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: HYBRID SEARCH CONSOLE */}
      {/* ========================================================================= */}
      {activeSubTab === 'search' && (
        <div className="space-y-6">
          {/* Search Bar & Entity Scope Filter */}
          <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
                  placeholder="Enter exact error code (e.g. E-4012), technical term, or semantic question..."
                  className="w-full bg-zinc-950 border border-zinc-700 pl-10 pr-4 py-2 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              {/* Target Entity Selector */}
              <div className="w-full md:w-72">
                <select
                  value={targetEntityId}
                  onChange={(e) => setTargetEntityId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 px-3 py-2 rounded text-xs text-zinc-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Scope: All Factory Entities</option>
                  {graphNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.canonicalId} - {n.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => executeSearch()}
                disabled={loading}
                className="px-5 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold text-xs flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Execute Search</span>
              </button>

              <button
                onClick={handleAssembleContext}
                disabled={contextLoading}
                className="px-4 py-2 rounded border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono flex items-center justify-center space-x-2 transition"
                title="Assemble unified physical hierarchy + live sensors + manual steps for reasoning"
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Assemble Context</span>
              </button>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800/60">
              <span className="text-xs text-zinc-500 flex items-center space-x-1 font-mono">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Quick Benchmarks:</span>
              </span>
              {quickQueries.map((item) => (
                <button
                  key={item.q}
                  onClick={() => {
                    setQuery(item.q);
                    executeSearch(item.q);
                  }}
                  className="px-2.5 py-1 rounded text-xs font-mono bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700/60 transition"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Latency & Metric Banner */}
          {searchResults && (
            <div className="flex items-center justify-between px-4 py-2 rounded border border-zinc-800 bg-zinc-900 text-xs font-mono">
              <div className="flex items-center space-x-3 text-zinc-300">
                <span>
                  Query: <span className="text-white font-bold font-mono">"{searchResults.query}"</span>
                </span>
                <span className="text-zinc-600">|</span>
                <span>
                  Hits Found: <span className="text-cyan-400 font-bold">{searchResults.totalHits}</span>
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-400">Hybrid Latency:</span>
                <span className={`px-2 py-0.5 rounded font-bold ${searchResults.executionTimeMs < 200 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300'}`}>
                  ⚡ {searchResults.executionTimeMs} ms
                </span>
                <span className="text-zinc-500 text-[10px]">(Target: &lt;200ms)</span>
              </div>
            </div>
          )}

          {/* Results List */}
          {searchResults && searchResults.results.length === 0 && (
            <div className="p-8 text-center border border-zinc-800 rounded-lg bg-zinc-900/30 text-zinc-400 text-sm">
              No matching technical documents or manual chunks found for this query.
            </div>
          )}

          {searchResults && searchResults.results.length > 0 && (
            <div className="space-y-4">
              {searchResults.results.map((item, index) => (
                <div
                  key={item.chunk.id}
                  className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 transition space-y-3"
                >
                  {/* Top Bar: Doc Title + RRF Score */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs font-bold">
                        #{index + 1}
                      </span>
                      <FileText className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-semibold text-white">{item.document.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                        {item.document.docType}
                      </span>
                    </div>

                    {/* RRF Score Breakdown Badges */}
                    <div className="flex items-center space-x-2 font-mono text-xs">
                      <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold" title="Reciprocal Rank Fusion Total Score">
                        RRF: {item.rrfScore}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px]" title="BM25 Exact Keyword Score">
                        BM25: {item.bm25Score}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px]" title="Semantic Vector Similarity">
                        Vector: {(item.vectorScore * 100).toFixed(0)}%
                      </span>
                      {item.graphScore > 0 && (
                        <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 text-[11px]">
                          Graph Linked
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Section & Extracted Metadata */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {item.chunk.sectionHeader && (
                      <span className="text-zinc-400 flex items-center space-x-1">
                        <Tag className="w-3 h-3 text-zinc-500" />
                        <span>Section: {item.chunk.sectionHeader}</span>
                      </span>
                    )}

                    {item.chunk.errorCodes.length > 0 && (
                      <div className="flex items-center space-x-1 font-mono">
                        <span className="text-rose-400 font-bold">Error Codes:</span>
                        {item.chunk.errorCodes.map((ec: string) => (
                          <span
                            key={ec}
                            className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 font-bold"
                          >
                            {ec}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.chunk.linkedEntityIds.length > 0 && (
                      <div className="flex items-center space-x-1 font-mono text-zinc-400">
                        <span>Entities:</span>
                        {item.chunk.linkedEntityIds.map((lid: string) => (
                          <span key={lid} className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 text-[11px]">
                            {lid}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Chunk Content: Table vs Text */}
                  {item.chunk.isTable && item.chunk.tableData ? (
                    <div className="overflow-x-auto rounded border border-zinc-800 bg-zinc-950 p-2 text-xs font-mono">
                      <table className="min-w-full divide-y divide-zinc-800">
                        <thead>
                          <tr className="text-left text-zinc-400">
                            {item.chunk.tableData[0]?.map((head: string, hi: number) => (
                              <th key={hi} className="px-3 py-1.5 uppercase font-medium">
                                {head}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                          {item.chunk.tableData.slice(1).map((row: string[], ri: number) => (
                            <tr key={ri} className="hover:bg-zinc-900/60">
                              {row.map((cell: string, ci: number) => (
                                <td key={ci} className="px-3 py-1.5">
                                  {cell.includes('E-') || cell.includes('ERR-') ? (
                                    <span className="text-amber-400 font-bold">{cell}</span>
                                  ) : (
                                    cell
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-3 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {item.chunk.content}
                    </div>
                  )}

                  {/* Match Explanations */}
                  {item.matchReasons.length > 0 && (
                    <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                      <span className="text-zinc-500">RRF Explanations:</span>
                      {item.matchReasons.map((reason: string, ridx: number) => (
                        <span key={ridx} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: ASSEMBLED REASONING CONTEXT */}
      {/* ========================================================================= */}
      {activeSubTab === 'context' && (
        <div className="space-y-6">
          <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Assembled Multi-Modal Reasoning Context</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Unified operational dossier combining physical asset topology, live sensors, active processes, and hybrid retrieved manuals with zero hallucinations.
              </p>
            </div>

            <button
              onClick={handleAssembleContext}
              disabled={contextLoading}
              className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold text-xs flex items-center space-x-2 transition disabled:opacity-50"
            >
              {contextLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Re-Assemble Dossier</span>
            </button>
          </div>

          {assembledContext ? (
            <div className="space-y-4">
              {/* Context Metric Header */}
              <div className="flex items-center justify-between px-4 py-2 rounded border border-zinc-800 bg-zinc-900 text-xs font-mono">
                <div className="flex items-center space-x-3 text-zinc-300">
                  <span>Target Query: <span className="text-white font-bold">"{assembledContext.query}"</span></span>
                  <span className="text-zinc-600">|</span>
                  <span>Related Chunks: <span className="text-cyan-400 font-bold">{assembledContext.relevantChunks.length}</span></span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-zinc-400">Context Assembly Latency:</span>
                  <span className="px-2 py-0.5 rounded font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    ⚡ {assembledContext.executionTimeMs} ms
                  </span>
                </div>
              </div>

              {/* Raw Prompt Assembled Text */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-mono flex items-center space-x-1">
                    <Code className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Exact System Prompt Injection Buffer (Grounding Source of Truth):</span>
                  </span>
                  <span className="font-mono text-zinc-500">
                    Characters: {assembledContext.assembledPromptContext.length}
                  </span>
                </div>
                <pre className="p-4 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                  {assembledContext.assembledPromptContext}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center border border-zinc-800 rounded-lg bg-zinc-900/30 text-zinc-400 text-sm space-y-3">
              <p>No operational context assembled yet.</p>
              <button
                onClick={handleAssembleContext}
                className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold text-xs inline-flex items-center space-x-2"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Assemble Context for "{query}"</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: DOCUMENT LIBRARY & CHUNKS */}
      {/* ========================================================================= */}
      {activeSubTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider">
              Tenant Technical Documents ({documents.length})
            </h2>

            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleSelectDoc(doc)}
                  className={`p-3 rounded-lg border cursor-pointer transition space-y-1.5 ${
                    selectedDoc?.id === doc.id
                      ? 'border-cyan-500 bg-cyan-950/20'
                      : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-cyan-300 font-bold">
                      {doc.docType}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white line-clamp-1">{doc.title}</div>
                  {doc.sourceFile && (
                    <div className="text-[11px] text-zinc-400 font-mono truncate">
                      Source: {doc.sourceFile}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Document Chunks Inspector */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <span>Structure-Aware Chunks & Tables Inspector</span>
              {selectedDoc && (
                <span className="text-cyan-400 font-mono">
                  {selectedDoc.title} ({docChunks.length} Chunks)
                </span>
              )}
            </h2>

            {loadingChunks ? (
              <div className="p-8 text-center text-zinc-400 text-xs font-mono">Loading chunks...</div>
            ) : !selectedDoc ? (
              <div className="p-12 text-center border border-zinc-800 rounded-lg bg-zinc-900/20 text-zinc-400 text-sm">
                Select a document from the left to inspect its structure-aware chunks, tables, and extracted error codes.
              </div>
            ) : (
              <div className="space-y-3">
                {docChunks.map((chunk) => (
                  <div key={chunk.id} className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-400 border-b border-zinc-800 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-bold">
                          Chunk #{chunk.chunkIndex + 1}
                        </span>
                        {chunk.isTable && (
                          <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 font-bold">
                            Table Block
                          </span>
                        )}
                        {chunk.sectionHeader && (
                          <span className="text-zinc-300">[{chunk.sectionHeader}]</span>
                        )}
                      </div>
                      <span className="text-zinc-500">{chunk.tokenCount} tokens</span>
                    </div>

                    {chunk.errorCodes.length > 0 && (
                      <div className="flex items-center space-x-1.5 text-xs font-mono">
                        <span className="text-zinc-400">Error Codes:</span>
                        {chunk.errorCodes.map((ec: string) => (
                          <span
                            key={ec}
                            className="px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-bold text-[11px]"
                          >
                            {ec}
                          </span>
                        ))}
                      </div>
                    )}

                    <pre className="p-3 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {chunk.content}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: INGEST TECHNICAL DOCUMENT */}
      {/* ========================================================================= */}
      {activeSubTab === 'ingest' && (
        <div className="max-w-3xl mx-auto p-6 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <PlusCircle className="w-4 h-4 text-cyan-400" />
              <span>Ingest Technical Documentation (SOP / Manual / Tech Spec)</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Document content is chunked using structure-aware parser (preserving tables and alarm matrices), error codes and technical parameters are extracted, and chunks are indexed in BM25 & Semantic vector stores.
            </p>
          </div>

          {ingestStatus && (
            <div className="p-3 rounded border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{ingestStatus}</span>
            </div>
          )}

          <form onSubmit={handleIngestSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Document Title *</label>
              <input
                type="text"
                required
                value={ingestTitle}
                onChange={(e) => setIngestTitle(e.target.value)}
                placeholder="e.g. Kuka KR-210 Industrial Robot Arm Servicing Manual"
                className="w-full bg-zinc-950 border border-zinc-700 px-3 py-2 rounded text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">Document Type *</label>
                <select
                  value={ingestDocType}
                  onChange={(e) => setIngestDocType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 px-3 py-2 rounded text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="MANUAL">MANUAL (Operating & Troubleshooting Manual)</option>
                  <option value="SOP">SOP (Standard Operating Procedure)</option>
                  <option value="TECH_SPEC">TECH_SPEC (Technical Specification Sheet)</option>
                  <option value="MAINTENANCE_LOG">MAINTENANCE_LOG (Maintenance Logbook)</option>
                  <option value="INCIDENT_REPORT">INCIDENT_REPORT (Factory Incident Report)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">Source File Name (Optional)</label>
                <input
                  type="text"
                  value={ingestSourceFile}
                  onChange={(e) => setIngestSourceFile(e.target.value)}
                  placeholder="e.g. KR210_Manual_2026.pdf"
                  className="w-full bg-zinc-950 border border-zinc-700 px-3 py-2 rounded text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">
                Content (Markdown / Plain Text with Tables) *
              </label>
              <textarea
                required
                rows={10}
                value={ingestContent}
                onChange={(e) => setIngestContent(e.target.value)}
                placeholder={`# Document Title\n\n## Section 1: Alarms\n| Error Code | Fault | Action |\n| --- | --- | --- |\n| E-1001 | Overvoltage | Check power supply |\n\n## Section 2: Parameters\nWorking Pressure: 200 bar`}
                className="w-full bg-zinc-950 border border-zinc-700 p-3 rounded text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold text-xs flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
              <span>Ingest & Index Document</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
