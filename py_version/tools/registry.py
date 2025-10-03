from __future__ import annotations

from typing import Dict, Optional

from .calculate_pension import tool as calculate_pension_tool
from .health_insurance_lookup import tool as health_insurance_lookup_tool
from .pto_balance_lookup import tool as pto_balance_tool
from .benefits_enrollment import tool as benefits_enrollment_tool
from .fsa_hsa_calculator import tool as fsa_hsa_calculator_tool
from .base import BaseTool

# Global registry of available tools by name
_TOOL_REGISTRY: Dict[str, BaseTool] = {
    calculate_pension_tool.name: calculate_pension_tool,
    health_insurance_lookup_tool.name: health_insurance_lookup_tool,
    pto_balance_tool.name: pto_balance_tool,
    benefits_enrollment_tool.name: benefits_enrollment_tool,
    fsa_hsa_calculator_tool.name: fsa_hsa_calculator_tool,
}


def get_tool(name: str) -> Optional[BaseTool]:
    """Return a tool implementation by its canonical name, if available."""
    return _TOOL_REGISTRY.get(name)
