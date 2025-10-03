// TypeScript translation of temporal/worker.py using official Temporal SDK
import { NativeConnection, Worker } from '@temporalio/worker';
import { Client } from '@temporalio/client';
import { getEnvVar } from '../utils';
import * as activities from './activities';
import { TEMPORAL_DEFAULTS } from '../types';

/**
 * Create and configure a Temporal worker
 */
export async function createWorker(): Promise<Worker> {
  // Get configuration from environment with defaults
  const temporalAddress = getEnvVar('TEMPORAL_ADDRESS', TEMPORAL_DEFAULTS.ADDRESS);
  const taskQueue = getEnvVar('TEMPORAL_TASK_QUEUE', TEMPORAL_DEFAULTS.TASK_QUEUE);
  const namespace = getEnvVar('TEMPORAL_NAMESPACE', TEMPORAL_DEFAULTS.NAMESPACE);

  // Create connection to Temporal server
  const connection = await NativeConnection.connect({
    address: temporalAddress,
  });

  // Create worker with workflows and activities
  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue,
    workflowsPath: require.resolve('./workflows/agent'),
    activities,
    // Configure worker options
    maxActivitiesPerSecond: 100,
    maxConcurrentActivityTaskExecutions: 100,
    maxConcurrentWorkflowTaskExecutions: 100,
  });

  return worker;
}

/**
 * Create a Temporal client for workflow execution
 */
export async function createClient(): Promise<Client> {
  const temporalAddress = getEnvVar('TEMPORAL_ADDRESS', TEMPORAL_DEFAULTS.ADDRESS);
  const namespace = getEnvVar('TEMPORAL_NAMESPACE', TEMPORAL_DEFAULTS.NAMESPACE);

  const client = new Client({
    connection: await NativeConnection.connect({
      address: temporalAddress,
    }),
    namespace,
  });

  return client;
}

/**
 * Main worker function - starts the worker and keeps it running
 */
export async function runWorker(): Promise<void> {
  console.log('Creating Temporal worker...');
  
  const worker = await createWorker();
  
  console.log('Starting worker...');
  console.log(`Task Queue: ${worker.options.taskQueue}`);
  console.log(`Namespace: ${worker.options.namespace}`);
  
  // Register shutdown handler
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down worker...');
    try {
      worker.shutdown();
      console.log('Worker shut down successfully');
      process.exit(0);
    } catch (error: any) {
      console.error('Error shutting down worker:', error);
      process.exit(1);
    }
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down worker...');
    try {
      worker.shutdown();
      console.log('Worker shut down successfully');
      process.exit(0);
    } catch (error: any) {
      console.error('Error shutting down worker:', error);
      process.exit(1);
    }
  });

  try {
    await worker.run();
  } catch (error) {
    console.error('Worker failed:', error);
    throw error;
  }
}

// Run worker if this file is executed directly
if (require.main === module) {
  runWorker().catch((error) => {
    console.error('Failed to start worker:', error);
    process.exit(1);
  });
}