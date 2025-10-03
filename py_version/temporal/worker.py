import asyncio
from temporalio.client import Client
from temporalio.worker import Worker

from temporal.agent import AgentWorkflow
from temporal.activities import say_hello, invoke_agent


async def main():
    client = await Client.connect("localhost:7233")
    
    worker = Worker(
        client,
        task_queue="agent-task-queue",
        workflows=[AgentWorkflow],
        activities=[say_hello, invoke_agent]
    )
    
    print("Starting worker...")
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())