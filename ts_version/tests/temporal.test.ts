// Tests for Temporal activities (unit tests without workflow context)
import * as activities from '../src/temporal/activities';
import { 
  AgentDefinition, 
  LLMProvider, 
  OpenAIModel,
  InputType 
} from '../src/types';

describe('Temporal Activities', () => {
  describe('sayHello', () => {
    it('should return greeting with request text', async () => {
      const result = await activities.sayHello('test request');
      expect(result).toBe('Hello World! Request: test request');
    });

    it('should handle empty string', async () => {
      const result = await activities.sayHello('');
      expect(result).toBe('Hello World! Request: ');
    });
  });

  describe('invokeAgent', () => {
    const mockAgent: AgentDefinition = {
      name: 'test-agent',
      system_prompt: 'You are a helpful assistant',
      tools: [
        {
          name: 'test_tool',
          description: 'A test tool',
          inputs: [
            {
              name: 'input',
              type: InputType.STRING,
              description: 'Test input',
              required: true
            }
          ]
        }
      ],
      llm_provider: LLMProvider.OPENAI,
      model: OpenAIModel.GPT_4
    };

    it('should throw error when no agent provided', async () => {
      await expect(
        activities.invokeAgent('test request')
      ).rejects.toThrow('Agent must be provided');
    });

    it('should throw error for invalid LLM provider', async () => {
      const invalidAgent = {
        ...mockAgent,
        llm_provider: 'invalid_provider' as any
      };

      await expect(
        activities.invokeAgent('test request', [], invalidAgent)
      ).rejects.toThrow('Invalid llm_provider');
    });

    it('should throw error for unsupported OpenAI model', async () => {
      const invalidModelAgent = {
        ...mockAgent,
        model: 'invalid-model'
      };

      await expect(
        activities.invokeAgent('test request', [], invalidModelAgent)
      ).rejects.toThrow('Unsupported OpenAI model');
    });

    it('should throw error for Anthropic provider (not implemented)', async () => {
      const anthropicAgent = {
        ...mockAgent,
        llm_provider: LLMProvider.ANTHROPIC,
        model: 'claude-3-opus-20240229'
      };

      await expect(
        activities.invokeAgent('test request', [], anthropicAgent)
      ).rejects.toThrow('Anthropic tool conversion not yet implemented');
    });

    it('should throw error for Gemini provider (not implemented)', async () => {
      const geminiAgent = {
        ...mockAgent,
        llm_provider: LLMProvider.GEMINI,
        model: 'gemini-pro'
      };

      await expect(
        activities.invokeAgent('test request', [], geminiAgent)
      ).rejects.toThrow('Gemini tool conversion not yet implemented');
    });

    // Note: OpenAI integration test would require API key and would call actual API
    // In a production environment, you'd mock the OpenAI client for testing
  });

  describe('Module Exports', () => {
    it('should export worker and client creation functions', async () => {
      const { createWorker, createClient, runWorker } = await import('../src/temporal/worker');
      
      expect(createWorker).toBeDefined();
      expect(createClient).toBeDefined();
      expect(runWorker).toBeDefined();
    });

    it('should export workflow function', async () => {
      const { AgentWorkflow } = await import('../src/temporal/workflows/agent');
      
      expect(AgentWorkflow).toBeDefined();
      expect(typeof AgentWorkflow).toBe('function');
    });
  });
});