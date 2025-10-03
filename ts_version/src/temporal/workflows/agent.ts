// TypeScript translation of temporal/agent.py using official Temporal SDK
import {
  defineSignal,
  defineQuery,
  setHandler,
  condition,
  proxyActivities,
  log
} from '@temporalio/workflow';

import type * as activities from '../activities';
import { AgentRequest } from '../../types';
import { 
  SAY_HELLO_RETRY_POLICY, 
  INVOKE_AGENT_RETRY_POLICY,
  ACTIVITY_TIMEOUTS 
} from '../config';

// Define workflow signals and queries (if needed in the future)
export const agentSignal = defineSignal<[string]>('agent-signal');
export const agentQuery = defineQuery<string>('agent-query');

/**
 * AgentWorkflow - TypeScript translation of Python AgentWorkflow
 * 
 * This workflow orchestrates AI agent invocation through the following steps:
 * 1. Say hello with the request text
 * 2. Invoke the AI agent with request details
 */
export async function AgentWorkflow(request: AgentRequest): Promise<string> {
  log.info('Starting AgentWorkflow', { 
    requestText: request.request_text,
    agentCount: request.agents.length 
  });

  // Validate input
  if (!request.agents || request.agents.length === 0) {
    const error = 'AgentRequest.agents must contain at least one agent';
    log.error(error);
    throw new Error(error);
  }

  try {
    // First call say_hello with configured timeout and retry policy
    log.info('Executing sayHello activity');
    const helloResult = await proxyActivities<typeof activities>({
      ...ACTIVITY_TIMEOUTS.SAY_HELLO,
      retry: SAY_HELLO_RETRY_POLICY,
    }).sayHello(request.request_text);

    log.info('sayHello completed', { result: helloResult });

    // Then call invoke_agent with the request details
    const agent = request.agents[0]!; // We already validated agents exist above
    log.info('Executing invokeAgent activity', { 
      agentName: agent.name, 
      llmProvider: agent.llm_provider,
      model: agent.model 
    });

    const llmResult = await proxyActivities<typeof activities>({
      ...ACTIVITY_TIMEOUTS.INVOKE_AGENT,
      retry: INVOKE_AGENT_RETRY_POLICY,
    }).invokeAgent(
      request.request_text,
      request.request_files,
      agent
    );

    log.info('invokeAgent completed', { resultLength: llmResult.length });
    return llmResult;

  } catch (error) {
    log.error('AgentWorkflow failed', { error });
    throw error;
  }
}