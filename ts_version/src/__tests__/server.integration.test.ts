// Integration tests for HTTP server with tRPC
import request from 'supertest';
import { app } from '../server';
import { getAvailableAgentNames, getAgents } from '../agents';
import { createClient } from '../temporal';

// Mock dependencies for integration tests
jest.mock('../agents');
jest.mock('../temporal');
jest.mock('../utils', () => ({
  getPresignedUrls: jest.fn().mockResolvedValue([])
}));

const mockGetAvailableAgentNames = getAvailableAgentNames as jest.MockedFunction<typeof getAvailableAgentNames>;
const mockGetAgents = getAgents as jest.MockedFunction<typeof getAgents>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('HTTP Server Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAvailableAgentNames.mockReturnValue(['benefits']);
    mockGetAgents.mockReturnValue([{
      name: 'benefits',
      system_prompt: 'Test system prompt',
      tools: [],
      llm_provider: 'OPENAI',
      model: 'gpt-4o'
    }]);
    
    // Mock successful workflow execution
    const mockWorkflow = {
      execute: jest.fn().mockResolvedValue('Test result')
    };
    const mockClient = {
      workflow: mockWorkflow
    };
    mockCreateClient.mockResolvedValue(mockClient as any);
  });

  describe('Health endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        version: '1.0.0'
      });
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('tRPC endpoints', () => {
    describe('getAvailableAgents', () => {
      it('should return available agents via tRPC', async () => {
        const response = await request(app)
          .get('/api/trpc/getAvailableAgents')
          .expect(200);

        expect(response.body).toMatchObject({
          result: {
            data: {
              agents: ['benefits'],
              count: 1
            }
          }
        });
      });
    });

    describe('health via tRPC', () => {
      it('should return health status via tRPC', async () => {
        const response = await request(app)
          .get('/api/trpc/health')
          .expect(200);

        expect(response.body.result.data).toMatchObject({
          status: 'ok',
          version: '1.0.0'
        });
      });
    });

    describe('callAgent', () => {
      it('should successfully call agent via tRPC', async () => {
        const requestData = {
          request_text: 'Test request',
          agent_names: ['benefits']
        };

        const response = await request(app)
          .post('/api/trpc/callAgent')
          .send(requestData)
          .expect(200);

        expect(response.body.result.data).toMatchObject({
          request_text: 'Test request',
          request_files: [],
          result: 'Test result',
          status: 200
        });
      });

      it('should handle invalid agent names', async () => {
        const requestData = {
          request_text: 'Test request',
          agent_names: ['invalid_agent']
        };

        const response = await request(app)
          .post('/api/trpc/callAgent')
          .send(requestData)
          .expect(400);

        expect(response.body.error.message).toContain('Invalid agent names: invalid_agent');
      });

      it('should handle malformed requests', async () => {
        const response = await request(app)
          .post('/api/trpc/callAgent')
          .send({ invalid: 'data' })
          .expect(400);

        expect(response.body.error).toBeDefined();
      });

      it('should handle workflow execution failures', async () => {
        // Mock workflow failure
        const mockWorkflow = {
          execute: jest.fn().mockRejectedValue(new Error('Workflow failed'))
        };
        const mockClient = {
          workflow: mockWorkflow
        };
        mockCreateClient.mockResolvedValue(mockClient as any);

        const requestData = {
          request_text: 'Test request',
          agent_names: ['benefits']
        };

        const response = await request(app)
          .post('/api/trpc/callAgent')
          .send(requestData)
          .expect(500);

        expect(response.body.error.message).toContain('Workflow execution failed');
      });
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      await request(app)
        .options('/api/trpc/health')
        .expect(204);
    });

    it('should handle CORS requests properly', async () => {
      const response = await request(app)
        .get('/api/trpc/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      // CORS headers should be present when Origin is set
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('JSON parsing', () => {
    it('should handle large JSON payloads', async () => {
      const largeRequest = {
        request_text: 'x'.repeat(1000000), // 1MB string
        agent_names: ['benefits']
      };

      const response = await request(app)
        .post('/api/trpc/callAgent')
        .send(largeRequest)
        .expect(200);

      expect(response.body.result.data.request_text).toBe(largeRequest.request_text);
    });

    it('should reject invalid JSON', async () => {
      await request(app)
        .post('/api/trpc/callAgent')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });
});