// TypeScript equivalent of Python tools/registry.py
import { BaseTool } from './base';
import { getGlobalRegistry } from './base/ToolRegistry';
import {
  calculatePensionTool,
  healthInsuranceLookupTool,
  ptoBalanceLookupTool,
  benefitsEnrollmentTool,
  fsaHsaCalculatorTool
} from './implementations';

// Global registry of available tools by name
const toolInstances: BaseTool[] = [
  calculatePensionTool,
  healthInsuranceLookupTool,
  ptoBalanceLookupTool,
  benefitsEnrollmentTool,
  fsaHsaCalculatorTool
];

// Initialize the global registry with all tools
export function initializeToolRegistry(): void {
  const registry = getGlobalRegistry();
  
  // Clear existing tools to ensure clean initialization
  registry.clear();
  
  // Register all tool instances
  registry.registerAll(toolInstances);
}

/**
 * Get a tool implementation by its canonical name, if available
 * @param name - Tool name
 * @returns BaseTool instance or undefined if not found
 */
export function getTool(name: string): BaseTool | undefined {
  const registry = getGlobalRegistry();
  return registry.getTool(name);
}

/**
 * Get all available tool names
 * @returns Array of registered tool names
 */
export function getAvailableToolNames(): string[] {
  const registry = getGlobalRegistry();
  return registry.getToolNames();
}

/**
 * Get all available tools
 * @returns Array of all registered BaseTool instances
 */
export function getAllTools(): BaseTool[] {
  const registry = getGlobalRegistry();
  return registry.getAllTools();
}

/**
 * Get tool metadata for all registered tools
 * @returns Array of tool metadata objects
 */
export function getAllToolMetadata(): Array<{
  name: string;
  description: string;
  inputs: any[];
}> {
  const registry = getGlobalRegistry();
  return registry.getToolMetadata();
}

/**
 * Get multiple tools by names, filtering out undefined
 * @param names - Array of tool names
 * @returns Array of found BaseTool instances
 */
export function getTools(names: string[]): BaseTool[] {
  return names
    .map(name => getTool(name))
    .filter((tool): tool is BaseTool => tool !== undefined);
}

/**
 * Check if a tool exists in the registry
 * @param name - Tool name
 * @returns True if tool exists
 */
export function hasTool(name: string): boolean {
  const registry = getGlobalRegistry();
  return registry.hasTool(name);
}

/**
 * Create a subset registry with specific tools
 * @param toolNames - Array of tool names to include
 * @returns New ToolRegistry with specified tools
 */
export function createToolSubset(toolNames: string[]) {
  const registry = getGlobalRegistry();
  return registry.createSubRegistry(toolNames);
}

/**
 * Get the enhanced registry instance for advanced operations
 * @returns ToolRegistry instance
 */
export function getToolRegistry() {
  return getGlobalRegistry();
}

/**
 * Factory class for creating tool configurations
 */
export class ToolFactory {
  private registry = getGlobalRegistry();

  /**
   * Create a tool configuration for specific use cases
   * @param toolNames - Array of tool names to include
   * @returns Array of tool instances
   */
  createToolSet(toolNames: string[]): BaseTool[] {
    return toolNames
      .map(name => this.registry.getTool(name))
      .filter((tool): tool is BaseTool => tool !== undefined);
  }

  /**
   * Get tools by category (based on name patterns)
   * @param pattern - RegExp pattern to match tool names
   * @returns Array of matching tools
   */
  getToolsByPattern(pattern: RegExp): BaseTool[] {
    return this.registry.getAllTools().filter(tool => pattern.test(tool.name));
  }

  /**
   * Get benefits-related tools
   * @returns Array of benefits tools
   */
  getBenefitsTools(): BaseTool[] {
    return this.getToolsByPattern(/benefits|pension|insurance|pto|fsa|hsa/i);
  }

  /**
   * Get calculation tools
   * @returns Array of calculation tools
   */
  getCalculationTools(): BaseTool[] {
    return this.getToolsByPattern(/calculate|calculator/i);
  }

  /**
   * Get lookup tools
   * @returns Array of lookup tools
   */
  getLookupTools(): BaseTool[] {
    return this.getToolsByPattern(/lookup/i);
  }
}

// Export factory instance
export const toolFactory = new ToolFactory();

// Auto-initialize the registry when this module is imported
initializeToolRegistry();