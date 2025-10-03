// Tests for validation schemas
import {
  CallAgentRequestSchema,
  CallAgentResponseSchema,
  AgentDefinitionSchema,
  ToolSchema,
  ToolInputSchema,
  InputType,
  LLMProvider
} from '../src/types';
import { validateSchema, ValidationError } from '../src/utils';

describe('Validation Schemas', () => {
  describe('ToolInputSchema', () => {
    it('should validate a valid tool input', () => {
      const validInput = {
        name: 'test_input',
        type: InputType.STRING,
        description: 'Test input description',
        required: true
      };

      const result = validateSchema(ToolInputSchema, validInput);
      expect(result).toEqual(validInput);
    });

    it('should use default required value', () => {
      const input = {
        name: 'test_input',
        type: InputType.STRING,
        description: 'Test input description'
      };

      const result = validateSchema(ToolInputSchema, input);
      expect(result.required).toBe(true);
    });
  });

  describe('ToolSchema', () => {
    it('should validate a valid tool', () => {
      const validTool = {
        name: 'test_tool',
        description: 'Test tool description',
        inputs: [
          {
            name: 'input1',
            type: InputType.STRING,
            description: 'String input',
            required: true
          }
        ]
      };

      const result = validateSchema(ToolSchema, validTool);
      expect(result).toEqual(validTool);
    });
  });

  describe('CallAgentRequestSchema', () => {
    it('should validate a valid call agent request', () => {
      const validRequest = {
        request_text: 'Test request',
        agent_names: ['agent1', 'agent2']
      };

      const result = validateSchema(CallAgentRequestSchema, validRequest);
      expect(result).toEqual(validRequest);
    });

    it('should fail validation with empty request_text', () => {
      const invalidRequest = {
        request_text: '',
        agent_names: ['agent1']
      };

      expect(() => {
        validateSchema(CallAgentRequestSchema, invalidRequest);
      }).toThrow(ValidationError);
    });
  });

  describe('AgentDefinitionSchema', () => {
    it('should validate a valid agent definition', () => {
      const validAgent = {
        name: 'test_agent',
        system_prompt: 'You are a helpful assistant',
        tools: [
          {
            name: 'test_tool',
            description: 'Test tool',
            inputs: [
              {
                name: 'input1',
                type: InputType.STRING,
                description: 'String input',
                required: true
              }
            ]
          }
        ],
        llm_provider: LLMProvider.OPENAI,
        model: 'gpt-4'
      };

      const result = validateSchema(AgentDefinitionSchema, validAgent);
      expect(result).toEqual(validAgent);
    });
  });
});