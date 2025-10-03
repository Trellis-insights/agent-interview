from typing import Dict, List, TypedDict
from enums import InputType
from tools.base import Tool


class OpenAIProperty(TypedDict, total=False):
    type: str
    description: str
    enum: List[str]
    additionalProperties: bool


class OpenAIParameters(TypedDict):
    type: str
    properties: Dict[str, OpenAIProperty]
    required: List[str]
    additionalProperties: bool


class OpenAIFunctionDef(TypedDict):
    name: str
    description: str
    parameters: OpenAIParameters


class OpenAIFunction(TypedDict, total=False):
    type: str  # "function"
    function: OpenAIFunctionDef
    strict: bool
    # Some OpenAI endpoints report missing tools[0].name; include top-level for compatibility
    name: str
    description: str
    # Some endpoints expect parameters at top-level: tools[i].parameters
    parameters: OpenAIParameters


def input_type_to_openai_type(input_type: InputType) -> str:
    """Convert our InputType enum to OpenAI parameter types."""
    mapping = {
        InputType.STRING: "string",
        InputType.INTEGER: "integer", 
        InputType.FLOAT: "number",
        InputType.BOOLEAN: "boolean",
        InputType.LIST: "array",
        InputType.DICT: "object",
        InputType.ANY: "string"  # Default to string for any type
    }
    return mapping.get(input_type, "string")


def convert_tools_to_openai(tools: List[Tool]) -> List[OpenAIFunction]:
    """Convert a list of Tools to OpenAI function format."""
    openai_functions: List[OpenAIFunction] = []
    
    for tool in tools:
        properties: Dict[str, OpenAIProperty] = {}
        required_fields: List[str] = []
        
        for tool_input in tool.inputs:
            openai_type = input_type_to_openai_type(tool_input.type)
            
            property_data: OpenAIProperty = {
                "type": openai_type,
                "description": tool_input.description,
            }
            # For object-typed properties, OpenAI strict schema expects additionalProperties = False
            if openai_type == "object":
                property_data["additionalProperties"] = False
                # Provide an explicit (empty) properties map to satisfy strict object schema
                # Note: TypedDict doesn't include nested 'properties' in OpenAIProperty, but OpenAI accepts it.
                # We'll type-ignore for clarity in static checks if needed.
                property_data["properties"] = {}  # type: ignore[typeddict-item]
            elif openai_type == "array":
                # Provide a default items schema; default to string items when not specified
                property_data["items"] = {"type": "string"}  # type: ignore[typeddict-item]
            
            properties[tool_input.name] = property_data
        # OpenAI strict function schema requires 'required' to include every property key
        required_fields = list(properties.keys())
        
        parameters: OpenAIParameters = {
            "type": "object",
            "properties": properties,
            "required": required_fields,
            "additionalProperties": False,
        }
        
        openai_function: OpenAIFunction = {
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": parameters,
            },
            # Duplicate name/description at top-level for broader compatibility
            "name": tool.name,
            "description": tool.description,
            # Duplicate parameters at top-level for broader compatibility
            "parameters": parameters,
            "strict": True,
        }
        
        openai_functions.append(openai_function)
    
    return openai_functions