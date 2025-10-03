// Zod schemas for runtime validation (Pydantic equivalent)
import { z } from 'zod';
import { InputType, LLMProvider, OpenAIModel, AnthropicModel, GeminiModel } from './enums';

// Enum validation schemas
export const InputTypeSchema = z.nativeEnum(InputType);
export const LLMProviderSchema = z.nativeEnum(LLMProvider);
export const OpenAIModelSchema = z.nativeEnum(OpenAIModel);
export const AnthropicModelSchema = z.nativeEnum(AnthropicModel);
export const GeminiModelSchema = z.nativeEnum(GeminiModel);

// Tool-related validation schemas
export const ToolInputSchema = z.object({
  name: z.string().min(1),
  type: InputTypeSchema,
  description: z.string().min(1),
  required: z.boolean().default(true)
});

export const ToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  inputs: z.array(ToolInputSchema)
});

// FastAPI request/response validation schemas
export const CallAgentRequestSchema = z.object({
  request_text: z.string().min(1),
  agent_names: z.array(z.string().min(1)).min(1),
  request_files: z.array(z.any()).optional() // File objects are complex, using any for now
});

export const CallAgentResponseSchema = z.object({
  request_text: z.string(),
  request_files: z.array(z.string()).optional(),
  result: z.string(),
  status: z.number().int().min(100).max(599).default(200)
});

// Agent-related validation schemas
export const AgentDefinitionSchema = z.object({
  name: z.string().min(1),
  system_prompt: z.string().min(1),
  tools: z.array(ToolSchema),
  llm_provider: z.string().min(1),
  model: z.string().min(1)
});

export const AgentSchema = z.object({
  system_prompt: z.string().min(1),
  name: z.string().min(1),
  tools: z.array(z.any()), // BaseTool instances are complex, using any for now
  llm_provider: z.string().min(1),
  model: z.string().min(1)
});

// OpenAI-related validation schemas
export const ToolCallSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  arguments: z.record(z.any()),
  output: z.string().optional()
});

export const OpenAIResponseSchema = z.object({
  content: z.string(),
  tool_calls: z.array(ToolCallSchema).default([]),
  total_tokens: z.number().int().positive().optional(),
  model_used: z.string().min(1)
});

// Temporal workflow validation schemas
export const AgentRequestSchema = z.object({
  request_text: z.string().min(1),
  request_files: z.array(z.string()),
  agents: z.array(AgentDefinitionSchema).min(1)
});

// Type inference from Zod schemas
export type CallAgentRequestType = z.infer<typeof CallAgentRequestSchema>;
export type CallAgentResponseType = z.infer<typeof CallAgentResponseSchema>;
export type AgentDefinitionType = z.infer<typeof AgentDefinitionSchema>;
export type AgentType = z.infer<typeof AgentSchema>;
export type ToolCallType = z.infer<typeof ToolCallSchema>;
export type OpenAIResponseType = z.infer<typeof OpenAIResponseSchema>;
export type AgentRequestType = z.infer<typeof AgentRequestSchema>;
export type ToolType = z.infer<typeof ToolSchema>;
export type ToolInputType = z.infer<typeof ToolInputSchema>;