from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from openai import OpenAI as OpenAIClient  # type: ignore[reportUnknownVariableType]
else:
    import openai as _openai
    OpenAIClient = _openai.OpenAI  # type: ignore[attr-defined]
import json
import os
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

from tools.registry import get_tool

load_dotenv('.env.local')


def invoke_openai(
    input_list: List[Dict[str, Any]],
    tools: Optional[List[Any]] = None,
    model: str = "gpt-4",
) -> Dict[str, Any]:
    """
    Single call to the OpenAI Responses API.

    Args:
        input_list: Responses API input (messages with role/content)
        tools: Optional tool definitions in Responses API format
        model: Model name

    Returns:
        A dict with keys:
          - output_items: list of response.output items (may include function_call/tool_use)
          - function_calls: list of {name, arguments, call_id}
          - tool_uses: list of {id, name, input}
          - output_text: str | None convenience final text, if provided by SDK
    """
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable is required")

    client = OpenAIClient(api_key=openai_api_key)

    response_kwargs: Dict[str, Any] = {
        "model": model,
        "input": input_list,
    }
    if tools:
        response_kwargs["tools"] = tools
        response_kwargs["tool_choice"] = "auto"

    response = client.responses.create(**response_kwargs)

    # Parse outputs into structured data for the loop controller
    output_items = getattr(response, "output", []) or []
    function_calls: List[Dict[str, Any]] = []
    tool_uses: List[Dict[str, Any]] = []

    for item in output_items:
        item_type = getattr(item, "type", None)
        if item_type == "function_call":
            function_calls.append({
                "name": getattr(item, "name", None),
                "arguments": getattr(item, "arguments", "{}"),
                "call_id": getattr(item, "call_id", None),
            })
        contents = getattr(item, "content", []) or []
        for c in contents:
            if getattr(c, "type", None) == "tool_use":
                tool_uses.append({
                    "id": getattr(c, "id", None),
                    "name": getattr(c, "name", None),
                    "input": getattr(c, "input", {}),
                })

    output_text = getattr(response, "output_text", None)

    return {
        "output_items": output_items,
        "function_calls": function_calls,
        "tool_uses": tool_uses,
        "output_text": output_text,
    }


def invoke_openai_loop(
    input_list: List[Dict[str, Any]],
    tools: Optional[List[Any]] = None,
    model: str = "gpt-4",
    max_iterations: int = 5,
) -> str:
    """
    Call OpenAI in a loop, resolving tool calls (Responses API tool_use) by
    appending tool_result content and re-calling until no tool calls remain.

    Args:
        input_list: Pre-built Responses API input list (messages with role/content).
        tools: Optional list of provider-formatted tools.
        model: OpenAI model name.
        max_iterations: Safety cap to avoid infinite loops.

    Returns:
        Final assistant text response when no tool calls remain.
    """
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable is required")

    # Work on a copy so caller's list isn't mutated unexpectedly
    loop_input = list(input_list)

    for _ in range(max_iterations):
        # Perform a single step call via invoke_openai
        result = invoke_openai(loop_input, tools=tools, model=model)

        # 1) Save model outputs (which can include function_call/tool_use) back to input_list
        output_items = result.get("output_items", [])
        if output_items:
            loop_input += output_items

        # 2) Collect function calls and/or tool uses
        function_calls: List[Dict[str, Any]] = result.get("function_calls", [])
        tool_uses: List[Dict[str, Any]] = result.get("tool_uses", [])

        # If neither function calls nor tool uses, we are done
        if not function_calls and not tool_uses:
            output_text = result.get("output_text")
            if isinstance(output_text, str) and output_text.strip():
                return output_text
            # Last resort: stringify the result
            return json.dumps(result)

        # 3) For each function_call, append a function_call_output
        for fc in function_calls:
            name = fc.get("name")
            args_json = fc.get("arguments")
            # Default placeholder result
            result_payload: Dict[str, Any]
            try:
                parsed_args = json.loads(args_json) if isinstance(args_json, str) else (args_json or {})
            except Exception:
                parsed_args = {}
            executed = False
            if name:
                tool_impl = get_tool(name)
                if tool_impl is not None:
                    try:
                        output_str = tool_impl(**parsed_args)
                        print(output_str)
                        # Ensure output is a JSON string as per Responses API
                        result_payload = json.loads(output_str)
                        executed = True
                    except Exception as e:
                        result_payload = {"error": f"Tool execution failed: {e}", "input": parsed_args}
                        executed = True
            if not executed:
                result_payload = {
                    "result": f"Function '{name}' called with args {args_json}. Implementation needed.",
                }
            loop_input.append({
                "type": "function_call_output",
                "call_id": fc.get("call_id"),
                "output": json.dumps(result_payload),
            })

        # 4) For each tool_use, append a tool_result message
        for tu in tool_uses:
            name = tu.get("name")
            args = tu.get("input")
            tool_output = {
                "result": f"Tool '{name}' called with args {args}. Implementation needed.",
            }
            loop_input.append({
                "type": "tool_result",
                "tool_use_id": tu.get("id"),
                "content": json.dumps(tool_output),
            })

    # Max iterations reached; return best-effort text
    return "Reached max tool iterations without final answer."