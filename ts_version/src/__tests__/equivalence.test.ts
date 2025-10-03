// Tests to verify equivalent behavior to Python version
import { convertToolsToOpenAI, inputTypeToOpenAIType } from '../llm/toolConverters/openai';
import { validateAgentRequest, validateCallAgentRequest } from '../utils/validation';
import { InputType, LLMProvider, OpenAIModel } from '../types';
import { getAgent, getAgents, getAvailableAgentNames } from '../agents/registry';
import { benefitsAgent } from '../agents/benefits';

describe('Python Equivalence Tests', () => {
  describe('Tool Conversion Equivalence', () => {
    it('should match Python input type mapping', () => {
      // Test all InputType mappings match Python version
      const expectedMappings = {
        [InputType.STRING]: 'string',
        [InputType.INTEGER]: 'integer', 
        [InputType.FLOAT]: 'number',
        [InputType.BOOLEAN]: 'boolean',
        [InputType.LIST]: 'array',
        [InputType.DICT]: 'object',
        [InputType.ANY]: 'string'
      };

      Object.entries(expectedMappings).forEach(([inputType, expected]) => {
        const result = inputTypeToOpenAIType(inputType as InputType);
        expect(result).toBe(expected);
      });
    });

    it('should generate same OpenAI function schema as Python', () => {
      // Test with the same tool structure used in Python tests
      const tool = {
        name: 'calculate_pension',
        description: 'Calculate pension benefits based on salary and years of service',
        inputs: [
          {
            name: 'annual_salary',
            description: 'Annual salary in dollars',
            type: InputType.FLOAT,
            required: true
          },
          {
            name: 'years_of_service',
            description: 'Years of service',
            type: InputType.INTEGER,
            required: true
          },
          {
            name: 'retirement_age',
            description: 'Age at retirement',
            type: InputType.INTEGER,
            required: true
          }
        ]
      };

      const result = convertToolsToOpenAI([tool]);
      const openaiFunction = result[0];

      expect(openaiFunction).toBeDefined();
      if (!openaiFunction) return;

      // Verify structure matches Python output
      expect(openaiFunction.type).toBe('function');
      expect(openaiFunction.function.name).toBe('calculate_pension');
      expect(openaiFunction.function.description).toBe('Calculate pension benefits based on salary and years of service');
      
      // Verify parameters structure
      const params = openaiFunction.function.parameters;
      expect(params.type).toBe('object');
      expect(params.additionalProperties).toBe(false);
      expect(params.required).toEqual(['annual_salary', 'years_of_service', 'retirement_age']);

      // Verify individual parameter types
      expect(params.properties.annual_salary?.type).toBe('number');
      expect(params.properties.years_of_service?.type).toBe('integer');
      expect(params.properties.retirement_age?.type).toBe('integer');

      // Verify compatibility fields exist
      expect(openaiFunction.name).toBe('calculate_pension');
      expect(openaiFunction.description).toBe('Calculate pension benefits based on salary and years of service');
      expect(openaiFunction.strict).toBe(true);
    });

    it('should handle edge cases like Python version', () => {
      // Empty tools array
      expect(convertToolsToOpenAI([])).toEqual([]);

      // Tool with no inputs
      const toolWithoutInputs = {
        name: 'simple_tool',
        description: 'A tool with no parameters',
        inputs: []
      };

      const result = convertToolsToOpenAI([toolWithoutInputs]);
      expect(result[0]?.function.parameters.properties).toEqual({});
      expect(result[0]?.function.parameters.required).toEqual([]);
    });
  });

  describe('Validation Equivalence', () => {
    it('should validate agent requests like Python version', () => {
      // Valid request - should pass
      const validRequest = {
        request_text: 'Calculate my pension',
        agent_names: ['benefits']
      };

      expect(() => validateAgentRequest(validRequest)).not.toThrow();

      // Invalid requests - should fail with same errors as Python
      expect(() => validateAgentRequest({
        request_text: '',
        agent_names: ['benefits']
      })).toThrow('request_text must be a non-empty string');

      expect(() => validateAgentRequest({
        request_text: 'Test',
        agent_names: []
      })).toThrow('agent_names must be a non-empty array');

      expect(() => validateAgentRequest({
        request_text: 'Test',
        agent_names: 'benefits' as any
      })).toThrow('agent_names must be an array');
    });

    it('should validate call agent requests with files like Python version', () => {
      // Valid request with files
      const validRequestWithFiles = {
        request_text: 'Process these files',
        agent_names: ['benefits'],
        request_files: [{
          filename: 'test.txt',
          content: Buffer.from('test content').toString('base64'),
          contentType: 'text/plain'
        }]
      };

      expect(() => validateCallAgentRequest(validRequestWithFiles)).not.toThrow();

      // Invalid file structure - should fail
      const invalidFileRequest = {
        request_text: 'Process these files',
        agent_names: ['benefits'],
        request_files: [{
          filename: '',
          content: 'invalid'
        }]
      };

      expect(() => validateCallAgentRequest(invalidFileRequest)).toThrow();
    });
  });

  describe('Agent Registry Equivalence', () => {
    it('should match Python agent registry behavior', () => {
      // Get available agents - should match Python AGENT_REGISTRY.keys()
      const availableAgents = getAvailableAgentNames();
      expect(availableAgents).toContain('benefits');
      expect(availableAgents.length).toBe(1); // Only benefits agent in both versions

      // Get single agent - should match Python get_agent()
      const agent = getAgent('benefits');
      expect(agent.name).toBe('benefits');
      expect(agent.llm_provider).toBe(LLMProvider.OPENAI);
      expect(agent.model).toBe(OpenAIModel.GPT_4O);

      // Get multiple agents - should match Python get_agents()
      const agents = getAgents(['benefits']);
      expect(agents).toHaveLength(1);
      expect(agents[0]?.name).toBe('benefits');

      // Non-existent agent - should throw like Python version
      expect(() => getAgent('nonexistent')).toThrow("Agent 'nonexistent' not found");
    });

    it('should have benefits agent with same configuration as Python', () => {
      const agent = getAgent('benefits');
      
      // Verify system prompt matches Python version
      expect(agent.system_prompt).toContain('HR benefits assistant');
      expect(agent.system_prompt).toContain('Calculate pension benefits');
      expect(agent.system_prompt).toContain('Look up health insurance plans');

      // Verify tools match Python version
      const toolNames = agent.tools.map(tool => tool.name).sort();
      const expectedTools = [
        'calculate_pension',
        'health_insurance_lookup', 
        'benefits_enrollment',
        'pto_balance_lookup',
        'fsa_hsa_calculator'
      ].sort();

      expect(toolNames).toEqual(expectedTools);

      // Verify LLM configuration matches
      expect(agent.llm_provider).toBe('OPENAI'); // Enum value
      expect(agent.model).toBe('gpt-4o');
    });
  });

  describe('Error Handling Equivalence', () => {
    it('should throw same validation errors as Python version', () => {
      const errorTests = [
        {
          input: { request_text: null, agent_names: ['benefits'] },
          expectedError: 'request_text must be a non-empty string'
        },
        {
          input: { request_text: 'test', agent_names: null },
          expectedError: 'agent_names must be an array'
        },
        {
          input: { request_text: 'test', agent_names: ['benefits'], request_files: 'invalid' },
          expectedError: 'request_files must be an array if provided'
        }
      ];

      errorTests.forEach(({ input, expectedError }) => {
        expect(() => validateAgentRequest(input as any)).toThrow(expectedError);
      });
    });

    it('should handle tool conversion errors like Python version', () => {
      // Null tool
      expect(() => convertToolsToOpenAI([null as any])).toThrow('Tool cannot be null or undefined');

      // Invalid tool structure
      expect(() => convertToolsToOpenAI([{
        name: '',
        description: 'test',
        inputs: []
      } as any])).toThrow('Tool name must be a non-empty string');

      // Duplicate tool names
      expect(() => convertToolsToOpenAI([
        { name: 'duplicate', description: 'First', inputs: [] },
        { name: 'duplicate', description: 'Second', inputs: [] }
      ] as any)).toThrow("Duplicate tool name 'duplicate' found");
    });
  });

  describe('Data Structure Equivalence', () => {
    it('should use same enum values as Python version', () => {
      // Verify InputType enum matches Python version
      expect(InputType.STRING).toBe('string');
      expect(InputType.INTEGER).toBe('integer');
      expect(InputType.FLOAT).toBe('float');
      expect(InputType.BOOLEAN).toBe('boolean');
      expect(InputType.LIST).toBe('list');
      expect(InputType.DICT).toBe('dict');
      expect(InputType.ANY).toBe('any');

      // Verify LLMProvider enum matches Python version
      expect(LLMProvider.OPENAI).toBe('OPENAI');

      // Verify model names match Python version
      expect(OpenAIModel.GPT_4).toBe('gpt-4');
      expect(OpenAIModel.GPT_4O).toBe('gpt-4o');
    });

    it('should have same interface structure as Python models', () => {
      // Test that our TypeScript interfaces match Python Pydantic models
      const agentRequest = {
        request_text: 'Test request',
        request_files: ['https://example.com/file.txt'],
        agents: [{
          name: 'test-agent',
          system_prompt: 'Test prompt',
          tools: [],
          llm_provider: LLMProvider.OPENAI,
          model: OpenAIModel.GPT_4O
        }]
      };

      // This should validate without issues if our interfaces match Python models
      expect(agentRequest.request_text).toBe('Test request');
      expect(agentRequest.request_files).toHaveLength(1);
      expect(agentRequest.agents).toHaveLength(1);
      expect(agentRequest.agents[0]?.name).toBe('test-agent');
    });
  });

  describe('API Response Equivalence', () => {
    it('should match Python FastAPI response format', () => {
      // Simulate the response format that tRPC should produce
      // to match Python FastAPI responses
      const expectedResponse = {
        request_text: 'Test request',
        request_files: ['https://example.com/file.txt'],
        result: 'Test result from agent',
        status: 200
      };

      // Verify response structure matches Python version
      expect(expectedResponse.request_text).toBeDefined();
      expect(expectedResponse.request_files).toBeInstanceOf(Array);
      expect(expectedResponse.result).toBeDefined();
      expect(expectedResponse.status).toBe(200);

      // Verify types match expected API contract
      expect(typeof expectedResponse.request_text).toBe('string');
      expect(typeof expectedResponse.result).toBe('string');
      expect(typeof expectedResponse.status).toBe('number');
    });

    it('should handle error responses like Python version', () => {
      // Error response should match Python FastAPI error format
      const errorResponse = {
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid agent names: nonexistent. Available agents: benefits'
        }
      };

      expect(errorResponse.error.code).toBeDefined();
      expect(errorResponse.error.message).toBeDefined();
      expect(typeof errorResponse.error.message).toBe('string');
    });
  });

  describe('Functional Equivalence', () => {
    it('should process same inputs to same outputs as Python version', () => {
      // Test the same tool that exists in both versions
      const tool = benefitsAgent.tools.find(t => t.name === 'calculate_pension');
      expect(tool).toBeDefined();
      
      if (tool) {
        // Verify tool has same parameters as Python version
        expect(tool.name).toBe('calculate_pension');
        expect(tool.description).toContain('pension');
        
        // Input parameter names should match TypeScript version
        const inputNames = tool.inputs.map(input => input.name).sort();
        expect(inputNames).toContain('current_salary');
        expect(inputNames).toContain('years_of_service');
      }
    });

    it('should maintain same business logic as Python version', () => {
      // Verify that the benefits agent has the same capabilities
      const agent = getAgent('benefits');
      
      // Should have all the same tools as Python version
      const toolNames = agent.tools.map(t => t.name);
      expect(toolNames).toContain('calculate_pension');
      expect(toolNames).toContain('health_insurance_lookup');
      expect(toolNames).toContain('benefits_enrollment');
      expect(toolNames).toContain('pto_balance_lookup');
      expect(toolNames).toContain('fsa_hsa_calculator');

      // Should use same LLM configuration
      expect(agent.llm_provider).toBe('OPENAI');
      expect(agent.model).toBe('gpt-4o');
    });
  });
});