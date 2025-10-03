// Enhanced Agent Registry with factory patterns and type safety
import { Agent, LLMProvider } from '../types';

/**
 * Enhanced agent registry with factory patterns and advanced features
 */
export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();

  /**
   * Register an agent in the registry
   * @param agent - Agent instance to register
   */
  register(agent: Agent): void {
    if (this.agents.has(agent.name)) {
      throw new Error(`Agent with name '${agent.name}' is already registered`);
    }
    
    // Validate agent structure
    this.validateAgent(agent);
    this.agents.set(agent.name, agent);
  }

  /**
   * Register multiple agents at once
   * @param agents - Array of Agent instances
   */
  registerAll(agents: Agent[]): void {
    for (const agent of agents) {
      this.register(agent);
    }
  }

  /**
   * Get an agent by name
   * @param name - Agent name
   * @returns Agent instance or undefined if not found
   */
  getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  /**
   * Get an agent by name, throwing an error if not found
   * @param name - Agent name
   * @returns Agent instance
   * @throws Error if agent not found
   */
  getRequiredAgent(name: string): Agent {
    const agent = this.getAgent(name);
    if (!agent) {
      const available = this.getAgentNames();
      throw new Error(`Agent '${name}' not found. Available agents: ${available.join(', ')}`);
    }
    return agent;
  }

  /**
   * Get multiple agents by names
   * @param names - Array of agent names
   * @returns Array of Agent instances
   * @throws Error if any agent not found
   */
  getAgents(names: string[]): Agent[] {
    return names.map(name => this.getRequiredAgent(name));
  }

  /**
   * Get agents with optional filtering
   * @param names - Array of agent names
   * @returns Array of found Agent instances (filters out undefined)
   */
  getExistingAgents(names: string[]): Agent[] {
    return names
      .map(name => this.getAgent(name))
      .filter((agent): agent is Agent => agent !== undefined);
  }

  /**
   * Check if an agent is registered
   * @param name - Agent name
   * @returns True if agent exists in registry
   */
  hasAgent(name: string): boolean {
    return this.agents.has(name);
  }

  /**
   * Get all registered agent names
   * @returns Array of agent names
   */
  getAgentNames(): string[] {
    return Array.from(this.agents.keys()).sort();
  }

  /**
   * Get all registered agents
   * @returns Array of Agent instances
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by LLM provider
   * @param provider - LLM provider to filter by
   * @returns Array of agents using the specified provider
   */
  getAgentsByProvider(provider: LLMProvider): Agent[] {
    return this.getAllAgents().filter(agent => agent.llm_provider === provider);
  }

  /**
   * Get agent metadata for all registered agents
   * @returns Array of agent metadata objects
   */
  getAgentMetadata(): Array<{
    name: string;
    system_prompt: string;
    toolCount: number;
    llm_provider: LLMProvider;
    model: string;
  }> {
    return this.getAllAgents().map(agent => ({
      name: agent.name,
      system_prompt: agent.system_prompt.substring(0, 100) + '...',
      toolCount: agent.tools.length,
      llm_provider: agent.llm_provider as LLMProvider,
      model: agent.model
    }));
  }

  /**
   * Create an agent with a subset of tools
   * @param baseName - Base agent name to copy from
   * @param newName - New agent name
   * @param toolNames - Array of tool names to include
   * @returns New agent instance
   */
  createAgentWithTools(baseName: string, newName: string, toolNames: string[]): Agent {
    const baseAgent = this.getRequiredAgent(baseName);
    
    // Filter tools by names
    const filteredTools = baseAgent.tools.filter(tool => 
      toolNames.includes(tool.name)
    );

    if (filteredTools.length !== toolNames.length) {
      const missing = toolNames.filter(name => 
        !baseAgent.tools.some(tool => tool.name === name)
      );
      throw new Error(`Tools not found in agent '${baseName}': ${missing.join(', ')}`);
    }

    return {
      ...baseAgent,
      name: newName,
      tools: filteredTools
    };
  }

  /**
   * Remove an agent from the registry
   * @param name - Agent name to remove
   * @returns True if agent was removed, false if not found
   */
  unregister(name: string): boolean {
    return this.agents.delete(name);
  }

  /**
   * Clear all agents from the registry
   */
  clear(): void {
    this.agents.clear();
  }

  /**
   * Get the number of registered agents
   * @returns Number of agents in registry
   */
  size(): number {
    return this.agents.size;
  }

  /**
   * Create a new registry with a subset of agents
   * @param agentNames - Array of agent names to include
   * @returns New AgentRegistry with specified agents
   */
  createSubRegistry(agentNames: string[]): AgentRegistry {
    const subRegistry = new AgentRegistry();
    for (const name of agentNames) {
      const agent = this.getAgent(name);
      if (agent) {
        subRegistry.register(agent);
      }
    }
    return subRegistry;
  }

  /**
   * Validate agent structure and configuration
   * @param agent - Agent to validate
   * @throws Error if agent is invalid
   */
  private validateAgent(agent: Agent): void {
    if (!agent.name || typeof agent.name !== 'string') {
      throw new Error('Agent name must be a non-empty string');
    }

    if (!agent.system_prompt || typeof agent.system_prompt !== 'string') {
      throw new Error('Agent system_prompt must be a non-empty string');
    }

    if (!Array.isArray(agent.tools)) {
      throw new Error('Agent tools must be an array');
    }

    if (!agent.llm_provider || typeof agent.llm_provider !== 'string') {
      throw new Error('Agent llm_provider must be specified');
    }

    if (!agent.model || typeof agent.model !== 'string') {
      throw new Error('Agent model must be specified');
    }

    // Validate tools have required properties
    for (const tool of agent.tools) {
      if (!tool.name || !tool.description) {
        throw new Error(`Tool in agent '${agent.name}' is missing required properties`);
      }
    }
  }
}

// Global singleton registry instance
const globalAgentRegistry = new AgentRegistry();

/**
 * Get the global agent registry instance
 * @returns Global AgentRegistry
 */
export function getGlobalAgentRegistry(): AgentRegistry {
  return globalAgentRegistry;
}

/**
 * Register an agent in the global registry
 * @param agent - Agent to register
 */
export function registerAgent(agent: Agent): void {
  globalAgentRegistry.register(agent);
}

/**
 * Factory function to create specialized agents
 */
export class AgentFactory {
  private registry: AgentRegistry;

  constructor(registry: AgentRegistry = globalAgentRegistry) {
    this.registry = registry;
  }

  /**
   * Create a simplified agent with fewer tools for basic tasks
   * @param baseName - Base agent name
   * @param newName - New agent name
   * @param essentialToolNames - Array of essential tool names
   * @returns Simplified agent
   */
  createSimplifiedAgent(baseName: string, newName: string, essentialToolNames: string[]): Agent {
    return this.registry.createAgentWithTools(baseName, newName, essentialToolNames);
  }

  /**
   * Create a specialized agent by combining tools from multiple agents
   * @param name - New agent name
   * @param systemPrompt - System prompt for the new agent
   * @param sourceAgents - Array of agent names to source tools from
   * @param llmProvider - LLM provider to use
   * @param model - Model to use
   * @returns New specialized agent
   */
  createHybridAgent(
    name: string,
    systemPrompt: string,
    sourceAgents: string[],
    llmProvider: LLMProvider,
    model: string
  ): Agent {
    const allTools: any[] = [];
    
    for (const agentName of sourceAgents) {
      const agent = this.registry.getRequiredAgent(agentName);
      allTools.push(...agent.tools);
    }

    // Remove duplicate tools by name
    const uniqueTools = allTools.filter((tool, index, array) => 
      array.findIndex(t => t.name === tool.name) === index
    );

    return {
      name,
      system_prompt: systemPrompt,
      tools: uniqueTools,
      llm_provider: llmProvider,
      model
    };
  }

  /**
   * Clone an agent with modifications
   * @param baseName - Base agent name
   * @param newName - New agent name
   * @param modifications - Partial agent properties to override
   * @returns Cloned and modified agent
   */
  cloneAgent(baseName: string, newName: string, modifications: Partial<Agent>): Agent {
    const baseAgent = this.registry.getRequiredAgent(baseName);
    
    return {
      ...baseAgent,
      name: newName,
      ...modifications
    };
  }
}