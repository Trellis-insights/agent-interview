// Tool converter utilities
import { LLMProvider, Tool } from '../../types';
import { convertToolsToOpenAI, OpenAIFunction } from './openai';

/**
 * Convert a list of Tools to the format expected by the target LLM provider
 * @param tools - List of Tool objects to convert
 * @param targetProvider - Target LLM provider
 * @returns List of converted tools in the target provider's format
 * @throws Error if the target provider is not supported
 */
export function convertTools(tools: Tool[], targetProvider: LLMProvider): any[] {
  switch (targetProvider) {
    case LLMProvider.OPENAI:
      return convertToolsToOpenAI(tools);
    case LLMProvider.ANTHROPIC:
      // TODO: Implement Anthropic converter
      throw new Error('Anthropic tool conversion not yet implemented');
    case LLMProvider.GEMINI:
      // TODO: Implement Gemini converter
      throw new Error('Gemini tool conversion not yet implemented');
    default:
      throw new Error(`Unsupported LLM provider: ${targetProvider}`);
  }
}

// Re-export OpenAI types and functions
export * from './openai';