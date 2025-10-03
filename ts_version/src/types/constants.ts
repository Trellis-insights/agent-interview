// Constants and default values
import { LLMProvider, OpenAIModel, AnthropicModel, GeminiModel } from './enums';

// Default values from Python schemas
export const DEFAULT_STATUS_CODE = 200;
export const DEFAULT_TOOL_REQUIRED = true;

// HTTP Status codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

// Model mappings by provider
export const MODEL_BY_PROVIDER = {
  [LLMProvider.OPENAI]: Object.values(OpenAIModel),
  [LLMProvider.ANTHROPIC]: Object.values(AnthropicModel),
  [LLMProvider.GEMINI]: Object.values(GeminiModel)
} as const;

// Default models per provider
export const DEFAULT_MODELS = {
  [LLMProvider.OPENAI]: OpenAIModel.GPT_4O,
  [LLMProvider.ANTHROPIC]: AnthropicModel.CLAUDE_3_5_SONNET,
  [LLMProvider.GEMINI]: GeminiModel.GEMINI_1_5_PRO
} as const;

// Temporal configuration constants
export const TEMPORAL_DEFAULTS = {
  TASK_QUEUE: 'agent-task-queue',
  NAMESPACE: 'default',
  ADDRESS: 'localhost:7233'
} as const;

// OpenAI specific constants
export const OPENAI_DEFAULTS = {
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.7,
  TOP_P: 1.0,
  FREQUENCY_PENALTY: 0,
  PRESENCE_PENALTY: 0
} as const;