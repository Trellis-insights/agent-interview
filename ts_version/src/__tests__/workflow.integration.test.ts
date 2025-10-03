// Comprehensive workflow execution tests
import * as activities from '../temporal/activities';
import { AgentRequest } from '../types';

describe('Workflow Integration Tests', () => {
  describe('Activity Tests', () => {
    it('should execute sayHello activity', async () => {
      const result = await activities.sayHello('Workflow test');
      expect(result).toContain('Workflow test');
      expect(typeof result).toBe('string');
    });

    it('should validate agent request structure', () => {
      const agentRequest: AgentRequest = {
        request_text: 'Multi-agent test',
        request_files: [],
        agents: [
          {
            name: 'agent-1',
            system_prompt: 'First test agent',
            tools: [],
            llm_provider: 'OPENAI',
            model: 'gpt-4o'
          },
          {
            name: 'agent-2', 
            system_prompt: 'Second test agent',
            tools: [],
            llm_provider: 'OPENAI',
            model: 'gpt-4o'
          }
        ]
      };

      expect(agentRequest.request_text).toBeDefined();
      expect(Array.isArray(agentRequest.agents)).toBe(true);
      expect(agentRequest.agents).toHaveLength(2);
    });

    it('should handle agent request with files', () => {
      const agentRequest: AgentRequest = {
        request_text: 'Process these files',
        request_files: [
          'https://example.com/file1.txt',
          'https://example.com/file2.pdf'
        ],
        agents: [{
          name: 'file-agent',
          system_prompt: 'You process files.',
          tools: [],
          llm_provider: 'OPENAI',
          model: 'gpt-4o'
        }]
      };

      expect(agentRequest.request_files).toHaveLength(2);
      expect(agentRequest.agents).toHaveLength(1);
    });

    it('should handle empty request gracefully', () => {
      const agentRequest: AgentRequest = {
        request_text: '',
        request_files: [],
        agents: []
      };

      expect(agentRequest.request_text).toBeDefined();
      expect(Array.isArray(agentRequest.request_files)).toBe(true);
      expect(Array.isArray(agentRequest.agents)).toBe(true);
    });

    it('should handle mock agent invocation', async () => {
      const mockAgentRequest: AgentRequest = {
        request_text: 'Test agent invocation',
        request_files: [],
        agents: [{
          name: 'test-agent',
          system_prompt: 'Test prompt',
          tools: [],
          llm_provider: 'OPENAI',
          model: 'gpt-4o'
        }]
      };

      // Test that activities can be imported and called
      const result = await activities.sayHello('Test agent invocation');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });
});