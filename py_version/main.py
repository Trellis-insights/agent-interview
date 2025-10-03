from fastapi import FastAPI, UploadFile, File, Form
from typing import Optional, List
from temporalio.client import Client
from temporal import AgentWorkflow, AgentRequest
from utils import get_presigned_urls
from schemas import AgentDefinition, CallAgentRequest, CallAgentResponse   
from agents.registry import get_agents
from tools.base import Tool

app = FastAPI()


@app.post("/call-agent", response_model=CallAgentResponse)
async def call_agent(
    request: CallAgentRequest,
) -> CallAgentResponse:
    # Get presigned URLs for uploaded files
    presigned_urls = []
    if request.request_files:
        presigned_urls = await get_presigned_urls(request.request_files)
    
    # Get agents by names
    agents = get_agents(request.agent_names)
        
    # Connect to Temporal and execute workflow
    client = await Client.connect("localhost:7233")
    
    # Create workflow input with presigned URLs and agents
    agent_request = AgentRequest(
        request_text=request.request_text,
        request_files=presigned_urls,
        agents=[
            AgentDefinition(
                name=agent.name,
                system_prompt=agent.system_prompt,
                tools=[Tool(name=tool.name, description=tool.description, inputs=tool.inputs) for tool in agent.tools],
                llm_provider=agent.llm_provider,
                model=agent.model,
            )
            for agent in agents
        ],
    )
    
    # Execute workflow
    result = await client.execute_workflow(
        AgentWorkflow.run,
        agent_request,
        id=f"agent-workflow-{request.request_text[:20]}",
        task_queue="agent-task-queue"
    )
    
    return CallAgentResponse(
        request_text=request.request_text,
        request_files=presigned_urls,
        result=result,
        status=200
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)