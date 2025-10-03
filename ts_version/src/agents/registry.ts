// TypeScript equivalent of agents/registry.py with enhanced registry patterns
import { Agent } from '../types';
import { benefitsAgent } from './benefits';
import { getGlobalAgentRegistry, AgentFactory } from './AgentRegistry';

// Available agent identifiers
export enum AvailableAgents {
  BENEFITS = 'benefits'
}

// Initialize the enhanced registry with available agents
const registry = getGlobalAgentRegistry();
registry.register(benefitsAgent);

// Create factory instance for advanced agent creation
export const agentFactory = new AgentFactory(registry);

/**
 * Get an agent instance by name
 * @param agentName - Name of the agent to retrieve
 * @returns Agent instance
 * @throws Error if agent not found
 */
export function getAgent(agentName: string): Agent {
  return registry.getRequiredAgent(agentName);
}

/**
 * Get multiple agent instances by names
 * @param agentNames - Array of agent names
 * @returns Array of agent instances
 * @throws Error if any agent not found
 */
export function getAgents(agentNames: string[]): Agent[] {
  return registry.getAgents(agentNames);
}

/**
 * Get all available agent names
 * @returns Array of available agent names
 */
export function getAvailableAgentNames(): string[] {
  return registry.getAgentNames();
}

/**
 * Check if an agent exists
 * @param agentName - Name of the agent to check
 * @returns True if agent exists
 */
export function hasAgent(agentName: string): boolean {
  return registry.hasAgent(agentName);
}

/**
 * Get agent metadata for all registered agents
 * @returns Array of agent metadata
 */
export function getAgentMetadata() {
  return registry.getAgentMetadata();
}

/**
 * Get the enhanced registry instance for advanced operations
 * @returns AgentRegistry instance
 */
export function getAgentRegistry() {
  return registry;
}