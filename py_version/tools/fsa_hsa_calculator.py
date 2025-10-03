from typing import Dict, Any
import json

from .base import BaseTool, ToolInput
from enums import InputType


class FsaHsaCalculatorTool(BaseTool):
    name = "fsa_hsa_calculator"
    description = (
        "Calculate optimal FSA/HSA contributions based on expected medical expenses"
    )
    inputs = [
        ToolInput(
            name="expected_medical_expenses",
            type=InputType.FLOAT,
            description="Expected annual medical expenses in USD",
            required=True,
        ),
        ToolInput(
            name="account_type",
            type=InputType.STRING,
            description="Type of account (FSA, HSA, both)",
            required=True,
        ),
        ToolInput(
            name="current_age",
            type=InputType.INTEGER,
            description="Employee's current age",
            required=False,
        ),
        ToolInput(
            name="retirement_age",
            type=InputType.INTEGER,
            description="Expected retirement age",
            required=False,
        ),
    ]

    def __call__(self, **kwargs: Any) -> str:
        """
        Expected arguments (by tool schema):
        - expected_medical_expenses: float (USD)
        - account_type: str
        - current_age: int (optional)
        - retirement_age: int (optional)

        Returns a JSON string payload.
        """
        # Dummy heuristic calculation for illustration purposes only.
        # Assumptions and hard-coded caps (2025-ish; not authoritative):
        # - FSA annual cap ~ $3,150
        # - HSA annual cap (individual) ~ $4,150
        # - If account_type == "both", split recommended contributions between FSA and HSA.

        try:
            expenses = float(kwargs.get("expected_medical_expenses", 0))
        except (TypeError, ValueError):
            expenses = 0.0

        account_type = str(kwargs.get("account_type", "")).strip().lower()
        current_age = kwargs.get("current_age")
        retirement_age = kwargs.get("retirement_age")

        # Basic guardrails
        if expenses < 0:
            expenses = 0.0

        # Heuristic: target 75-85% of expected expenses to avoid over-contributing.
        target_ratio = 0.8

        FSA_CAP = 3150.0
        HSA_CAP_INDIVIDUAL = 4150.0

        recommendations: Dict[str, float] = {}
        rationale: Dict[str, str] = {}

        if account_type == "fsa":
            rec = min(expenses * target_ratio, FSA_CAP)
            recommendations["fsa"] = round(rec, 2)
            rationale["fsa"] = (
                "Recommend ~80% of expected expenses up to the FSA cap to reduce forfeiture risk."
            )
        elif account_type == "hsa":
            # If age >= 55, consider catch-up (not modeled; noted only)
            rec = min(expenses * target_ratio, HSA_CAP_INDIVIDUAL)
            recommendations["hsa"] = round(rec, 2)
            rationale["hsa"] = (
                "Recommend ~80% of expected expenses up to the HSA cap. Consider catch-up if eligible."
            )
        elif account_type == "both":
            # Split: prioritize HSA (tax advantages + rollover), remainder to FSA
            hsa_target = min(expenses * 0.5, HSA_CAP_INDIVIDUAL)
            remaining = max(expenses * target_ratio - hsa_target, 0)
            fsa_target = min(remaining, FSA_CAP)
            recommendations["hsa"] = round(hsa_target, 2)
            recommendations["fsa"] = round(fsa_target, 2)
            rationale["hsa"] = (
                "Prioritize HSA for tax efficiency and rollover; allocate ~50% of target there first."
            )
            rationale["fsa"] = (
                "Allocate remaining target to FSA up to the cap; avoid exceeding likely expenses."
            )
        else:
            # Unknown type; provide a neutral suggestion based on expenses only
            neutral = min(expenses * target_ratio, max(FSA_CAP, HSA_CAP_INDIVIDUAL))
            recommendations["suggested_contribution"] = round(neutral, 2)
            rationale["note"] = (
                "Unknown account_type; suggested a single neutral target based on expected expenses."
            )

        result: Dict[str, Any] = {
            "input": {
                "expected_medical_expenses": expenses,
                "account_type": account_type,
                "current_age": current_age,
                "retirement_age": retirement_age,
            },
            "recommendations": recommendations,
            "assumptions": {
                "target_ratio": target_ratio,
                "fsa_cap": FSA_CAP,
                "hsa_cap_individual": HSA_CAP_INDIVIDUAL,
            },
            "rationale": rationale,
            "disclaimer": (
                "This is a non-binding illustrative calculation. Consult plan documents and a tax advisor."
            ),
        }
        return json.dumps(result)


tool = FsaHsaCalculatorTool()
