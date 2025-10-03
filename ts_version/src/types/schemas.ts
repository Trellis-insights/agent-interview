// TypeScript equivalents of Pydantic models from schemas.py
import { InputType, LLMProvider } from './enums';

// Tool-related interfaces (from tools/base.py)
export interface ToolInput {
  name: string;
  type: InputType;
  description: string;
  required: boolean;
}

export interface Tool {
  name: string;
  description: string;
  inputs: ToolInput[];
}

// Abstract base for callable tools
export abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  abstract inputs: ToolInput[];
  
  abstract call(kwargs: Record<string, any>): Promise<string>;
}

// FastAPI request/response models
export interface CallAgentRequest {
  request_text: string;
  agent_names: string[];
  request_files?: File[];
}

export interface CallAgentResponse {
  request_text: string;
  request_files?: string[];
  result: string;
  status: number;
}

// Agent-related interfaces
export interface Agent {
  system_prompt: string;
  name: string;
  tools: BaseTool[];
  llm_provider: string;
  model: string;
}

export interface AgentDefinition {
  name: string;
  system_prompt: string;
  tools: Tool[];
  llm_provider: string;
  model: string;
}

// OpenAI-related schemas
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  output?: string;
}

export interface OpenAIResponse {
  content: string;
  tool_calls: ToolCall[];
  total_tokens?: number;
  model_used: string;
}

// Temporal workflow schemas (from dataclass)
export interface AgentRequest {
  request_text: string;
  request_files: string[];
  agents: AgentDefinition[];
}