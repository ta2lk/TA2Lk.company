/**
 * Industrial Brain — Pre-Execution Guardrails Engine
 * Phase 6: Action & Closed Loop
 *
 * Enforces:
 * 1. Machine State Verification (No hazardous adjustments during active running/critical states)
 * 2. Parameter Bounds Check (Values must strictly remain within physical safe operating envelopes)
 * 3. Rate Limiting (Prevents actuator saturation / command flooding)
 * 4. Emergency Stop Override (Immediate hard block on any action during active E-Stop)
 * 5. Role-Based Approval Verification (Action cannot be executed without human sign-off)
 */

import {
  ActionProposal,
  PreExecutionGuardrailsResult,
  GuardrailCheckResult,
  MachineOperatingState,
} from './types.ts';

export interface GuardrailContext {
  machineOperatingState: MachineOperatingState;
  historicalActionTimestampsInLastHour: number[];
  assetMaxOperatingEnvelope?: {
    maxRpm?: number;
    maxPressureBar?: number;
    maxTemperatureCelsius?: number;
    minPressureBar?: number;
  };
}

export class GuardrailEngine {
  /**
   * Evaluates all pre-execution safety gates prior to dispatching any command
   */
  public static evaluateGuardrails(
    proposal: ActionProposal,
    context: GuardrailContext
  ): PreExecutionGuardrailsResult {
    const checks: GuardrailCheckResult[] = [];

    // Check 1: Mandatory Human Approval Verification
    if (proposal.approvalStatus !== 'APPROVED') {
      checks.push({
        passed: false,
        checkName: 'HUMAN_APPROVAL_GATE',
        reason: `Action proposal status is '${proposal.approvalStatus}'. Actions strictly require explicit human sign-off before dispatch.`,
        severity: 'CRITICAL_BLOCK',
      });
    } else {
      checks.push({
        passed: true,
        checkName: 'HUMAN_APPROVAL_GATE',
        reason: `Approved by certified human operator/engineer: ${proposal.approvedBy}`,
        severity: 'INFO',
      });
    }

    // Check 2: Emergency Stop Override Check
    if (context.machineOperatingState === 'EMERGENCY_STOP') {
      checks.push({
        passed: false,
        checkName: 'EMERGENCY_STOP_OVERRIDE',
        reason: 'Asset is currently in HARD EMERGENCY STOP state. All external setpoint dispatch and automated adjustments are physically locked out.',
        severity: 'CRITICAL_BLOCK',
      });
    } else {
      checks.push({
        passed: true,
        checkName: 'EMERGENCY_STOP_OVERRIDE',
        reason: `Asset state is ${context.machineOperatingState}; E-Stop interlock is clear.`,
        severity: 'INFO',
      });
    }

    // Check 3: Active Running Safety Check
    // If the machine is in RUNNING_CRITICAL (e.g. running a fine aerospace finishing cut),
    // SCADA/PLC parameter modifications or setpoint changes are strictly forbidden.
    const isControlModification =
      proposal.commandType.includes('SETPOINT') ||
      proposal.commandType.includes('MODIFY') ||
      proposal.commandType.includes('OVERRIDE');

    if (isControlModification && context.machineOperatingState === 'RUNNING_CRITICAL') {
      checks.push({
        passed: false,
        checkName: 'ACTIVE_RUNNING_CRITICAL_LOCKOUT',
        reason: `Cannot modify live machine parameters while operating in RUNNING_CRITICAL state. Finish current cutting operation or bring machine to IDLE first.`,
        severity: 'CRITICAL_BLOCK',
      });
    } else {
      checks.push({
        passed: true,
        checkName: 'ACTIVE_RUNNING_CRITICAL_LOCKOUT',
        reason: `Command type '${proposal.commandType}' permitted under state '${context.machineOperatingState}'.`,
        severity: 'INFO',
      });
    }

    // Check 4: Parameter Bounds Check
    const params = proposal.parameters as Record<string, unknown>;
    const envelope = context.assetMaxOperatingEnvelope || {
      maxPressureBar: 250,
      minPressureBar: 0,
      maxTemperatureCelsius: 90,
      maxRpm: 24000,
    };

    let boundsViolated = false;
    let boundsViolationReason = '';

    if (params.targetPressureBar !== undefined) {
      const val = Number(params.targetPressureBar);
      if (val > (envelope.maxPressureBar ?? 250) || val < (envelope.minPressureBar ?? 0)) {
        boundsViolated = true;
        boundsViolationReason = `Target pressure ${val} bar exceeds safe envelope [${envelope.minPressureBar ?? 0} - ${envelope.maxPressureBar ?? 250} bar]`;
      }
    }

    if (params.targetRpm !== undefined) {
      const val = Number(params.targetRpm);
      if (val > (envelope.maxRpm ?? 24000) || val < 0) {
        boundsViolated = true;
        boundsViolationReason = `Target spindle speed ${val} RPM exceeds safe structural limit ${envelope.maxRpm ?? 24000} RPM`;
      }
    }

    if (params.targetTempCelsius !== undefined) {
      const val = Number(params.targetTempCelsius);
      if (val > (envelope.maxTemperatureCelsius ?? 90)) {
        boundsViolated = true;
        boundsViolationReason = `Target temperature setpoint ${val}°C exceeds max operating threshold ${envelope.maxTemperatureCelsius ?? 90}°C`;
      }
    }

    if (boundsViolated) {
      checks.push({
        passed: false,
        checkName: 'PARAMETER_BOUNDS_CHECK',
        reason: boundsViolationReason,
        severity: 'CRITICAL_BLOCK',
      });
    } else {
      checks.push({
        passed: true,
        checkName: 'PARAMETER_BOUNDS_CHECK',
        reason: 'All parameters conform to calibrated physical operating bounds.',
        severity: 'INFO',
      });
    }

    // Check 5: Rate Limiting & Command Flooding Guard
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentActions = context.historicalActionTimestampsInLastHour.filter((t) => t > oneHourAgo);
    const MAX_ACTIONS_PER_HOUR = 5;

    if (recentActions.length >= MAX_ACTIONS_PER_HOUR) {
      checks.push({
        passed: false,
        checkName: 'ACTUATOR_RATE_LIMIT',
        reason: `Rate limit exceeded: ${recentActions.length} actions executed in the past hour (Limit: ${MAX_ACTIONS_PER_HOUR}/hr). Prevents control hunting and system instability.`,
        severity: 'CRITICAL_BLOCK',
      });
    } else {
      checks.push({
        passed: true,
        checkName: 'ACTUATOR_RATE_LIMIT',
        reason: `Rate limit check passed (${recentActions.length}/${MAX_ACTIONS_PER_HOUR} actions in past hour).`,
        severity: 'INFO',
      });
    }

    // Determine final verdict
    const blockedCheck = checks.find((c) => !c.passed && c.severity === 'CRITICAL_BLOCK');
    return {
      canExecute: !blockedCheck,
      blockedReason: blockedCheck ? blockedCheck.reason : undefined,
      checks,
    };
  }
}
