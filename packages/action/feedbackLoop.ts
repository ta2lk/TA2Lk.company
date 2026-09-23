/**
 * Industrial Brain — Closed-Loop Sensor Feedback & Rollback Engine
 * Phase 6: Action & Closed Loop
 *
 * Real Data -> Real Reasoning -> Real Decision -> Controlled Action -> Verified Result
 *
 * Verifies whether an executed action successfully restored physical equipment health.
 * Enforces automatic safety rollbacks if sensor readings deteriorate or time out.
 */

import {
  ActionProposal,
  SensorFeedbackCondition,
  FeedbackEvaluationResult,
} from './types.ts';
import { ActionDispatcher } from './actionDispatcher.ts';

export class FeedbackLoopEngine {
  /**
   * Evaluates post-execution sensor reading against target healthy condition
   */
  public static async evaluateFeedback(
    executionId: string,
    proposal: ActionProposal,
    condition: SensorFeedbackCondition,
    currentSensorValue: number,
    elapsedMinutesSinceExecution: number
  ): Promise<FeedbackEvaluationResult> {
    const timestamp = new Date().toISOString();

    // 1. Check if healthy condition is satisfied
    const isResolved = this.checkCondition(
      currentSensorValue,
      condition.comparisonOperator,
      condition.targetHealthyValue
    );

    if (isResolved) {
      return {
        executionId,
        isResolved: true,
        currentSensorValue,
        targetValue: condition.targetHealthyValue,
        status: 'RESOLVED_HEALTHY',
        rollbackTriggered: false,
        evaluationTimestamp: timestamp,
        message: `Closed-loop confirmation: Metric '${condition.metric}' successfully restored to ${currentSensorValue} (Target: ${condition.comparisonOperator} ${condition.targetHealthyValue}). Action verified successful.`,
      };
    }

    // 2. Check for Deterioration (Condition worsened beyond baseline)
    const isDeteriorating = this.checkDeterioration(
      condition.baselineValue,
      currentSensorValue,
      condition.comparisonOperator
    );

    if (isDeteriorating) {
      let rollbackDone = false;
      if (proposal.rollbackPlan?.enabled) {
        await ActionDispatcher.dispatchRollback(executionId, proposal);
        rollbackDone = true;
      }

      return {
        executionId,
        isResolved: false,
        currentSensorValue,
        targetValue: condition.targetHealthyValue,
        status: 'DETERIORATING',
        rollbackTriggered: rollbackDone,
        evaluationTimestamp: timestamp,
        message: `CRITICAL SAFETY ALERT: Metric '${condition.metric}' deteriorated from baseline ${condition.baselineValue} to ${currentSensorValue}. ${
          rollbackDone ? 'AUTOMATIC ROLLBACK DISPATCHED.' : 'ROLLBACK NOT CONFIGURED.'
        } Emergency operator intervention required.`,
      };
    }

    // 3. Check for Timeout Window Exceeded
    if (elapsedMinutesSinceExecution > condition.maxEvaluationWindowMinutes) {
      let rollbackDone = false;
      if (proposal.rollbackPlan?.enabled) {
        await ActionDispatcher.dispatchRollback(executionId, proposal);
        rollbackDone = true;
      }

      return {
        executionId,
        isResolved: false,
        currentSensorValue,
        targetValue: condition.targetHealthyValue,
        status: 'TIMEOUT_FAILED',
        rollbackTriggered: rollbackDone,
        evaluationTimestamp: timestamp,
        message: `Evaluation window timed out (${elapsedMinutesSinceExecution}m > ${condition.maxEvaluationWindowMinutes}m limit). Reading ${currentSensorValue} did not reach target ${condition.targetHealthyValue}. ${
          rollbackDone ? 'Automatic safety rollback triggered.' : ''
        }`,
      };
    }

    // 4. Monitoring still in progress (Stabilizing)
    return {
      executionId,
      isResolved: false,
      currentSensorValue,
      targetValue: condition.targetHealthyValue,
      status: 'MONITORING_IN_PROGRESS',
      rollbackTriggered: false,
      evaluationTimestamp: timestamp,
      message: `Monitoring in progress: Current reading ${currentSensorValue} is progressing towards target ${condition.targetHealthyValue}. Elapsed: ${elapsedMinutesSinceExecution}m.`,
    };
  }

  private static checkCondition(
    val: number,
    op: '<' | '<=' | '>' | '>=',
    target: number
  ): boolean {
    switch (op) {
      case '<':
        return val < target;
      case '<=':
        return val <= target;
      case '>':
        return val > target;
      case '>=':
        return val >= target;
      default:
        return false;
    }
  }

  private static checkDeterioration(
    baseline: number,
    current: number,
    op: '<' | '<=' | '>' | '>='
  ): boolean {
    // If goal was to lower temperature (<), but it rose above baseline -> Deterioration
    if (op === '<' || op === '<=') {
      return current > baseline + 1.0;
    }
    // If goal was to raise pressure (>), but it dropped below baseline -> Deterioration
    if (op === '>' || op === '>=') {
      return current < baseline - 0.2;
    }
    return false;
  }
}
