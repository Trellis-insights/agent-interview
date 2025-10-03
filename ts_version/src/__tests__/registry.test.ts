// Tests for enhanced registry patterns and factory implementations
import { 
  getGlobalAgentRegistry, 
  AgentFactory, 
  AgentRegistry 
} from '../agents/AgentRegistry';
import { getGlobalRegistry, ToolRegistry } from '../tools/base/ToolRegistry';
import { toolFactory, ToolFactory } from '../tools/registry';
import { benefitsAgent } from '../agents/benefits';
import { calculatePensionTool } from '../tools/implementations';
import { Agent, LLMProvider, OpenAIModel } from '../types';

// Import registries to ensure initialization
import '../agents/registry';
import '../tools/registry';

describe('Registry Patterns Tests', () => {
  describe('AgentRegistry', () => {
    let registry: AgentRegistry;
    
    beforeEach(() => {
      registry = new AgentRegistry();
    });

    it('should register and retrieve agents', () => {
      registry.register(benefitsAgent);
      
      expect(registry.hasAgent('benefits')).toBe(true);
      expect(registry.getAgent('benefits')).toBe(benefitsAgent);
      expect(registry.getAgentNames()).toContain('benefits');
    });

    it('should throw error when registering duplicate agents', () => {
      registry.register(benefitsAgent);
      
      expect(() => {
        registry.register(benefitsAgent);
      }).toThrow('Agent with name \'benefits\' is already registered');
    });

    it('should throw error for non-existent agents', () => {
      expect(() => {
        registry.getRequiredAgent('nonexistent');
      }).toThrow('Agent \'nonexistent\' not found');
    });

    it('should return agent metadata', () => {
      registry.register(benefitsAgent);
      const metadata = registry.getAgentMetadata();
      
      expect(metadata).toHaveLength(1);
      expect(metadata[0]).toMatchObject({
        name: 'benefits',
        toolCount: expect.any(Number),
        llm_provider: 'OPENAI',
        model: 'gpt-4o'
      });
    });

    it('should filter agents by provider', () => {
      registry.register(benefitsAgent);
      const openaiAgents = registry.getAgentsByProvider(LLMProvider.OPENAI);
      
      expect(openaiAgents).toHaveLength(1);
      expect(openaiAgents[0]?.name).toBe('benefits');
    });

    it('should create sub-registry', () => {
      registry.register(benefitsAgent);
      const subRegistry = registry.createSubRegistry(['benefits']);
      
      expect(subRegistry.size()).toBe(1);
      expect(subRegistry.hasAgent('benefits')).toBe(true);
    });

    it('should validate agent structure', () => {
      const invalidAgent = {
        name: '',  // Invalid: empty name
        system_prompt: 'Test prompt',
        tools: [],
        llm_provider: LLMProvider.OPENAI,
        model: OpenAIModel.GPT_4O
      } as Agent;

      expect(() => {
        registry.register(invalidAgent);
      }).toThrow('Agent name must be a non-empty string');
    });

    it('should create agent with subset of tools', () => {
      registry.register(benefitsAgent);
      
      // Assuming benefitsAgent has tools, create a subset
      const originalToolCount = benefitsAgent.tools.length;
      if (originalToolCount > 0 && benefitsAgent.tools[0]) {
        const firstToolName = benefitsAgent.tools[0].name;
        const newAgent = registry.createAgentWithTools('benefits', 'benefits-minimal', [firstToolName]);
        
        expect(newAgent.name).toBe('benefits-minimal');
        expect(newAgent.tools).toHaveLength(1);
        expect(newAgent.tools[0]?.name).toBe(firstToolName);
      }
    });
  });

  describe('AgentFactory', () => {
    let registry: AgentRegistry;
    let factory: AgentFactory;

    beforeEach(() => {
      registry = new AgentRegistry();
      registry.register(benefitsAgent);
      factory = new AgentFactory(registry);
    });

    it('should create simplified agent', () => {
      if (benefitsAgent.tools.length > 0 && benefitsAgent.tools[0]) {
        const toolName = benefitsAgent.tools[0].name;
        const simplified = factory.createSimplifiedAgent('benefits', 'benefits-simple', [toolName]);
        
        expect(simplified.name).toBe('benefits-simple');
        expect(simplified.tools).toHaveLength(1);
      }
    });

    it('should clone agent with modifications', () => {
      const cloned = factory.cloneAgent('benefits', 'benefits-clone', {
        system_prompt: 'Modified prompt'
      });
      
      expect(cloned.name).toBe('benefits-clone');
      expect(cloned.system_prompt).toBe('Modified prompt');
      expect(cloned.tools).toEqual(benefitsAgent.tools);
    });

    it('should create hybrid agent', () => {
      const hybrid = factory.createHybridAgent(
        'hybrid-agent',
        'Combined agent',
        ['benefits'],
        LLMProvider.OPENAI,
        OpenAIModel.GPT_4O
      );
      
      expect(hybrid.name).toBe('hybrid-agent');
      expect(hybrid.system_prompt).toBe('Combined agent');
      expect(hybrid.llm_provider).toBe(LLMProvider.OPENAI);
    });
  });

  describe('ToolRegistry', () => {
    let registry: ToolRegistry;

    beforeEach(() => {
      registry = new ToolRegistry();
    });

    it('should register and retrieve tools', () => {
      registry.register(calculatePensionTool);
      
      expect(registry.hasTool('calculate_pension')).toBe(true);
      expect(registry.getTool('calculate_pension')).toBe(calculatePensionTool);
    });

    it('should throw error when registering duplicate tools', () => {
      registry.register(calculatePensionTool);
      
      expect(() => {
        registry.register(calculatePensionTool);
      }).toThrow('Tool with name \'calculate_pension\' is already registered');
    });

    it('should create sub-registry', () => {
      registry.register(calculatePensionTool);
      const subRegistry = registry.createSubRegistry(['calculate_pension']);
      
      expect(subRegistry.size()).toBe(1);
      expect(subRegistry.hasTool('calculate_pension')).toBe(true);
    });

    it('should return tool metadata', () => {
      registry.register(calculatePensionTool);
      const metadata = registry.getToolMetadata();
      
      expect(metadata).toHaveLength(1);
      expect(metadata[0]).toMatchObject({
        name: 'calculate_pension',
        description: expect.any(String),
        inputs: expect.any(Array)
      });
    });
  });

  describe('ToolFactory', () => {
    let factory: ToolFactory;

    beforeEach(() => {
      factory = new ToolFactory();
    });

    it('should get benefits tools', () => {
      const benefitsTools = factory.getBenefitsTools();
      expect(benefitsTools.length).toBeGreaterThan(0);
      
      // Check that all returned tools are benefits-related
      benefitsTools.forEach(tool => {
        expect(tool.name).toMatch(/benefits|pension|insurance|pto|fsa|hsa/i);
      });
    });

    it('should get calculation tools', () => {
      const calcTools = factory.getCalculationTools();
      expect(calcTools.length).toBeGreaterThan(0);
      
      calcTools.forEach(tool => {
        expect(tool.name).toMatch(/calculate|calculator/i);
      });
    });

    it('should get lookup tools', () => {
      const lookupTools = factory.getLookupTools();
      expect(lookupTools.length).toBeGreaterThan(0);
      
      lookupTools.forEach(tool => {
        expect(tool.name).toMatch(/lookup/i);
      });
    });

    it('should create tool set by names', () => {
      const toolSet = factory.createToolSet(['calculate_pension']);
      expect(toolSet.length).toBe(1);
      expect(toolSet[0]?.name).toBe('calculate_pension');
    });

    it('should get tools by pattern', () => {
      const pensionTools = factory.getToolsByPattern(/pension/i);
      expect(pensionTools.length).toBeGreaterThan(0);
      
      pensionTools.forEach(tool => {
        expect(tool.name).toMatch(/pension/i);
      });
    });
  });

  describe('Global Registries Integration', () => {
    it('should have initialized global agent registry', () => {
      const globalRegistry = getGlobalAgentRegistry();
      expect(globalRegistry.hasAgent('benefits')).toBe(true);
    });

    it('should have initialized global tool registry', () => {
      const globalRegistry = getGlobalRegistry();
      expect(globalRegistry.size()).toBeGreaterThan(0);
      expect(globalRegistry.hasTool('calculate_pension')).toBe(true);
    });

    it('should work with tool factory', () => {
      expect(toolFactory).toBeInstanceOf(ToolFactory);
      expect(toolFactory.getBenefitsTools().length).toBeGreaterThan(0);
    });
  });

  describe('Registry Validation and Error Handling', () => {
    it('should handle empty tool sets gracefully', () => {
      const factory = new ToolFactory();
      const emptySet = factory.createToolSet(['non-existent-tool']);
      expect(emptySet).toHaveLength(0);
    });

    it('should handle empty agent lists gracefully', () => {
      const registry = new AgentRegistry();
      expect(registry.getAgentNames()).toHaveLength(0);
      expect(registry.getAllAgents()).toHaveLength(0);
    });

    it('should clear registries properly', () => {
      const registry = new AgentRegistry();
      registry.register(benefitsAgent);
      expect(registry.size()).toBe(1);
      
      registry.clear();
      expect(registry.size()).toBe(0);
    });
  });
});