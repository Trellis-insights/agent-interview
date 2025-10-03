// Comprehensive tests for the tool system
import {
  BaseTool,
  ToolRegistry,
  ToolFactory,
  ToolBuilder,
  ToolUtils,
  calculatePensionTool,
  healthInsuranceLookupTool,
  benefitsEnrollmentTool,
  ptoBalanceLookupTool,
  fsaHsaCalculatorTool,
  getTool,
  getAllTools,
  getAvailableToolNames
} from '../src/tools';
import { InputType } from '../src/types';

describe('Tool System', () => {
  describe('BaseTool Abstract Class', () => {
    it('should validate required inputs correctly', async () => {
      const tool = calculatePensionTool;
      
      // Valid inputs
      const validInputs = {
        current_salary: 75000,
        years_of_service: 10,
        retirement_age: 65
      };
      
      const result = await tool.call(validInputs);
      expect(result).toBeTruthy();
      expect(JSON.parse(result)).toHaveProperty('input');
    });

    it('should throw error for missing required inputs', async () => {
      const tool = calculatePensionTool;
      
      const invalidInputs = {
        current_salary: 75000
        // Missing required fields
      };
      
      await expect(tool.call(invalidInputs)).rejects.toThrow('Required input');
    });

    it('should validate input types correctly', async () => {
      const tool = calculatePensionTool;
      
      const invalidTypeInputs = {
        current_salary: 'not a number',
        years_of_service: 10,
        retirement_age: 65
      };
      
      await expect(tool.call(invalidTypeInputs)).rejects.toThrow('Invalid type');
    });

    it('should return tool metadata correctly', () => {
      const tool = calculatePensionTool;
      const metadata = tool.getToolMetadata();
      
      expect(metadata).toEqual({
        name: 'calculate_pension',
        description: 'Calculate pension benefits based on salary, years of service, and retirement age',
        inputs: tool.inputs
      });
    });
  });

  describe('ToolRegistry', () => {
    let registry: ToolRegistry;

    beforeEach(() => {
      registry = new ToolRegistry();
    });

    it('should register and retrieve tools correctly', () => {
      registry.register(calculatePensionTool);
      
      expect(registry.hasTool('calculate_pension')).toBe(true);
      expect(registry.getTool('calculate_pension')).toBe(calculatePensionTool);
    });

    it('should throw error when registering duplicate tools', () => {
      registry.register(calculatePensionTool);
      
      expect(() => {
        registry.register(calculatePensionTool);
      }).toThrow('already registered');
    });

    it('should register multiple tools at once', () => {
      const tools = [calculatePensionTool, healthInsuranceLookupTool];
      registry.registerAll(tools);
      
      expect(registry.size()).toBe(2);
      expect(registry.getToolNames()).toEqual(['calculate_pension', 'health_insurance_lookup']);
    });

    it('should get required tool or throw error', () => {
      registry.register(calculatePensionTool);
      
      expect(registry.getRequiredTool('calculate_pension')).toBe(calculatePensionTool);
      expect(() => {
        registry.getRequiredTool('nonexistent_tool');
      }).toThrow('not found in registry');
    });

    it('should create sub-registry correctly', () => {
      registry.registerAll([calculatePensionTool, healthInsuranceLookupTool, ptoBalanceLookupTool]);
      
      const subRegistry = registry.createSubRegistry(['calculate_pension', 'pto_balance_lookup']);
      
      expect(subRegistry.size()).toBe(2);
      expect(subRegistry.hasTool('calculate_pension')).toBe(true);
      expect(subRegistry.hasTool('pto_balance_lookup')).toBe(true);
      expect(subRegistry.hasTool('health_insurance_lookup')).toBe(false);
    });

    it('should clear registry correctly', () => {
      registry.register(calculatePensionTool);
      expect(registry.size()).toBe(1);
      
      registry.clear();
      expect(registry.size()).toBe(0);
    });
  });

  describe('Tool Implementations', () => {
    describe('CalculatePensionTool', () => {
      it('should process valid pension calculation', async () => {
        const result = await calculatePensionTool.call({
          current_salary: 100000,
          years_of_service: 15,
          retirement_age: 65,
          pension_plan_type: 'defined_benefit'
        });
        
        const parsed = JSON.parse(result);
        expect(parsed.input.current_salary).toBe(100000);
        expect(parsed.input.years_of_service).toBe(15);
        expect(parsed.input.retirement_age).toBe(65);
        expect(parsed.input.pension_plan_type).toBe('defined_benefit');
      });
    });

    describe('FsaHsaCalculatorTool', () => {
      it('should calculate FSA recommendations correctly', async () => {
        const result = await fsaHsaCalculatorTool.call({
          expected_medical_expenses: 4000,
          account_type: 'fsa'
        });
        
        const parsed = JSON.parse(result);
        expect(parsed.input.expected_medical_expenses).toBe(4000);
        expect(parsed.input.account_type).toBe('fsa');
        expect(parsed.recommendations).toHaveProperty('fsa');
        expect(parsed.assumptions.fsa_cap).toBe(3150);
      });

      it('should calculate HSA recommendations correctly', async () => {
        const result = await fsaHsaCalculatorTool.call({
          expected_medical_expenses: 3000,
          account_type: 'hsa',
          current_age: 30
        });
        
        const parsed = JSON.parse(result);
        expect(parsed.input.account_type).toBe('hsa');
        expect(parsed.recommendations).toHaveProperty('hsa');
        expect(parsed.assumptions.hsa_cap_individual).toBe(4150);
      });

      it('should handle both FSA and HSA recommendations', async () => {
        const result = await fsaHsaCalculatorTool.call({
          expected_medical_expenses: 5000,
          account_type: 'both'
        });
        
        const parsed = JSON.parse(result);
        expect(parsed.recommendations).toHaveProperty('fsa');
        expect(parsed.recommendations).toHaveProperty('hsa');
        expect(parsed.rationale).toHaveProperty('fsa');
        expect(parsed.rationale).toHaveProperty('hsa');
      });
    });

    describe('HealthInsuranceLookupTool', () => {
      it('should process health insurance lookup', async () => {
        const result = await healthInsuranceLookupTool.call({
          plan_id: 'PPO-001',
          employee_tier: 'family',
          state: 'CA'
        });
        
        const parsed = JSON.parse(result);
        expect(parsed.input.plan_id).toBe('PPO-001');
        expect(parsed.input.employee_tier).toBe('family');
        expect(parsed.input.state).toBe('CA');
      });

      it('should handle optional state parameter', async () => {
        const result = await healthInsuranceLookupTool.call({
          plan_id: 'HMO-001',
          employee_tier: 'individual'
        });
        
        const parsed = JSON.parse(result);
        expect(parsed.input.plan_id).toBe('HMO-001');
        expect(parsed.input.employee_tier).toBe('individual');
        expect(parsed.input.state).toBeUndefined();
      });
    });
  });

  describe('ToolFactory', () => {
    it('should create dynamic tools correctly', async () => {
      const dynamicTool = ToolFactory.createTool({
        name: 'test_tool',
        description: 'Test tool',
        inputs: [
          {
            name: 'test_input',
            type: InputType.STRING,
            description: 'Test input',
            required: true
          }
        ],
        implementation: async (kwargs) => {
          return JSON.stringify({ received: kwargs.test_input });
        }
      });
      
      expect(dynamicTool.name).toBe('test_tool');
      expect(dynamicTool.description).toBe('Test tool');
      
      const result = await dynamicTool.call({ test_input: 'hello' });
      expect(JSON.parse(result)).toEqual({ received: 'hello' });
    });

    it('should create simple tools correctly', async () => {
      const simpleTool = ToolFactory.createSimpleTool(
        'simple_test',
        'Simple test tool',
        [
          {
            name: 'value',
            type: InputType.INTEGER,
            description: 'A value',
            required: true
          }
        ],
        async (kwargs) => {
          return { doubled: kwargs.value * 2 };
        }
      );
      
      const result = await simpleTool.call({ value: 21 });
      expect(JSON.parse(result)).toEqual({ doubled: 42 });
    });
  });

  describe('ToolBuilder', () => {
    it('should build tools fluently', async () => {
      const tool = new ToolBuilder()
        .name('builder_test')
        .description('Tool built with builder pattern')
        .addInput('input1', InputType.STRING, 'First input')
        .addInput('input2', InputType.INTEGER, 'Second input', false)
        .implementation(async (kwargs) => {
          return JSON.stringify({
            input1: kwargs.input1,
            input2: kwargs.input2 || 'not provided'
          });
        })
        .build();
      
      expect(tool.name).toBe('builder_test');
      expect(tool.inputs).toHaveLength(2);
      expect(tool.inputs[0]?.required).toBe(true);
      expect(tool.inputs[1]?.required).toBe(false);
      
      const result = await tool.call({ input1: 'test' });
      expect(JSON.parse(result)).toEqual({
        input1: 'test',
        input2: 'not provided'
      });
    });

    it('should throw error for missing required configuration', () => {
      expect(() => {
        new ToolBuilder().build();
      }).toThrow('Tool name is required');
      
      expect(() => {
        new ToolBuilder().name('test').build();
      }).toThrow('Tool description is required');
      
      expect(() => {
        new ToolBuilder().name('test').description('test').build();
      }).toThrow('Tool implementation is required');
    });
  });

  describe('ToolUtils', () => {
    it('should create mock tools correctly', async () => {
      const mockTool = ToolUtils.createMockTool('mock_test', 'Mock tool', { result: 'mocked' });
      
      const result = await mockTool.call({});
      expect(JSON.parse(result)).toEqual({ result: 'mocked' });
    });

    it('should create echo tools correctly', async () => {
      const echoTool = ToolUtils.createEchoTool('echo_test', [
        {
          name: 'message',
          type: InputType.STRING,
          description: 'Message to echo',
          required: true
        }
      ]);
      
      const result = await echoTool.call({ message: 'hello world' });
      const parsed = JSON.parse(result);
      
      expect(parsed.tool).toBe('echo_test');
      expect(parsed.inputs.message).toBe('hello world');
      expect(parsed.timestamp).toBeTruthy();
    });

    it('should validate required tools correctly', () => {
      expect(() => {
        ToolUtils.validateRequiredTools(['calculate_pension', 'nonexistent_tool']);
      }).toThrow('Required tools not found: nonexistent_tool');
    });

    it('should generate tool statistics correctly', () => {
      const stats = ToolUtils.getToolStats();
      
      expect(stats.totalTools).toBeGreaterThan(0);
      expect(stats.toolNames).toContain('calculate_pension');
      expect(stats.toolNames).toContain('fsa_hsa_calculator');
      expect(stats.inputTypeDistribution).toHaveProperty(InputType.STRING);
      expect(stats.inputTypeDistribution).toHaveProperty(InputType.FLOAT);
    });
  });

  describe('Global Tool Registry', () => {
    it('should have all tools registered by default', () => {
      const toolNames = getAvailableToolNames();
      expect(toolNames).toContain('calculate_pension');
      expect(toolNames).toContain('health_insurance_lookup');
      expect(toolNames).toContain('benefits_enrollment');
      expect(toolNames).toContain('pto_balance_lookup');
      expect(toolNames).toContain('fsa_hsa_calculator');
    });

    it('should retrieve tools from global registry', () => {
      const tool = getTool('calculate_pension');
      expect(tool).toBeTruthy();
      expect(tool?.name).toBe('calculate_pension');
    });

    it('should return all tools from global registry', () => {
      const tools = getAllTools();
      expect(tools.length).toBeGreaterThanOrEqual(5);
      expect(tools.map(t => t.name)).toContain('calculate_pension');
    });
  });
});