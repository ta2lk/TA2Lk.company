/**
 * Unit Tests: Industrial Correlation & Pattern Detection Engine
 * Phase 5: Reasoning & Decision Engine
 */

import { CorrelationEngine, TelemetryPoint } from '../../packages/reasoning/correlationEngine.ts';

export async function runCorrelationEngineTests(): Promise<{ passed: number; failed: number }> {
  console.log('--- 19. Running Correlation & Anomaly Engine Unit Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  const now = Date.now();
  const telemetry: TelemetryPoint[] = [
    {
      entityId: 'SENS-PRESS-CHILLER',
      metric: 'Coolant Circuit Pressure',
      value: 1.8,
      threshold: 4.2,
      timestamp: new Date(now - 120 * 1000).toISOString(),
    },
    {
      entityId: 'SENS-TEMP-COOLANT',
      metric: 'Spindle Temperature',
      value: 74.5,
      threshold: 68.0,
      timestamp: new Date(now - 60 * 1000).toISOString(),
    },
    {
      entityId: 'SENS-VIB-SPINDLE',
      metric: 'Spindle Vibration',
      value: 4.8,
      threshold: 4.5,
      timestamp: new Date(now - 55 * 1000).toISOString(),
    },
    {
      entityId: 'SENS-TEMP-COOLANT',
      metric: 'Spindle Temperature',
      value: 78.2,
      threshold: 68.0,
      timestamp: new Date(now - 10 * 1000).toISOString(),
    },
  ];

  const patterns = CorrelationEngine.analyzeCorrelations(telemetry, 300);

  // Test 1: Detected cascade
  const cascade = patterns.find((p) => p.patternType === 'CROSS_SYSTEM_CASCADE');
  assert(cascade !== undefined, 'Detected cross-system pressure drop preceding thermal alarm');
  assert(cascade?.isCausalityConfirmed === true, 'Physical thermodynamic causality confirmed');

  // Test 2: Concurrent vibration and thermal spike
  const spike = patterns.find((p) => p.patternType === 'MULTI_ENTITY_SPIKE');
  assert(spike !== undefined, 'Detected multi-signal concurrent spike');
  assert(spike?.isCausalityConfirmed === false, 'Strictly marks multi-signal spike as statistical correlation, not blind causality');
  assert(spike?.warningNote !== undefined, 'Includes explicit warning on correlation vs causation');

  // Test 3: Progressive thermal creep
  const drift = patterns.find((p) => p.patternType === 'PROGRESSIVE_DRIFT');
  assert(drift !== undefined, 'Detected progressive thermal creep across observation window');

  return { passed, failed };
}
