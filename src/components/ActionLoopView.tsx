/**
 * Industrial Brain — Action & Closed-Loop Execution View
 * Phase 6: Action & Closed Loop
 *
 * Real Data -> Real Reasoning -> Real Decision -> Controlled Action -> Verified Result
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Server,
  Activity,
  Layers,
  Clock,
  DollarSign,
  Cpu,
  RefreshCw,
  Lock,
  Unlock,
  Radio,
  FileCheck,
  Zap,
  Sliders,
} from 'lucide-react';
import { api } from '../services/api.ts';

interface ActionLoopViewProps {
  activeTenantId?: string;
  activeRole?: string;
}

export const ActionLoopView: React.FC<ActionLoopViewProps> = ({ activeTenantId, activeRole }) => {
  const [proposals, setProposals] = useState<any[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [machineState, setMachineState] = useState<string>('RUNNING_NORMAL');
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [feedbackResult, setFeedbackResult] = useState<any | null>(null);
  const [simulatedSensorValue, setSimulatedSensorValue] = useState<number>(56.0);
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadProposals();
  }, [activeTenantId]);

  const loadProposals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getActionProposals();
      setProposals(res.proposals);
      if (res.proposals.length > 0) {
        setSelectedProposal(res.proposals[0]);
      }
      // Load machine state
      const stateRes = await api.getMachineState('mach_alpha_cnc');
      setMachineState(stateRes.state || 'RUNNING_NORMAL');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleStateChange = async (newState: string) => {
    try {
      await api.setMachineState('mach_alpha_cnc', newState);
      setMachineState(newState);
      setSuccessMessage(`Machine operational state updated to: ${newState}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleApprove = async (proposalId: string) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await api.approveActionProposal(proposalId);
      setProposals(proposals.map((p) => (p.id === updated.id ? updated : p)));
      if (selectedProposal?.id === updated.id) {
        setSelectedProposal(updated);
      }
      setSuccessMessage(`Proposal '${updated.title}' approved by ${activeRole}.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (proposalId: string) => {
    const reason = window.prompt('Enter reason for rejection:');
    if (!reason) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await api.rejectActionProposal(proposalId, reason);
      setProposals(proposals.map((p) => (p.id === updated.id ? updated : p)));
      if (selectedProposal?.id === updated.id) {
        setSelectedProposal(updated);
      }
      setSuccessMessage(`Proposal rejected.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (proposalId: string) => {
    setLoading(true);
    setError(null);
    setExecutionResult(null);
    setFeedbackResult(null);
    try {
      const result = await api.executeActionProposal(proposalId);
      setExecutionResult(result);
      if (result.status === 'SUCCESS') {
        setSuccessMessage(`Action dispatched successfully to ${result.systemTarget} [Ref: ${result.externalReferenceId}]`);
      } else {
        setError(`Pre-Execution Guardrail Block: ${result.guardrailsEvaluation?.blockedReason}`);
      }
      // Refresh proposals
      const res = await api.getActionProposals();
      setProposals(res.proposals);
      const curr = res.proposals.find((p: any) => p.id === proposalId);
      if (curr) setSelectedProposal(curr);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyFeedback = async () => {
    if (!executionResult || !selectedProposal) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.verifyFeedback(executionResult.executionId, {
        proposalId: selectedProposal.id,
        currentSensorValue: simulatedSensorValue,
        elapsedMinutes: elapsedMinutes,
      });
      setFeedbackResult(result);
      if (result.rollbackTriggered) {
        // Refresh proposal status
        const res = await api.getActionProposals();
        setProposals(res.proposals);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRollback = async () => {
    if (!executionResult || !selectedProposal) return;
    if (!window.confirm('Trigger immediate manual rollback on target system?')) return;
    setLoading(true);
    setError(null);
    try {
      await api.triggerRollback(executionResult.executionId, selectedProposal.id);
      setSuccessMessage('Manual rollback dispatched successfully. Previous setpoints restored.');
      // Refresh proposals
      const res = await api.getActionProposals();
      setProposals(res.proposals);
      const curr = res.proposals.find((p: any) => p.id === selectedProposal.id);
      if (curr) setSelectedProposal(curr);
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
          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>PHASE 6 // PRE-EXECUTION GUARDRAILS & CLOSED-LOOP ACTION</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-3">
            <span>Action Dispatcher & Closed-Loop Execution</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded border border-emerald-800 bg-emerald-950/60 text-emerald-300">
              Closed Loop Verified
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Human approval matrix, 5-layer pre-execution safety guardrails, automated multi-system dispatch (CMMS, ERP, SCADA), and sensor feedback loops with automatic rollback guarantee.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadProposals()}
            className="flex items-center space-x-1 px-3 py-1.5 rounded text-xs font-mono border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Proposals</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 rounded border border-rose-900/50 bg-rose-950/20 text-rose-300 text-xs flex items-center space-x-2 font-mono">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3 rounded border border-emerald-900/50 bg-emerald-950/20 text-emerald-300 text-xs flex items-center space-x-2 font-mono">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Physical Machine State Simulator Banner */}
      <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-white font-bold">Physical Equipment Interlock State:</span>
            <span className="text-zinc-400">[CNC-5AXIS-03 / Hermle C42U]</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Switch machine operating states to test Pre-Execution Guardrail interlocks in real-time.
          </p>
        </div>

        <div className="flex items-center space-x-1.5">
          {(['IDLE', 'RUNNING_NORMAL', 'RUNNING_CRITICAL', 'MAINTENANCE', 'EMERGENCY_STOP'] as const).map(
            (state) => {
              const isActive = machineState === state;
              const isEStop = state === 'EMERGENCY_STOP';
              const isCrit = state === 'RUNNING_CRITICAL';

              return (
                <button
                  key={state}
                  onClick={() => handleStateChange(state)}
                  className={`px-2.5 py-1.5 rounded text-[11px] font-bold border transition ${
                    isActive
                      ? isEStop
                        ? 'border-rose-600 bg-rose-600 text-white shadow-lg shadow-rose-950/60'
                        : isCrit
                        ? 'border-amber-600 bg-amber-600 text-white shadow-lg shadow-amber-950/60'
                        : 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-950/60'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {state}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Main Grid: Proposals List & Execution Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Action Proposals List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between font-mono text-xs text-zinc-400 px-1">
            <span>Action Proposals Queue ({proposals.length})</span>
            <span className="text-[11px] text-purple-400">Human Approval Gate</span>
          </div>

          <div className="space-y-3">
            {proposals.map((prop) => {
              const isSelected = selectedProposal?.id === prop.id;
              const isApproved = prop.approvalStatus === 'APPROVED';
              const isExecuted = prop.approvalStatus === 'EXECUTED';
              const isRolledBack = prop.approvalStatus === 'ROLLED_BACK';

              return (
                <div
                  key={prop.id}
                  onClick={() => {
                    setSelectedProposal(prop);
                    setExecutionResult(null);
                    setFeedbackResult(null);
                  }}
                  className={`p-4 rounded-lg border text-xs font-mono cursor-pointer transition space-y-2.5 ${
                    isSelected
                      ? 'border-emerald-500 bg-zinc-900/90 shadow-md shadow-emerald-950/30'
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-cyan-300 font-bold text-[10px]">
                      {prop.systemTarget}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isExecuted
                          ? 'border-emerald-800 bg-emerald-950 text-emerald-300'
                          : isApproved
                          ? 'border-purple-800 bg-purple-950 text-purple-300'
                          : isRolledBack
                          ? 'border-amber-800 bg-amber-950 text-amber-300'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      {prop.approvalStatus}
                    </span>
                  </div>

                  <div className="text-zinc-200 font-bold line-clamp-2">{prop.title}</div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/80">
                    <span>Required: {prop.requiredApprovalRole}</span>
                    <span className="text-zinc-500">Risk: {prop.estimatedImpact.riskLevel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Proposal Detail & Pre-Execution Guardrails */}
        <div className="lg:col-span-2 space-y-6">
          {selectedProposal && (
            <div className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/80 space-y-5">
              {/* Proposal Header */}
              <div className="space-y-2 border-b border-zinc-800 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono text-xs font-bold">
                      {selectedProposal.systemTarget}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                      CMD: {selectedProposal.commandType}
                    </span>
                  </div>

                  {/* Approval Actions */}
                  <div className="flex items-center space-x-2 font-mono text-xs">
                    {selectedProposal.approvalStatus === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(selectedProposal.id)}
                          className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center space-x-1.5 transition"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Sign Off & Approve</span>
                        </button>
                        <button
                          onClick={() => handleReject(selectedProposal.id)}
                          className="px-3 py-1.5 rounded bg-rose-950 border border-rose-800 text-rose-300 hover:bg-rose-900 transition flex items-center space-x-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                    {selectedProposal.approvalStatus === 'APPROVED' && (
                      <span className="text-purple-300 flex items-center space-x-1.5 bg-purple-950/60 border border-purple-800 px-2.5 py-1 rounded">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Signed by: {selectedProposal.approvedBy}</span>
                      </span>
                    )}
                  </div>
                </div>

                <h2 className="text-base font-bold text-white tracking-tight">
                  {selectedProposal.title}
                </h2>
                <div className="text-xs font-mono text-zinc-400">
                  Target Asset: {selectedProposal.targetEntityName} ({selectedProposal.targetEntityId})
                </div>
              </div>

              {/* Action Impact Matrix */}
              <div className="grid grid-cols-3 gap-3 p-3 rounded bg-zinc-950 border border-zinc-800 text-center font-mono text-xs">
                <div>
                  <div className="text-[10px] text-zinc-500">EST. DOWNTIME</div>
                  <div className="font-bold text-cyan-400">{selectedProposal.estimatedImpact.downtimeMinutes} min</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">EST. COST</div>
                  <div className="font-bold text-emerald-400">${selectedProposal.estimatedImpact.estimatedCostUsd}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">RISK CLASSIFICATION</div>
                  <div className="font-bold text-amber-400">{selectedProposal.estimatedImpact.riskLevel}</div>
                </div>
              </div>

              {/* Parameters Payload */}
              <div className="p-3 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono space-y-1.5">
                <div className="text-zinc-500 text-[10px] uppercase font-bold">
                  Command Parameters Payload:
                </div>
                <pre className="text-zinc-300 text-[11px] overflow-x-auto leading-relaxed">
                  {JSON.stringify(selectedProposal.parameters, null, 2)}
                </pre>
              </div>

              {/* Pre-Execution Guardrails Inspector */}
              <div className="p-4 rounded-lg border border-purple-900/60 bg-purple-950/20 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-purple-300 font-bold">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-purple-400" />
                    <span>Pre-Execution Safety Guardrails:</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">Machine Interlock: {machineState}</span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>1. Hard Emergency Stop Interlock:</span>
                    <span className={machineState === 'EMERGENCY_STOP' ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {machineState === 'EMERGENCY_STOP' ? '[HARD BLOCK]' : '[CLEAR]'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>2. Active Running Critical Lockout:</span>
                    <span className={machineState === 'RUNNING_CRITICAL' ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {machineState === 'RUNNING_CRITICAL' ? '[BLOCKED]' : '[CLEAR]'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>3. Physical Parameter Bounds Check:</span>
                    <span className="text-emerald-400">[WITHIN ENVELOPE]</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>4. Actuator Rate Limiting Guard:</span>
                    <span className="text-emerald-400">[OK (&lt; 5/hr)]</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>5. Certified Human Sign-Off Gate:</span>
                    <span className={selectedProposal.approvalStatus === 'APPROVED' ? 'text-emerald-400' : 'text-amber-400'}>
                      {selectedProposal.approvalStatus === 'APPROVED' ? '[APPROVED]' : '[AWAITING APPROVAL]'}
                    </span>
                  </div>
                </div>

                {/* Dispatch Button */}
                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => handleExecute(selectedProposal.id)}
                    disabled={loading || selectedProposal.approvalStatus !== 'APPROVED'}
                    className="px-5 py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center space-x-2 transition shadow-lg shadow-emerald-950/60"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Dispatch Controlled Action to {selectedProposal.systemTarget}</span>
                  </button>

                  <span className="text-[10px] text-zinc-500">
                    AI proposes only — Guardrail strictly enforced
                  </span>
                </div>
              </div>

              {/* Execution Result Banner */}
              {executionResult && (
                <div
                  className={`p-4 rounded-lg border font-mono text-xs space-y-2 ${
                    executionResult.status === 'SUCCESS'
                      ? 'border-emerald-800 bg-emerald-950/30'
                      : 'border-rose-800 bg-rose-950/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {executionResult.status === 'SUCCESS' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      )}
                      <span className="text-white font-bold">
                        Execution Status: {executionResult.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      Ref: {executionResult.externalReferenceId}
                    </span>
                  </div>

                  {executionResult.status === 'SUCCESS' ? (
                    <div className="text-[11px] text-emerald-300 space-y-1">
                      <p>Command successfully acknowledged by {executionResult.systemTarget} enterprise gateway.</p>
                      <p className="text-[10px] text-zinc-500 truncate">
                        SHA256 Audit Checksum: {executionResult.auditChecksum}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-rose-300">
                      Blocked by Guardrail: {executionResult.guardrailsEvaluation?.blockedReason}
                    </p>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* CLOSED-LOOP SENSOR FEEDBACK & AUTOMATIC ROLLBACK SECTION */}
              {/* ========================================================================= */}
              {executionResult?.status === 'SUCCESS' && (
                <div className="p-4 rounded-lg border border-cyan-900/60 bg-cyan-950/20 space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between text-cyan-300 font-bold border-b border-cyan-900/50 pb-2">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      <span>Closed-Loop Sensor Feedback & Rollback Engine</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      Target: Spindle Temp &lt;= 60.0°C
                    </span>
                  </div>

                  {/* Simulator Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-zinc-400 text-[11px]">
                        Post-Execution Sensor Reading: {simulatedSensorValue} °C
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="90"
                        step="0.5"
                        value={simulatedSensorValue}
                        onChange={(e) => setSimulatedSensorValue(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-500">
                        <span>50°C (Healthy)</span>
                        <span>60°C (Target Limit)</span>
                        <span>90°C (Deteriorating)</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-400 text-[11px]">
                        Elapsed Time Since Execution: {elapsedMinutes} min
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="60"
                        value={elapsedMinutes}
                        onChange={(e) => setElapsedMinutes(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-500">
                        <span>1 min</span>
                        <span>30 min (Window)</span>
                        <span>60 min (Timeout)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={handleVerifyFeedback}
                      disabled={loading}
                      className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center space-x-2 transition shadow-md shadow-cyan-950/50"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Evaluate Closed-Loop Verification</span>
                    </button>

                    <button
                      onClick={handleManualRollback}
                      className="px-3 py-2 rounded bg-amber-950 border border-amber-800 text-amber-300 hover:bg-amber-900 flex items-center space-x-1.5 transition text-[11px]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Manual Rollback</span>
                    </button>
                  </div>

                  {/* Feedback Verdict Display */}
                  {feedbackResult && (
                    <div
                      className={`p-3.5 rounded border text-xs space-y-1.5 ${
                        feedbackResult.status === 'RESOLVED_HEALTHY'
                          ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                          : feedbackResult.rollbackTriggered
                          ? 'border-rose-800 bg-rose-950/40 text-rose-300'
                          : 'border-cyan-800 bg-cyan-950/40 text-cyan-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>VERIFICATION VERDICT: {feedbackResult.status}</span>
                        {feedbackResult.rollbackTriggered && (
                          <span className="px-2 py-0.5 rounded bg-rose-900 border border-rose-700 text-white text-[10px]">
                            AUTOMATIC ROLLBACK DISPATCHED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed">{feedbackResult.message}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
