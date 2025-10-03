// TypeScript equivalent of Python tools/registry.py with enhanced type safety
import { BaseTool } from './BaseTool';

/**
 * Type-safe tool registry for managing available tools
 */
export class ToolRegistry {
  private tools: Map<string, BaseTool> = new Map();

  /**
   * Register a tool in the registry
   * @param tool - BaseTool instance to register
   */
  register(tool: BaseTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name '${tool.name}' is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple tools at once
   * @param tools - Array of BaseTool instances
   */
  registerAll(tools: BaseTool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Get a tool by its name
   * @param name - Tool name
   * @returns BaseTool instance or undefined if not found
   */
  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get a tool by name, throwing an error if not found
   * @param name - Tool name
   * @returns BaseTool instance
   * @throws Error if tool not found
   */
  getRequiredTool(name: string): BaseTool {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found in registry`);
    }
    return tool;
  }

  /**
   * Check if a tool is registered
   * @param name - Tool name
   * @returns True if tool exists in registry
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tool names
   * @returns Array of tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys()).sort();
  }

  /**
   * Get all registered tools
   * @returns Array of BaseTool instances
   */
  getAllTools(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool metadata for all registered tools
   * @returns Array of tool metadata objects
   */
  getToolMetadata(): Array<{
    name: string;
    description: string;
    inputs: any[];
  }> {
    return this.getAllTools().map(tool => tool.getToolMetadata());
  }

  /**
   * Remove a tool from the registry
   * @param name - Tool name to remove
   * @returns True if tool was removed, false if not found
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Clear all tools from the registry
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Get the number of registered tools
   * @returns Number of tools in registry
   */
  size(): number {
    return this.tools.size;
  }

  /**
   * Create a new registry with a subset of tools
   * @param toolNames - Array of tool names to include
   * @returns New ToolRegistry with specified tools
   */
  createSubRegistry(toolNames: string[]): ToolRegistry {
    const subRegistry = new ToolRegistry();
    for (const name of toolNames) {
      const tool = this.getTool(name);
      if (tool) {
        subRegistry.register(tool);
      }
    }
    return subRegistry;
  }
}

// Global singleton registry instance
const globalRegistry = new ToolRegistry();

/**
 * Get the global tool registry instance
 * @returns Global ToolRegistry
 */
export function getGlobalRegistry(): ToolRegistry {
  return globalRegistry;
}

/**
 * Register a tool in the global registry
 * @param tool - BaseTool to register
 */
export function registerTool(tool: BaseTool): void {
  globalRegistry.register(tool);
}

/**
 * Get a tool from the global registry
 * @param name - Tool name
 * @returns BaseTool or undefined if not found
 */
export function getTool(name: string): BaseTool | undefined {
  return globalRegistry.getTool(name);
}

/**
 * Get multiple tools from the global registry
 * @param names - Array of tool names
 * @returns Array of BaseTool instances (undefined for not found)
 */
export function getTools(names: string[]): (BaseTool | undefined)[] {
  return names.map(name => getTool(name));
}

/**
 * Get multiple tools from the global registry, filtering out undefined
 * @param names - Array of tool names
 * @returns Array of found BaseTool instances
 */
export function getExistingTools(names: string[]): BaseTool[] {
  return names
    .map(name => getTool(name))
    .filter((tool): tool is BaseTool => tool !== undefined);
}