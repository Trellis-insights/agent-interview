from temporalio import activity
from typing import List, Optional, Dict, Any

from enums import AnthropicModel, GeminiModel, OpenAIModel
from schemas import AgentDefinition, LLMProvider
from tool_converter import convert_tools
from llm_provider_invocations.openai import invoke_openai_loop

@activity.defn
async def invoke_agent(
    request_text: str,
    request_files: Optional[List[str]] = None,
    agent: Optional[AgentDefinition] = None,
) -> str:
    """
    Invoke the appropriate LLM provider based on the model type.
    
    Args:
        request_text: The user's request/query
        request_files: Optional list of presigned URLs for files
        agent: Optional agent configuration with system prompt and tools
        model: Model name to use
        llm_provider: LLM provider (OPENAI, ANTHROPIC, GEMINI)
        
    Returns:
        The response from the LLM
    """
    
    if not agent:
        raise ValueError("Agent must be provided")
    # Parse provider once and validate from agent definition
    try:
        provider_enum = LLMProvider(agent.llm_provider)
    except ValueError as e:
        raise ValueError(f"Invalid llm_provider '{agent.llm_provider}'. Must be one of {[p.value for p in LLMProvider]}") from e

    # Extract system prompt and convert tools using the converter
    system_prompt = agent.system_prompt if agent else None
    tools = None
    if agent and agent.tools:
        # Convert our Tool schema to provider-specific tool definitions
        tools = convert_tools(agent.tools, provider_enum)
    
    # Route to appropriate provider based on parsed enum
    if provider_enum == LLMProvider.OPENAI:
        # Validate model is supported
        model_name = agent.model
        valid_models = [m.value for m in OpenAIModel]
        if model_name not in valid_models:
            raise ValueError(f"Unsupported OpenAI model: {model_name}. Supported models: {valid_models}")
        
        # Build input_list for OpenAI Responses API
        input_list: List[Dict[str, Any]] = []
        if system_prompt:
            input_list.append({
                "role": "system",
                "content": system_prompt,
            })
        content: List[Dict[str, Any]] = [{"type": "input_text", "text": request_text}]
        if request_files:
            for file_url in request_files:
                content.append({
                    "type": "input_file",
                    "file_url": file_url,
                })
        input_list.append({
            "role": "user",
            "content": content,
        })

        return invoke_openai_loop(
            input_list=input_list,
            tools=tools,
            model=model_name,
        )
    
    elif provider_enum == LLMProvider.ANTHROPIC:
        # Validate model is supported
        model_name = agent.model
        valid_models = [m.value for m in AnthropicModel]
        if model_name not in valid_models:
            raise ValueError(f"Unsupported Anthropic model: {model_name}. Supported models: {valid_models}")
        
        # TODO: Implement Anthropic provider
        raise NotImplementedError("Anthropic provider not yet implemented")
    
    elif provider_enum == LLMProvider.GEMINI:
        # Validate model is supported  
        model_name = agent.model
        valid_models = [m.value for m in GeminiModel]
        if model_name not in valid_models:
            raise ValueError(f"Unsupported Gemini model: {model_name}. Supported models: {valid_models}")
        
        # TODO: Implement Gemini provider
        raise NotImplementedError("Gemini provider not yet implemented")
    
    else:
        raise ValueError(f"Unsupported LLM provider: {agent.llm_provider}")