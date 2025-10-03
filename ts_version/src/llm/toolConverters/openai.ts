// TypeScript translation of llm_tool_converters/openai.py
import { InputType, Tool } from '../../types';

// OpenAI API type definitions
export interface OpenAIProperty {
  type: string;
  description: string;
  enum?: string[];
  additionalProperties?: boolean;
  properties?: Record<string, OpenAIProperty>;
  items?: OpenAIProperty;
}

export interface OpenAIParameters {
  type: string;
  properties: Record<string, OpenAIProperty>;
  required: string[];
  additionalProperties: boolean;
}

export interface OpenAIFunctionDef {
  name: string;
  description: string;
  parameters: OpenAIParameters;
}

export interface OpenAIFunction {
  type: string; // "function"
  function: OpenAIFunctionDef;
  strict?: boolean;
  // Some OpenAI endpoints report missing tools[0].name; include top-level for compatibility
  name: string;
  description: string;
  // Some endpoints expect parameters at top-level: tools[i].parameters
  parameters: OpenAIParameters;
}

/**
 * Convert our InputType enum to OpenAI parameter types
 * @param inputType - Input type to convert
 * @returns OpenAI parameter type string
 */
export function inputTypeToOpenAIType(inputType: InputType): string {
  const mapping: Record<InputType, string> = {
    [InputType.STRING]: 'string',
    [InputType.INTEGER]: 'integer',
    [InputType.FLOAT]: 'number',
    [InputType.BOOLEAN]: 'boolean',
    [InputType.LIST]: 'array',
    [InputType.DICT]: 'object',
    [InputType.ANY]: 'string' // Default to string for any type
  };
  
  return mapping[inputType] || 'string';
}

// Tool conversion error class
export class ToolConversionError extends Error {
  constructor(
    message: string,
    public toolName?: string,
    public inputName?: string
  ) {
    super(message);
    this.name = 'ToolConversionError';
  }
}

/**
 * Enhanced tool validation and conversion with comprehensive error handling
 * @param tool - Tool to validate
 * @throws {ToolConversionError} When tool validation fails
 */
function validateTool(tool: Tool): void {
  if (!tool) {
    throw new ToolConversionError('Tool cannot be null or undefined');
  }
  
  if (!tool.name || typeof tool.name !== 'string') {
    throw new ToolConversionError('Tool name must be a non-empty string', tool.name);
  }
  
  if (!tool.description || typeof tool.description !== 'string') {
    throw new ToolConversionError('Tool description must be a non-empty string', tool.name);
  }
  
  if (!Array.isArray(tool.inputs)) {
    throw new ToolConversionError('Tool inputs must be an array', tool.name);
  }
  
  // Validate each input
  for (const input of tool.inputs) {
    if (!input.name || typeof input.name !== 'string') {
      throw new ToolConversionError('Input name must be a non-empty string', tool.name, input.name);
    }
    
    if (!input.description || typeof input.description !== 'string') {
      throw new ToolConversionError('Input description must be a non-empty string', tool.name, input.name);
    }
    
    if (!input.type || !Object.values(InputType).includes(input.type)) {
      throw new ToolConversionError(
        `Invalid input type '${input.type}'. Must be one of: ${Object.values(InputType).join(', ')}`,
        tool.name,
        input.name
      );
    }
  }
  
  // Check for duplicate input names
  const inputNames = tool.inputs.map(input => input.name);
  const duplicates = inputNames.filter((name, index) => inputNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    throw new ToolConversionError(
      `Duplicate input names found: ${duplicates.join(', ')}`,
      tool.name
    );
  }
}

/**
 * Enhanced tool conversion with comprehensive validation and error handling
 * @param tools - List of tools to convert
 * @returns Array of OpenAI function definitions
 * @throws {ToolConversionError} When tool conversion fails
 */
export function convertToolsToOpenAI(tools: Tool[]): OpenAIFunction[] {
  if (!Array.isArray(tools)) {
    throw new ToolConversionError('Tools must be provided as an array');
  }
  
  if (tools.length === 0) {
    return [];
  }
  
  const openAIFunctions: OpenAIFunction[] = [];
  const processedToolNames = new Set<string>();
  
  for (const tool of tools) {
    try {
      // Validate tool structure
      validateTool(tool);
      
      // Check for duplicate tool names
      if (processedToolNames.has(tool.name)) {
        throw new ToolConversionError(`Duplicate tool name '${tool.name}' found`, tool.name);
      }
      processedToolNames.add(tool.name);
      
      const properties: Record<string, OpenAIProperty> = {};
      
      for (const toolInput of tool.inputs) {
        const openAIType = inputTypeToOpenAIType(toolInput.type);
        
        const propertyData: OpenAIProperty = {
          type: openAIType,
          description: toolInput.description
        };
        
        // Enhanced type-specific property handling
        switch (openAIType) {
          case 'object':
            propertyData.additionalProperties = false;
            propertyData.properties = {};
            break;
          case 'array':
            propertyData.items = { 
              type: 'string', 
              description: `Items in the ${toolInput.name} array`
            };
            break;
          case 'integer':
          case 'number':
            // Future: Add number constraints if available in ToolInput interface
            // if (toolInput.minimum !== undefined) {
            //   (propertyData as any).minimum = toolInput.minimum;
            // }
            // if (toolInput.maximum !== undefined) {
            //   (propertyData as any).maximum = toolInput.maximum;
            // }
            break;
          case 'string':
            // Future: Add string constraints if available in ToolInput interface
            // if (toolInput.pattern !== undefined) {
            //   (propertyData as any).pattern = toolInput.pattern;
            // }
            // if (toolInput.enum !== undefined) {
            //   propertyData.enum = toolInput.enum;
            // }
            break;
        }
        
        properties[toolInput.name] = propertyData;
      }
      
      // OpenAI strict function schema requires 'required' to include every property key
      const requiredFields = Object.keys(properties);
      
      const parameters: OpenAIParameters = {
        type: 'object',
        properties,
        required: requiredFields,
        additionalProperties: false
      };
      
      const openAIFunction: OpenAIFunction = {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters
        },
        // Duplicate name/description at top-level for broader compatibility
        name: tool.name,
        description: tool.description,
        // Duplicate parameters at top-level for broader compatibility
        parameters,
        strict: true
      };
      
      openAIFunctions.push(openAIFunction);
      
    } catch (error) {
      if (error instanceof ToolConversionError) {
        throw error;
      }
      
      throw new ToolConversionError(
        `Failed to convert tool '${tool?.name || 'unknown'}': ${error instanceof Error ? error.message : String(error)}`,
        tool?.name
      );
    }
  }
  
  return openAIFunctions;
}

/**
 * Validate OpenAI function format
 * @param openAIFunction - Function to validate
 * @returns True if valid
 * @throws {ToolConversionError} If invalid
 */
export function validateOpenAIFunction(openAIFunction: OpenAIFunction): boolean {
  if (!openAIFunction.name) {
    throw new ToolConversionError('OpenAI function must have a name');
  }
  
  if (!openAIFunction.description) {
    throw new ToolConversionError('OpenAI function must have a description');
  }
  
  if (!openAIFunction.function || !openAIFunction.function.parameters) {
    throw new ToolConversionError('OpenAI function must have function.parameters');
  }
  
  return true;
}