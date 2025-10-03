// TypeScript implementation of fsa_hsa_calculator.py
import { BaseTool } from '../base';
import { ToolInput, InputType } from '../../types';

interface FsaHsaInput {
  expected_medical_expenses: number;
  account_type: string;
  current_age?: number;
  retirement_age?: number;
}

interface FsaHsaRecommendations {
  fsa?: number;
  hsa?: number;
  suggested_contribution?: number;
}

interface FsaHsaRationale {
  fsa?: string;
  hsa?: string;
  note?: string;
}

interface FsaHsaAssumptions {
  target_ratio: number;
  fsa_cap: number;
  hsa_cap_individual: number;
}

interface FsaHsaResult {
  input: FsaHsaInput;
  recommendations: FsaHsaRecommendations;
  assumptions: FsaHsaAssumptions;
  rationale: FsaHsaRationale;
  disclaimer: string;
}

export class FsaHsaCalculatorTool extends BaseTool {
  readonly name = 'fsa_hsa_calculator';
  readonly description = 'Calculate optimal FSA/HSA contributions based on expected medical expenses';
  readonly inputs: ToolInput[] = [
    {
      name: 'expected_medical_expenses',
      type: InputType.FLOAT,
      description: 'Expected annual medical expenses in USD',
      required: true
    },
    {
      name: 'account_type',
      type: InputType.STRING,
      description: 'Type of account (FSA, HSA, both)',
      required: true
    },
    {
      name: 'current_age',
      type: InputType.INTEGER,
      description: "Employee's current age",
      required: false
    },
    {
      name: 'retirement_age',
      type: InputType.INTEGER,
      description: 'Expected retirement age',
      required: false
    }
  ];

  async call(kwargs: Record<string, any>): Promise<string> {
    // Validate inputs before processing
    this.validateInputs(kwargs);

    // Parse and validate inputs
    let expenses: number;
    try {
      expenses = parseFloat(String(kwargs.expected_medical_expenses || 0));
    } catch {
      expenses = 0.0;
    }

    const accountType = String(kwargs.account_type || '').trim().toLowerCase();
    const currentAge = kwargs.current_age ? Number(kwargs.current_age) : undefined;
    const retirementAge = kwargs.retirement_age ? Number(kwargs.retirement_age) : undefined;

    // Basic guardrails
    if (expenses < 0) {
      expenses = 0.0;
    }

    // Heuristic: target 75-85% of expected expenses to avoid over-contributing
    const targetRatio = 0.8;

    const FSA_CAP = 3150.0;
    const HSA_CAP_INDIVIDUAL = 4150.0;

    const recommendations: FsaHsaRecommendations = {};
    const rationale: FsaHsaRationale = {};

    if (accountType === 'fsa') {
      const rec = Math.min(expenses * targetRatio, FSA_CAP);
      recommendations.fsa = Math.round(rec * 100) / 100;
      rationale.fsa = 'Recommend ~80% of expected expenses up to the FSA cap to reduce forfeiture risk.';
    } else if (accountType === 'hsa') {
      // If age >= 55, consider catch-up (not modeled; noted only)
      const rec = Math.min(expenses * targetRatio, HSA_CAP_INDIVIDUAL);
      recommendations.hsa = Math.round(rec * 100) / 100;
      rationale.hsa = 'Recommend ~80% of expected expenses up to the HSA cap. Consider catch-up if eligible.';
    } else if (accountType === 'both') {
      // Split: prioritize HSA (tax advantages + rollover), remainder to FSA
      const hsaTarget = Math.min(expenses * 0.5, HSA_CAP_INDIVIDUAL);
      const remaining = Math.max(expenses * targetRatio - hsaTarget, 0);
      const fsaTarget = Math.min(remaining, FSA_CAP);
      
      recommendations.hsa = Math.round(hsaTarget * 100) / 100;
      recommendations.fsa = Math.round(fsaTarget * 100) / 100;
      
      rationale.hsa = 'Prioritize HSA for tax efficiency and rollover; allocate ~50% of target there first.';
      rationale.fsa = 'Allocate remaining target to FSA up to the cap; avoid exceeding likely expenses.';
    } else {
      // Unknown type; provide a neutral suggestion based on expenses only
      const neutral = Math.min(expenses * targetRatio, Math.max(FSA_CAP, HSA_CAP_INDIVIDUAL));
      recommendations.suggested_contribution = Math.round(neutral * 100) / 100;
      rationale.note = 'Unknown account_type; suggested a single neutral target based on expected expenses.';
    }

    const result: FsaHsaResult = {
      input: {
        expected_medical_expenses: expenses,
        account_type: accountType,
        ...(currentAge !== undefined && { current_age: currentAge }),
        ...(retirementAge !== undefined && { retirement_age: retirementAge })
      },
      recommendations,
      assumptions: {
        target_ratio: targetRatio,
        fsa_cap: FSA_CAP,
        hsa_cap_individual: HSA_CAP_INDIVIDUAL
      },
      rationale,
      disclaimer: 'This is a non-binding illustrative calculation. Consult plan documents and a tax advisor.'
    };

    return this.createJsonResult(result);
  }
}

// Export a default instance for convenient importing
export const fsaHsaCalculatorTool = new FsaHsaCalculatorTool();