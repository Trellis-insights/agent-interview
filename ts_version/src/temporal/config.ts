// Temporal configuration and retry policies
import type { RetryPolicy, Duration } from '@temporalio/common';

/**
 * Retry policy for say hello activity (short-running)
 */
export const SAY_HELLO_RETRY_POLICY: RetryPolicy = {
  initialInterval: '1s',
  maximumInterval: '10s',
  maximumAttempts: 3,
  backoffCoefficient: 2.0,
};

/**
 * Retry policy for invoke agent activity (long-running)
 */
export const INVOKE_AGENT_RETRY_POLICY: RetryPolicy = {
  initialInterval: '2s',
  maximumInterval: '30s',
  maximumAttempts: 3,
  backoffCoefficient: 2.0,
};

/**
 * Activity timeout configurations
 */
export const ACTIVITY_TIMEOUTS = {
  SAY_HELLO: {
    startToCloseTimeout: '10s' as Duration,
    scheduleToStartTimeout: '10s' as Duration,
    scheduleToCloseTimeout: '20s' as Duration,
  },
  INVOKE_AGENT: {
    startToCloseTimeout: '60s' as Duration,
    scheduleToStartTimeout: '30s' as Duration,
    scheduleToCloseTimeout: '90s' as Duration,
  },
} as const;

/**
 * Worker configuration
 */
export const WORKER_CONFIG = {
  maxActivitiesPerSecond: 100,
  maxConcurrentActivityExecutions: 100,
  maxConcurrentWorkflowExecutions: 100,
} as const;

/**
 * Workflow configuration
 */
export const WORKFLOW_CONFIG = {
  workflowExecutionTimeout: '10m' as Duration,
  workflowRunTimeout: '5m' as Duration,
  workflowTaskTimeout: '10s' as Duration,
} as const;