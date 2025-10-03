// Enhanced TypeScript translation of llm_provider_invocations/openai.py
import OpenAI from 'openai';
import { getTool } from '../../tools';
import { getEnvVar } from '../../utils';

// Enhanced OpenAI API response types
export interface OpenAIInvokeResult {
  output_items: any[];
  function_calls: Array<{
    name: string;
    arguments: string;
    call_id: string;
  }>;
  tool_uses: Array<{
    id: string;
    name: string;
    input: Record<string, any>;
  }>;
  output_text: string | null;
}

// OpenAI API error types
export class OpenAIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}

export class OpenAIRateLimitError extends OpenAIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'rate_limit_exceeded', 429);
    this.name = 'OpenAIRateLimitError';
  }
}

export class OpenAIQuotaError extends OpenAIError {
  constructor(message: string = 'Quota exceeded') {
    super(message, 'insufficient_quota', 429);
    this.name = 'OpenAIQuotaError';
  }
}

export class OpenAIAuthenticationError extends OpenAIError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'invalid_api_key', 401);
    this.name = 'OpenAIAuthenticationError';
  }
}

/**
 * Enhanced single call to the OpenAI API with comprehensive error handling
 * @param inputList - OpenAI API input (messages with role/content)
 * @param tools - Optional tool definitions in OpenAI API format
 * @param model - Model name
 * @returns Structured response data
 * @throws {OpenAIError} When API call fails
 */
export async function invokeOpenAI(
  inputList: Array<Record<string, any>>,
  tools?: any[],
  model: string = 'gpt-4'
): Promise<OpenAIInvokeResult> {
  try {
    const apiKey = getEnvVar('OPENAI_API_KEY');
    const client = new OpenAI({ apiKey });

    // Validate input
    if (!inputList || inputList.length === 0) {
      throw new OpenAIError('Input list cannot be empty');
    }

    // Validate messages have required structure
    for (const message of inputList) {
      if (!message.role) {
        throw new OpenAIError('Each message must have a role property');
      }
      // Content can be null for assistant messages with tool calls
      if (!message.content && message.role !== 'assistant' && !message.tool_calls) {
        throw new OpenAIError('Messages must have content unless they are assistant messages with tool calls');
      }
    }

    const requestParams: OpenAI.Chat.ChatCompletionCreateParams = {
      model,
      messages: inputList as OpenAI.Chat.ChatCompletionMessageParam[]
    };

    if (tools && tools.length > 0) {
      requestParams.tools = tools;
      requestParams.tool_choice = 'auto';
    }

    const response = await client.chat.completions.create(requestParams);

    // Validate response structure
    if (!response.choices || response.choices.length === 0) {
      throw new OpenAIError('No choices returned in OpenAI response');
    }

    // Parse response into structured data
    const message = response.choices[0]?.message;
    if (!message) {
      throw new OpenAIError('No message found in OpenAI response choice');
    }

    const functionCalls: Array<{ name: string; arguments: string; call_id: string }> = [];
    const toolUses: Array<{ id: string; name: string; input: Record<string, any> }> = [];

    // Handle tool calls from the response
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.type === 'function') {
          try {
            functionCalls.push({
              name: toolCall.function.name,
              arguments: toolCall.function.arguments,
              call_id: toolCall.id
            });
          } catch (error) {
            console.warn(`Failed to parse tool call:`, error);
            // Continue processing other tool calls
          }
        }
      }
    }

    return {
      output_items: [message],
      function_calls: functionCalls,
      tool_uses: toolUses, // OpenAI uses function_calls, not tool_uses
      output_text: message.content || null
    };

  } catch (error: any) {
    // Handle OpenAI SDK specific errors
    if (error?.status) {
      switch (error.status) {
        case 401:
          throw new OpenAIAuthenticationError(`Authentication failed: ${error.message}`);
        case 429:
          if (error.code === 'insufficient_quota') {
            throw new OpenAIQuotaError(`Quota exceeded: ${error.message}`);
          } else {
            throw new OpenAIRateLimitError(`Rate limit exceeded: ${error.message}`);
          }
        case 400:
          throw new OpenAIError(`Bad request: ${error.message}`, 'bad_request', 400, error);
        case 500:
        case 502:
        case 503:
        case 504:
          throw new OpenAIError(`OpenAI server error: ${error.message}`, 'server_error', error.status, error);
        default:
          throw new OpenAIError(`OpenAI API error: ${error.message}`, 'api_error', error.status, error);
      }
    }

    // Handle our custom errors
    if (error instanceof OpenAIError) {
      throw error;
    }

    // Handle network and other errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new OpenAIError(`Network error: ${error.message}`, 'network_error', undefined, error);
    }

    // Generic error fallback
    throw new OpenAIError(`Unexpected error: ${error.message || error}`, 'unknown_error', undefined, error);
  }
}

/**
 * Enhanced OpenAI loop with comprehensive error handling and retry logic
 * @param inputList - Pre-built OpenAI API input list (messages)
 * @param tools - Optional list of provider-formatted tools
 * @param model - OpenAI model name
 * @param maxIterations - Safety cap to avoid infinite loops
 * @param retryAttempts - Number of retry attempts for failed API calls
 * @returns Final assistant text response
 * @throws {OpenAIError} When unrecoverable error occurs
 */
export async function invokeOpenAILoop(
  inputList: Array<Record<string, any>>,
  tools?: any[],
  model: string = 'gpt-4',
  maxIterations: number = 5,
  retryAttempts: number = 3
): Promise<string> {
  // Work on a copy so caller's list isn't mutated unexpectedly
  const loopInput = [...inputList];
  let totalTokenUsage = 0;
  let successfulIterations = 0;

  for (let i = 0; i < maxIterations; i++) {
    let result: OpenAIInvokeResult | undefined;
    let attempts = 0;

    // Retry logic for API calls
    while (attempts < retryAttempts) {
      try {
        result = await invokeOpenAI(loopInput, tools, model);
        successfulIterations++;
        break;
      } catch (error) {
        attempts++;
        
        if (error instanceof OpenAIRateLimitError && attempts < retryAttempts) {
          // Exponential backoff for rate limiting
          const backoffMs = Math.pow(2, attempts) * 1000;
          console.warn(`Rate limit hit, retrying in ${backoffMs}ms... (attempt ${attempts}/${retryAttempts})`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }

        if (error instanceof OpenAIQuotaError) {
          throw new OpenAIError('OpenAI quota exceeded. Please check your billing.', 'quota_exceeded');
        }

        if (error instanceof OpenAIAuthenticationError) {
          throw new OpenAIError('Authentication failed. Please check your API key.', 'auth_failed');
        }

        if (attempts >= retryAttempts) {
          throw error;
        }

        // For server errors, wait before retrying
        if (error instanceof OpenAIError && error.code === 'server_error' && attempts < retryAttempts) {
          console.warn(`Server error, retrying in 2s... (attempt ${attempts}/${retryAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        throw error;
      }
    }

    // Ensure we have a result before proceeding
    if (!result) {
      throw new OpenAIError('Failed to get response from OpenAI after all retry attempts');
    }

    // Add the assistant's response to the conversation
    if (result.output_items[0]) {
      loopInput.push(result.output_items[0]);
    }

    // Collect function calls
    const functionCalls = result.function_calls;

    // If no function calls, we're done
    if (functionCalls.length === 0) {
      const outputText = result.output_text;
      if (outputText && outputText.trim()) {
        return outputText;
      }
      // Last resort: stringify the result
      return JSON.stringify(result);
    }

    // Execute each function call with enhanced error handling
    for (const fc of functionCalls) {
      const { name, arguments: argsJson, call_id: callId } = fc;
      let resultPayload: Record<string, any>;

      try {
        let parsedArgs: Record<string, any> = {};
        
        // Enhanced argument parsing
        try {
          if (typeof argsJson === 'string') {
            parsedArgs = JSON.parse(argsJson);
          } else if (typeof argsJson === 'object') {
            parsedArgs = argsJson || {};
          } else {
            parsedArgs = {};
          }
        } catch (parseError) {
          console.warn(`Failed to parse tool arguments for ${name}:`, parseError);
          resultPayload = {
            error: `Invalid JSON arguments: ${argsJson}`,
            input: argsJson,
            parseError: String(parseError)
          };
          
          // Add error result and continue
          loopInput.push({
            role: 'tool',
            tool_call_id: callId,
            content: JSON.stringify(resultPayload)
          });
          continue;
        }

        const toolImpl = getTool(name);
        if (toolImpl) {
          try {
            const outputStr = await toolImpl.call(parsedArgs);
            console.log(`Tool ${name} executed successfully`);
            
            // Enhanced JSON parsing with validation
            try {
              resultPayload = JSON.parse(outputStr);
              
              // Validate the result has expected structure
              if (typeof resultPayload !== 'object' || resultPayload === null) {
                resultPayload = { result: outputStr };
              }
            } catch (jsonError) {
              // If tool output isn't valid JSON, wrap it
              resultPayload = { 
                result: outputStr,
                note: 'Tool returned non-JSON output, wrapped in result field'
              };
            }
          } catch (toolError) {
            console.error(`Tool ${name} execution failed:`, toolError);
            resultPayload = {
              error: `Tool execution failed: ${toolError instanceof Error ? toolError.message : String(toolError)}`,
              input: parsedArgs,
              toolName: name
            };
          }
        } else {
          console.warn(`Tool ${name} not found in registry`);
          resultPayload = {
            error: `Tool '${name}' not found`,
            input: parsedArgs
          };
        }
      } catch (error) {
        console.error(`Unexpected error processing tool call ${name}:`, error);
        resultPayload = {
          error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
          input: argsJson,
          toolName: name
        };
      }

      // Add the tool result back to the conversation
      loopInput.push({
        role: 'tool',
        tool_call_id: callId,
        content: JSON.stringify(resultPayload)
      });
    }

    // Check if conversation is getting too long (token management)
    if (loopInput.length > 50) {
      console.warn('Conversation getting very long, may hit token limits');
    }
  }

  // Max iterations reached; return informative message
  const summary = `Reached maximum ${maxIterations} iterations. Successfully completed ${successfulIterations} API calls. Conversation may be incomplete.`;
  console.warn(summary);
  return summary;
}