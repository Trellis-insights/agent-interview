// Tool factory patterns and utilities
import { BaseTool } from './base';
import { ToolInput, InputType } from '../types';
import { getTool, getAllTools } from './registry';

/**
 * Tool creation configuration
 */
export interface ToolConfig {
  name: string;
  description: string;
  inputs: ToolInput[];
  implementation: (kwargs: Record<string, any>) => Promise<string>;
}

/**
 * Dynamic tool factory for creating tools at runtime
 */
export class ToolFactory {
  /**
   * Create a dynamic tool from configuration
   * @param config - Tool configuration
   * @returns BaseTool instance
   */
  static createTool(config: ToolConfig): BaseTool {
    return new (class extends BaseTool {
      readonly name = config.name;
      readonly description = config.description;
      readonly inputs = config.inputs;

      async call(kwargs: Record<string, any>): Promise<string> {
        this.validateInputs(kwargs);
        return config.implementation(kwargs);
      }
    })();
  }

  /**
   * Create a simple tool with basic JSON response
   * @param name - Tool name
   * @param description - Tool description
   * @param inputs - Tool input schema
   * @param handler - Function that processes inputs and returns result data
   * @returns BaseTool instance
   */
  static createSimpleTool(
    name: string,
    description: string,
    inputs: ToolInput[],
    handler: (kwargs: Record<string, any>) => Promise<any>
  ): BaseTool {
    return this.createTool({
      name,
      description,
      inputs,
      implementation: async (kwargs) => {
        const result = await handler(kwargs);
        return JSON.stringify(result, null, 2);
      }
    });
  }
}

/**
 * Tool builder for fluent tool creation
 */
export class ToolBuilder {
  private config: Partial<ToolConfig> = {};

  /**
   * Set tool name
   * @param name - Tool name
   * @returns ToolBuilder instance
   */
  name(name: string): ToolBuilder {
    this.config.name = name;
    return this;
  }

  /**
   * Set tool description
   * @param description - Tool description
   * @returns ToolBuilder instance
   */
  description(description: string): ToolBuilder {
    this.config.description = description;
    return this;
  }

  /**
   * Add an input parameter
   * @param name - Input name
   * @param type - Input type
   * @param description - Input description
   * @param required - Whether input is required (default: true)
   * @returns ToolBuilder instance
   */
  addInput(name: string, type: InputType, description: string, required = true): ToolBuilder {
    if (!this.config.inputs) {
      this.config.inputs = [];
    }
    this.config.inputs.push({ name, type, description, required });
    return this;
  }

  /**
   * Set the tool implementation
   * @param implementation - Implementation function
   * @returns ToolBuilder instance
   */
  implementation(implementation: (kwargs: Record<string, any>) => Promise<string>): ToolBuilder {
    this.config.implementation = implementation;
    return this;
  }

  /**
   * Build the tool
   * @returns BaseTool instance
   * @throws Error if required configuration is missing
   */
  build(): BaseTool {
    if (!this.config.name) {
      throw new Error('Tool name is required');
    }
    if (!this.config.description) {
      throw new Error('Tool description is required');
    }
    if (!this.config.inputs) {
      this.config.inputs = [];
    }
    if (!this.config.implementation) {
      throw new Error('Tool implementation is required');
    }

    return ToolFactory.createTool(this.config as ToolConfig);
  }
}

/**
 * Tool utilities for common operations
 */
export class ToolUtils {
  /**
   * Create a tool that always returns a specific response
   * @param name - Tool name
   * @param description - Tool description
   * @param response - Static response to return
   * @returns BaseTool instance
   */
  static createMockTool(name: string, description: string, response: any): BaseTool {
    return ToolFactory.createSimpleTool(name, description, [], async () => response);
  }

  /**
   * Create a tool that echoes its inputs
   * @param name - Tool name
   * @param inputs - Tool input schema
   * @returns BaseTool instance
   */
  static createEchoTool(name: string, inputs: ToolInput[]): BaseTool {
    return ToolFactory.createTool({
      name,
      description: `Echo tool that returns its inputs: ${name}`,
      inputs,
      implementation: async (kwargs) => {
        return JSON.stringify({
          tool: name,
          inputs: kwargs,
          timestamp: new Date().toISOString()
        }, null, 2);
      }
    });
  }

  /**
   * Get tools by names, with error handling for missing tools
   * @param toolNames - Array of tool names
   * @returns Array of tools with error information for missing ones
   */
  static getToolsWithFallback(toolNames: string[]): Array<{
    name: string;
    tool?: BaseTool;
    error?: string;
  }> {
    return toolNames.map(name => {
      const tool = getTool(name);
      return tool 
        ? { name, tool }
        : { name, error: `Tool '${name}' not found` };
    });
  }

  /**
   * Validate that all required tools exist
   * @param toolNames - Array of required tool names
   * @throws Error if any required tool is missing
   */
  static validateRequiredTools(toolNames: string[]): void {
    const missing = toolNames.filter(name => !getTool(name));
    if (missing.length > 0) {
      throw new Error(`Required tools not found: ${missing.join(', ')}`);
    }
  }

  /**
   * Get tool statistics
   * @returns Object with tool registry statistics
   */
  static getToolStats(): {
    totalTools: number;
    toolNames: string[];
    inputTypeDistribution: Record<string, number>;
  } {
    const tools = getAllTools();
    const inputTypeDistribution: Record<string, number> = {};

    // Count input types across all tools
    for (const tool of tools) {
      for (const input of tool.inputs) {
        inputTypeDistribution[input.type] = (inputTypeDistribution[input.type] || 0) + 1;
      }
    }

    return {
      totalTools: tools.length,
      toolNames: tools.map(t => t.name).sort(),
      inputTypeDistribution
    };
  }
}