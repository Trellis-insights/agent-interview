from enum import Enum
from typing import Dict
from schemas import Agent
from agents.benefits import benefits_agent


class AvailableAgents(Enum):
    BENEFITS = "benefits"


# Mapping of agent names to agent instances
AGENT_REGISTRY: Dict[str, Agent] = {
    AvailableAgents.BENEFITS.value: benefits_agent,
}


def get_agent(agent_name: str) -> Agent:
    """Get an agent instance by name"""
    if agent_name not in AGENT_REGISTRY:
        raise ValueError(f"Agent '{agent_name}' not found. Available agents: {list(AGENT_REGISTRY.keys())}")
    return AGENT_REGISTRY[agent_name]


def get_agents(agent_names: list[str]) -> list[Agent]:
    """Get multiple agent instances by names"""
    return [get_agent(name) for name in agent_names]