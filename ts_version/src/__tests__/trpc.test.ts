// Comprehensive tests for tRPC API
import { TRPCError } from '@trpc/server';
import { appRouter } from '../server/router';
import { getAvailableAgentNames, getAgents } from '../agents';
import { createClient } from '../temporal';
import { getPresignedUrls } from '../utils';

// Mock dependencies
jest.mock('../agents');
jest.mock('../temporal');
jest.mock('../utils');

const mockGetAvailableAgentNames = getAvailableAgentNames as jest.MockedFunction<typeof getAvailableAgentNames>;
const mockGetAgents = getAgents as jest.MockedFunction<typeof getAgents>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetPresignedUrls = getPresignedUrls as jest.MockedFunction<typeof getPresignedUrls>;

describe('tRPC Router Tests', () => {
  const caller = appRouter.createCaller({
    req: {} as any,
    res: {} as any,
    user: null
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAvailableAgentNames.mockReturnValue(['benefits']);
    mockGetAgents.mockReturnValue([{
      name: 'benefits',
      system_prompt: 'Test system prompt',
      tools: [],
      llm_provider: 'openai',
      model: 'gpt-4o'
    }]);
  });

  describe('getAvailableAgents', () => {
    it('should return available agents', async () => {
      const result = await caller.getAvailableAgents();
      
      expect(result).toEqual({
        agents: ['benefits'],
        count: 1
      });
      expect(mockGetAvailableAgentNames).toHaveBeenCalledTimes(1);
    });
  });

  describe('health', () => {
    it('should return health status', async () => {
      const result = await caller.health();
      
      expect(result.status).toBe('ok');
      expect(result.version).toBe('1.0.0');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('callAgent', () => {
    const validInput = {
      request_text: 'Test request',
      agent_names: ['benefits']
    };

    beforeEach(() => {
      // Mock successful workflow execution
      const mockWorkflow = {
        execute: jest.fn().mockResolvedValue('Test result')
      };
      const mockClient = {
        workflow: mockWorkflow
      };
      mockCreateClient.mockResolvedValue(mockClient as any);
    });

    it('should successfully call agent without files', async () => {
      const result = await caller.callAgent(validInput);
      
      expect(result).toEqual({
        request_text: 'Test request',
        request_files: [],
        result: 'Test result',
        status: 200
      });
      expect(mockCreateClient).toHaveBeenCalledTimes(1);
    });

    it('should successfully call agent with files', async () => {
      mockGetPresignedUrls.mockResolvedValue(['https://example.com/file1']);
      
      const inputWithFiles = {
        ...validInput,
        request_files: [{
          filename: 'test.txt',
          content: Buffer.from('test content').toString('base64'),
          contentType: 'text/plain'
        }]
      };
      
      const result = await caller.callAgent(inputWithFiles);
      
      expect(result).toEqual({
        request_text: 'Test request',
        request_files: ['https://example.com/file1'],
        result: 'Test result',
        status: 200
      });
      expect(mockGetPresignedUrls).toHaveBeenCalledWith([{
        filename: 'test.txt',
        content: Buffer.from('test content'),
        contentType: 'text/plain'
      }]);
    });

    it('should throw error for invalid agent names', async () => {
      const invalidInput = {
        ...validInput,
        agent_names: ['invalid_agent']
      };
      
      await expect(caller.callAgent(invalidInput)).rejects.toThrow(
        expect.objectContaining({
          code: 'BAD_REQUEST',
          message: expect.stringContaining('Invalid agent names: invalid_agent')
        })
      );
    });

    it('should throw error when file upload fails', async () => {
      mockGetPresignedUrls.mockRejectedValue(new Error('Upload failed'));
      
      const inputWithFiles = {
        ...validInput,
        request_files: [{
          filename: 'test.txt',
          content: Buffer.from('test content').toString('base64')
        }]
      };
      
      await expect(caller.callAgent(inputWithFiles)).rejects.toThrow(
        expect.objectContaining({
          code: 'BAD_REQUEST',
          message: 'File upload failed: Upload failed'
        })
      );
    });

    it('should throw error when Temporal client creation fails', async () => {
      mockCreateClient.mockRejectedValue(new Error('Temporal connection failed'));
      
      await expect(caller.callAgent(validInput)).rejects.toThrow(
        expect.objectContaining({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to connect to Temporal: Temporal connection failed'
        })
      );
    });

    it('should throw error when workflow execution fails', async () => {
      const mockWorkflow = {
        execute: jest.fn().mockRejectedValue(new Error('Workflow failed'))
      };
      const mockClient = {
        workflow: mockWorkflow
      };
      mockCreateClient.mockResolvedValue(mockClient as any);
      
      await expect(caller.callAgent(validInput)).rejects.toThrow(
        expect.objectContaining({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Workflow execution failed: Workflow failed'
        })
      );
    });

    it('should handle unknown errors gracefully', async () => {
      mockCreateClient.mockRejectedValue('Unknown error');
      
      await expect(caller.callAgent(validInput)).rejects.toThrow(
        expect.objectContaining({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to connect to Temporal: Unknown error'
        })
      );
    });

    it('should validate workflow input structure', async () => {
      const mockWorkflow = {
        execute: jest.fn().mockResolvedValue('Test result')
      };
      const mockClient = {
        workflow: mockWorkflow
      };
      mockCreateClient.mockResolvedValue(mockClient as any);
      
      await caller.callAgent(validInput);
      
      expect(mockWorkflow.execute).toHaveBeenCalledWith(
        expect.any(Function), // AgentWorkflow function
        expect.objectContaining({
          args: [expect.objectContaining({
            request_text: 'Test request',
            request_files: [],
            agents: expect.arrayContaining([
              expect.objectContaining({
                name: 'benefits',
                system_prompt: expect.any(String),
                tools: expect.any(Array),
                llm_provider: expect.any(String),
                model: expect.any(String)
              })
            ])
          })],
          workflowId: expect.stringMatching(/^agent-workflow-Test request-\d+$/),
          taskQueue: 'agent-task-queue'
        })
      );
    });
  });

  describe('Input validation', () => {
    it('should validate required fields', async () => {
      await expect(caller.callAgent({} as any)).rejects.toThrow();
    });

    it('should validate agent_names array', async () => {
      await expect(caller.callAgent({
        request_text: 'Test',
        agent_names: 'not-an-array' as any
      })).rejects.toThrow();
    });

    it('should validate request_files structure', async () => {
      await expect(caller.callAgent({
        request_text: 'Test',
        agent_names: ['benefits'],
        request_files: [{ invalid: 'structure' }] as any
      })).rejects.toThrow();
    });
  });
});