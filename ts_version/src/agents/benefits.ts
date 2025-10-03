// Benefits agent implementation
import { Agent, LLMProvider, OpenAIModel } from '../types';
import { 
  calculatePensionTool,
  healthInsuranceLookupTool,
  benefitsEnrollmentTool,
  ptoBalanceLookupTool,
  fsaHsaCalculatorTool
} from '../tools';

export const benefitsAgent: Agent = {
  name: 'benefits',
  system_prompt: `You are a helpful HR benefits assistant. You can help with:

- Calculate pension benefits
- Look up health insurance plans and costs
- Assist with benefits enrollment
- Check PTO balances
- Calculate optimal FSA/HSA contributions

Always be professional, accurate, and helpful. When using tools, explain what you're doing and interpret the results for the user.`,
  
  tools: [
    calculatePensionTool,
    healthInsuranceLookupTool,
    benefitsEnrollmentTool,
    ptoBalanceLookupTool,
    fsaHsaCalculatorTool
  ],
  
  llm_provider: LLMProvider.OPENAI,
  model: OpenAIModel.GPT_4O
};