from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, List
from pydantic import BaseModel
from enums import InputType

class Tool(BaseModel):
    name: str
    description: str
    inputs: List[ToolInput]
    
class ToolInput(BaseModel):
    name: str
    type: InputType
    description: str
    required: bool = True

class BaseTool(ABC):
    """
    Base interface for callable tools. Implementations must provide a
    human-readable name/description and implement __call__(**kwargs) -> str.

    The __call__ contract returns a JSON-serializable string payload so it can
    be fed back to the LLM as a tool result.
    """

    # Canonical tool name used in schemas and model tool registration
    name: str

    # Short description of what the tool does
    description: str
    
    # Structured input definitions (mirrors schemas.Tool.inputs)
    inputs: List[ToolInput]

    @abstractmethod
    def __call__(self, **kwargs: Any) -> str:  # pragma: no cover - interface only
        """Execute the tool with keyword arguments and return a JSON string."""
        raise NotImplementedError
