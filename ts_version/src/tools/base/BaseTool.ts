// TypeScript equivalent of Python tools/base.py
import { ToolInput, InputType } from '../../types';

/**
 * Abstract base class for callable tools. Implementations must provide a
 * human-readable name/description and implement call(**kwargs) -> string.
 *
 * The call contract returns a JSON-serializable string payload so it can
 * be fed back to the LLM as a tool result.
 */
export abstract class BaseTool {
  // Canonical tool name used in schemas and model tool registration
  abstract readonly name: string;

  // Short description of what the tool does
  abstract readonly description: string;
  
  // Structured input definitions (mirrors schemas.Tool.inputs)
  abstract readonly inputs: ToolInput[];

  /**
   * Execute the tool with keyword arguments and return a JSON string.
   * @param kwargs - Tool arguments as key-value pairs
   * @returns Promise resolving to JSON string result
   */
  abstract call(kwargs: Record<string, any>): Promise<string>;

  /**
   * Validate input arguments against the tool's input schema
   * @param kwargs - Input arguments to validate
   * @throws Error if validation fails
   */
  protected validateInputs(kwargs: Record<string, any>): void {
    const providedKeys = new Set(Object.keys(kwargs));
    
    // Check required inputs are provided
    const requiredInputs = this.inputs.filter(input => input.required);
    for (const input of requiredInputs) {
      if (!providedKeys.has(input.name)) {
        throw new Error(`Required input '${input.name}' is missing for tool '${this.name}'`);
      }
    }

    // Validate input types
    for (const input of this.inputs) {
      if (providedKeys.has(input.name)) {
        const value = kwargs[input.name];
        if (!this.isValidType(value, input.type)) {
          throw new Error(
            `Invalid type for input '${input.name}' in tool '${this.name}'. ` +
            `Expected ${input.type}, got ${typeof value}`
          );
        }
      }
    }
  }

  /**
   * Check if a value matches the expected input type
   * @param value - Value to check
   * @param expectedType - Expected InputType
   * @returns True if value matches expected type
   */
  private isValidType(value: any, expectedType: InputType): boolean {
    switch (expectedType) {
      case InputType.STRING:
        return typeof value === 'string';
      case InputType.INTEGER:
        return Number.isInteger(value);
      case InputType.FLOAT:
        return typeof value === 'number';
      case InputType.BOOLEAN:
        return typeof value === 'boolean';
      case InputType.LIST:
        return Array.isArray(value);
      case InputType.DICT:
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case InputType.ANY:
        return true;
      default:
        return false;
    }
  }

  /**
   * Get tool metadata for registration and schema generation
   */
  getToolMetadata(): {
    name: string;
    description: string;
    inputs: ToolInput[];
  } {
    return {
      name: this.name,
      description: this.description,
      inputs: this.inputs
    };
  }

  /**
   * Create a JSON string result from data
   * @param data - Data to serialize
   * @returns JSON string
   */
  protected createJsonResult(data: any): string {
    return JSON.stringify(data, null, 2);
  }
}