from fastapi import UploadFile
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from enums import InputType, LLMProvider
from tools.base import BaseTool, Tool


class CallAgentRequest(BaseModel):
    request_text: str
    agent_names: List[str]
    request_files: Optional[List[UploadFile]] = None

class CallAgentResponse(BaseModel):
    request_text: str
    request_files: Optional[List[str]] = None
    result: str
    status: int = 200


class Agent(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    system_prompt: str
    name: str
    tools: List[BaseTool]
    llm_provider: str
    model: str


# OpenAI-related schemas
class ToolCall(BaseModel):
    id: str
    name: str
    arguments: Dict[str, Any]
    output: Optional[str] = None


class OpenAIResponse(BaseModel):
    content: str
    tool_calls: List[ToolCall] = Field(default_factory=list)
    total_tokens: Optional[int] = None
    model_used: str


class AgentDefinition(BaseModel):
    name: str
    system_prompt: str
    tools: List[Tool]
    llm_provider: str
    model: str

# Temporal workflow schemas
@dataclass
class AgentRequest:
    request_text: str
    request_files: List[str]
    agents: List[AgentDefinition]