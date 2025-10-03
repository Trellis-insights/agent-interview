from typing import Dict, Any
import json

from .base import BaseTool, ToolInput
from enums import InputType


class CalculatePensionTool(BaseTool):
    name = "calculate_pension"
    description = (
        "Calculate pension benefits based on salary, years of service, and retirement age"
    )
    inputs = [
        ToolInput(
            name="current_salary",
            type=InputType.FLOAT,
            description="Current annual salary in USD",
            required=True,
        ),
        ToolInput(
            name="years_of_service",
            type=InputType.INTEGER,
            description="Number of years of service with the company",
            required=True,
        ),
        ToolInput(
            name="retirement_age",
            type=InputType.INTEGER,
            description="Planned retirement age",
            required=True,
        ),
        ToolInput(
            name="pension_plan_type",
            type=InputType.STRING,
            description="Type of pension plan (defined_benefit, defined_contribution, hybrid)",
            required=False,
        ),
    ]

    def __call__(self, **kwargs: Any) -> str:
        """
        Expected arguments (by tool schema):
        - current_salary: float (USD)
        - years_of_service: int
        - retirement_age: int
        - pension_plan_type: str (optional)

        Returns a JSON string payload.
        """
        # Placeholder implementation; replace with real business logic
        result: Dict[str, Any] = {
            "input": kwargs,
            "note": "Stub calculate_pension implementation. Replace with real logic.",
        }
        return json.dumps(result)


# Export a default instance for convenient importing
tool = CalculatePensionTool()
