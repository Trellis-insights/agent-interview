
from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from datetime import timedelta
    from .activities import say_hello, invoke_agent
    from schemas import AgentRequest


@workflow.defn
class AgentWorkflow:
    @workflow.run
    async def run(self, request: AgentRequest) -> str:
        # First call say_hello
        hello_result = await workflow.execute_activity(
            say_hello,
            request.request_text,
            start_to_close_timeout=timedelta(seconds=10),
            retry_policy=RetryPolicy(
                maximum_attempts=3,
                initial_interval=timedelta(seconds=1),
                maximum_interval=timedelta(seconds=10),
            )
        )
        
        # Then call invoke_agent with the request details
        if not request.agents:
            raise ValueError("AgentRequest.agents must contain at least one agent")
        agent = request.agents[0]
        llm_result = await workflow.execute_activity(
            invoke_agent,
            args=[
                request.request_text,
                request.request_files,
                agent,
            ],
            start_to_close_timeout=timedelta(seconds=60),
            retry_policy=RetryPolicy(
                maximum_attempts=3,
                initial_interval=timedelta(seconds=2),
                maximum_interval=timedelta(seconds=30),
            )
        )
        
        return llm_result