// TypeScript translation of temporal/activities/invoke_agent.py
import { Context, log } from '@temporalio/activity';

// Helper function to safely log when in activity context
function safeLog(level: 'info' | 'error', message: string, data?: any): void {
  try {
    Context.current();
    log[level](message, data);
  } catch {
    // Not in activity context (e.g., unit test) - silently ignore
  }
}
import { 
  AgentDefinition, 
  LLMProvider, 
  OpenAIModel, 
  AnthropicModel, 
  GeminiModel 
} from '../../types';
import { convertTools } from '../../llm/toolConverters';
import { invokeOpenAILoop } from '../../llm/providers/openai';

/**
 * Invoke the appropriate LLM provider based on the agent configuration
 * @param requestText - The user's request/query
 * @param requestFiles - Optional list of presigned URLs for files
 * @param agent - Agent configuration with system prompt and tools
 * @returns The response from the LLM
 */
export async function invokeAgent(
  requestText: string,
  requestFiles?: string[],
  agent?: AgentDefinition
): Promise<string> {
  safeLog('info', 'invokeAgent activity called', { 
    requestText: requestText.substring(0, 100), 
    requestFilesCount: requestFiles?.length || 0,
    agentName: agent?.name 
  });

  if (!agent) {
    const error = 'Agent must be provided';
    safeLog('error', error);
    throw new Error(error);
  }

  // Validate provider
  let providerEnum: LLMProvider;
  try {
    // Check if the agent.llm_provider is a valid enum value
    if (!Object.values(LLMProvider).includes(agent.llm_provider as LLMProvider)) {
      throw new Error(`Invalid provider: ${agent.llm_provider}`);
    }
    providerEnum = agent.llm_provider as LLMProvider;
  } catch (error) {
    const validProviders = Object.values(LLMProvider);
    const errorMsg = `Invalid llm_provider '${agent.llm_provider}'. Must be one of ${validProviders}`;
    safeLog("error", errorMsg, { error });
    throw new Error(errorMsg);
  }

  // Extract system prompt and convert tools using the converter
  const systemPrompt = agent.system_prompt;
  let tools: any[] | undefined;
  
  if (agent.tools && agent.tools.length > 0) {
    try {
      // Convert our Tool schema to provider-specific tool definitions
      tools = convertTools(agent.tools, providerEnum);
      safeLog("info", 'Tools converted', { toolCount: tools.length, provider: providerEnum });
    } catch (error) {
      safeLog("error", 'Failed to convert tools', { error, provider: providerEnum });
      throw error;
    }
  }

  // Route to appropriate provider based on parsed enum
  if (providerEnum === LLMProvider.OPENAI) {
    // Validate model is supported
    const modelName = agent.model;
    const validModels = Object.values(OpenAIModel);
    if (!validModels.includes(modelName as OpenAIModel)) {
      const errorMsg = `Unsupported OpenAI model: ${modelName}. Supported models: ${validModels}`;
      safeLog("error", errorMsg);
      throw new Error(errorMsg);
    }

    // Build input_list for OpenAI API
    const inputList: Array<Record<string, any>> = [];
    
    if (systemPrompt) {
      inputList.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Build user message content
    let userContent: string | Array<Record<string, any>> = requestText;
    
    // If there are files, create a multi-part content structure
    if (requestFiles && requestFiles.length > 0) {
      const contentParts: Array<Record<string, any>> = [
        {
          type: 'text',
          text: requestText
        }
      ];
      
      for (const fileUrl of requestFiles) {
        // For now, just reference the file URL in text
        // In a full implementation, you'd handle different file types appropriately
        contentParts.push({
          type: 'text',
          text: `File: ${fileUrl}`
        });
      }
      
      userContent = contentParts;
    }

    inputList.push({
      role: 'user',
      content: userContent
    });

    safeLog("info", 'Invoking OpenAI', { 
      model: modelName, 
      messageCount: inputList.length,
      toolCount: tools?.length || 0 
    });

    try {
      const result = await invokeOpenAILoop(inputList, tools, modelName);
      safeLog("info", 'OpenAI invocation completed', { resultLength: result.length });
      return result;
    } catch (error) {
      safeLog("error", 'OpenAI invocation failed', { error });
      throw error;
    }

  } else if (providerEnum === LLMProvider.ANTHROPIC) {
    // Validate model is supported
    const modelName = agent.model;
    const validModels = Object.values(AnthropicModel);
    if (!validModels.includes(modelName as AnthropicModel)) {
      const errorMsg = `Unsupported Anthropic model: ${modelName}. Supported models: ${validModels}`;
      safeLog("error", errorMsg);
      throw new Error(errorMsg);
    }

    // TODO: Implement Anthropic provider
    const errorMsg = 'Anthropic provider not yet implemented';
    safeLog("error", errorMsg);
    throw new Error(errorMsg);

  } else if (providerEnum === LLMProvider.GEMINI) {
    // Validate model is supported
    const modelName = agent.model;
    const validModels = Object.values(GeminiModel);
    if (!validModels.includes(modelName as GeminiModel)) {
      const errorMsg = `Unsupported Gemini model: ${modelName}. Supported models: ${validModels}`;
      safeLog("error", errorMsg);
      throw new Error(errorMsg);
    }

    // TODO: Implement Gemini provider
    const errorMsg = 'Gemini provider not yet implemented';
    safeLog("error", errorMsg);
    throw new Error(errorMsg);

  } else {
    const errorMsg = `Unsupported LLM provider: ${agent.llm_provider}`;
    safeLog("error", errorMsg);
    throw new Error(errorMsg);
  }
}