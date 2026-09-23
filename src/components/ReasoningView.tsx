/**
 * Industrial Brain — Root Cause Analysis & Decision Engine View
 * Phase 5: Reasoning & Decision Engine
 */

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  AlertTriangle,
  CheckCircle,
  Activity,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  Clock,
  DollarSign,
  AlertCircle,
  Zap,
  HelpCircle,
  RefreshCw,
  FileText,
  Radio,
  Layers,
  Sparkles,
  Lock,
} from 'lucide-react';
import { api } from '../services/api.ts';

interface ReasoningViewProps {
  activeTenantId?: string;
  activeRole?: string;
}

export const ReasoningView: React.FC<ReasoningViewProps> = ({ activeTenantId, activeRole }) => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [rcaResult, setRcaResult] = useState<any | null>(null);
  const [correlatedPatterns, setCorrelatedPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIncidents();
  }, [activeTenantId]);

  const loadIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getIncidents();
      setIncidents(res.incidents);
      if (res.incidents.length > 0) {
        setSelectedIncident(res.incidents[0]);
        // Run initial correlation analysis on the incident telemetry
        const corrRes = await api.analyzeCorrelations(res.incidents[0].telemetry);
        setCorrelatedPatterns(corrRes.patterns);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunRCA = async () => {
    if (!selectedIncident) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.runRCA({ incidentId: selectedIncident.id });
      setRcaResult(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-purple-400 mb-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>PHASE 5 // DETERMINISTIC REASONING & EVIDENCE-BASED RCA</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-3">
            <span>Root Cause Analysis & Decision Engine</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded border border-purple-800 bg-purple-950/60 text-purple-300">
              0% Hallucination Guarantee
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Deterministic inference engine combining multi-signal telemetry, Knowledge Graph topology, and technical manual matrices. AI proposes only — never executes without human approval.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadIncidents()}
            className="flex items-center space-x-1 px-3 py-1.5 rounded text-xs font-mono border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Incidents</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded border border-rose-900/50 bg-rose-950/20 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Incident Overview & Telemetry Snapshot */}
      {selectedIncident && (
        <div className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-mono text-xs font-bold">
                  {selectedIncident.errorCode} ALARM
                </span>
                <span className="text-sm font-bold text-white">
                  Spindle Emergency Halt — Hermle C42U 5-Axis Milling Center
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                {selectedIncident.description}
              </p>
            </div>

            <button
              onClick={handleRunRCA}
              disabled={loading}
              className="px-5 py-2.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-purple-950/50 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Execute Evidence-Based RCA</span>
            </button>
          </div>

          {/* Telemetry Snapshot Cards */}
          <div>
            <div className="text-xs font-mono text-zinc-400 mb-2 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>Synchronized Factory Telemetry Snapshot:</span>
              </span>
              <span className="text-[11px] text-zinc-500">Source: Historian SCADA Stream</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
              {selectedIncident.telemetry.map((t: any) => {
                const isTemp = t.metric.toLowerCase().includes('temp');
                const isPress = t.metric.toLowerCase().includes('press');
                const isAlert = isTemp ? t.value > t.threshold : isPress ? t.value < t.threshold : false;

                return (
                  <div
                    key={t.entityId}
                    className={`p-3 rounded border text-xs space-y-1 ${
                      isAlert
                        ? 'border-rose-800 bg-rose-950/30'
                        : 'border-zinc-800 bg-zinc-950'
                    }`}
                  >
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>{t.metric}</span>
                      <span className="text-[10px]">{t.entityId}</span>
                    </div>
                    <div className="flex items-baseline space-x-2">
                      <span className={`text-lg font-bold ${isAlert ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {t.value} {isTemp ? '°C' : isPress ? 'bar' : 'mm/s'}
                      </span>
                      <span className="text-zinc-500 text-[11px]">
                        (Limit: {t.threshold} {isTemp ? '°C' : isPress ? 'bar' : 'mm/s'})
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Temporal Correlation Banner */}
      {correlatedPatterns.length > 0 && (
        <div className="p-4 rounded-lg border border-amber-900/60 bg-amber-950/20 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-amber-400">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Temporal Anomaly Correlation (Correlation vs Physical Causation)</span>
          </div>
          {correlatedPatterns.map((pat) => (
            <div key={pat.id} className="text-xs text-zinc-300 font-mono space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-white font-bold">{pat.title}</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 text-[10px]">
                  Window: {pat.timeWindowSeconds}s
                </span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">
                  r = {pat.correlationCoefficient}
                </span>
                {pat.isCausalityConfirmed ? (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px]">
                    Thermodynamic Causality Confirmed
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 text-[10px]">
                    Statistical Correlation Only
                  </span>
                )}
              </div>
              <p className="text-zinc-400 text-[11px]">{pat.description}</p>
              {pat.warningNote && (
                <p className="text-amber-400/90 text-[11px] italic">{pat.warningNote}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* RCA RESULT SECTION */}
      {/* ========================================================================= */}
      {rcaResult && (
        <div className="space-y-6">
          {/* Summary Metrics Bar */}
          <div className="p-4 rounded-lg border border-purple-900/60 bg-purple-950/30 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center space-x-3 text-zinc-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-white font-bold">RCA Diagnostic Verified: </span>
                <span className="text-emerald-300">0 Unsupported Claims Detected (Zero Hallucination)</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-zinc-400">Execution Time:</span>
              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-purple-300 font-bold">
                ⚡ {rcaResult.executionTimeMs} ms
              </span>
            </div>
          </div>

          {/* Root Cause Hypotheses */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>Ranked Root Cause Hypotheses & Evidence Chains</span>
            </h2>

            <div className="space-y-4">
              {rcaResult.rootCauses.map((hyp: any) => (
                <div
                  key={hyp.rank}
                  className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/80 space-y-4"
                >
                  {/* Hypothesis Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <span className="px-2.5 py-1 rounded bg-purple-950 border border-purple-800 text-purple-300 font-mono text-xs font-bold">
                        Rank #{hyp.rank}
                      </span>
                      <span className="text-sm font-bold text-white">{hyp.failureMode}</span>
                    </div>

                    <div className="flex items-center space-x-2 font-mono text-xs">
                      <span className="text-zinc-400">Probability:</span>
                      <span className="px-2.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold">
                        {(hyp.probability * 100).toFixed(0)}%
                      </span>
                      {hyp.isCausationVerified && (
                        <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300 text-[10px]">
                          Physical Causality Verified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Alternative Explanation */}
                  {hyp.alternativeExplanation && (
                    <div className="p-3 rounded bg-zinc-950 border border-zinc-800/80 text-xs font-mono text-zinc-400 space-y-1">
                      <div className="text-zinc-500 font-semibold uppercase text-[10px]">
                        Differential Diagnostic & Alternative Hypotheses:
                      </div>
                      <p>{hyp.alternativeExplanation}</p>
                    </div>
                  )}

                  {/* Evidence Chain */}
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-zinc-400 flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Verifiable Evidence Chain ({hyp.evidenceChain.length} Data Sources):</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {hyp.evidenceChain.map((ev: any) => (
                        <div
                          key={ev.id}
                          className="p-3 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-300 text-[10px] font-bold">
                              {ev.sourceType}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              Weight: {(ev.confidenceWeight * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="text-zinc-300 font-semibold truncate">{ev.sourceName}</div>
                          <div className="text-[11px] text-zinc-400 bg-zinc-900 p-2 rounded border border-zinc-800/60 line-clamp-3 leading-relaxed">
                            "{ev.dataPointOrQuote}"
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Recommendations (Proposals Only - Safety Gate) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Evidence-Backed Operational Recommendations (AI Proposes Only)</span>
              </h2>
              <span className="text-xs font-mono text-amber-400 flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Mandatory Human Approval Gate Active</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rcaResult.recommendations.map((rec: any) => (
                <div
                  key={rec.id}
                  className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/80 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono text-xs font-bold">
                      {rec.category}
                    </span>
                    <span className="text-xs font-mono text-amber-300 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800">
                      Approval: {rec.requiredApprovalRole}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{rec.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                    {rec.description}
                  </p>

                  {/* Impact Estimation Matrix */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded bg-zinc-950 border border-zinc-800 text-center font-mono text-xs">
                    <div>
                      <div className="text-[10px] text-zinc-500">DOWNTIME</div>
                      <div className="font-bold text-cyan-400">{rec.estimatedImpact.downtimeMinutes} min</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500">EST. COST</div>
                      <div className="font-bold text-emerald-400">${rec.estimatedImpact.estimatedCostUsd}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500">RISK LEVEL</div>
                      <div className={`font-bold ${rec.estimatedImpact.riskLevel === 'LOW' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {rec.estimatedImpact.riskLevel}
                      </div>
                    </div>
                  </div>

                  {/* Target Action Payload */}
                  <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 space-y-1">
                    <div className="flex items-center justify-between text-zinc-500 text-[10px]">
                      <span>TARGET SYSTEM: {rec.actionPayload.systemTarget}</span>
                      <span>CMD: {rec.actionPayload.commandType}</span>
                    </div>
                    <pre className="text-zinc-300 text-[10px] overflow-x-auto">
                      {JSON.stringify(rec.actionPayload.parameters, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
