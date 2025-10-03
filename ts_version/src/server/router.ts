// Main tRPC router - TypeScript translation of FastAPI endpoints
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router, publicProcedure } from './trpc';
import { 
  CallAgentRequestSchema, 
  CallAgentResponseSchema,
  AgentDefinition,
  AgentRequest,
  Tool as ToolType
} from '../types';
import { getAgents, getAvailableAgentNames } from '../agents';
import { getPresignedUrls, FileUpload } from '../utils';
import { createClient } from '../temporal';
import { AgentWorkflow } from '../temporal';

// Enhanced CallAgentRequest schema for tRPC with file upload support
const CallAgentRequestTRPC = CallAgentRequestSchema.extend({
  request_files: z.array(z.object({
    filename: z.string(),
    content: z.string(), // Base64 encoded content for JSON transport
    contentType: z.string().optional()
  })).optional()
});

/**
 * Main application router
 */
export const appRouter = router({
  /**
   * Call agent procedure - TypeScript translation of /call-agent endpoint
   */
  callAgent: publicProcedure
    .input(CallAgentRequestTRPC)
    .output(CallAgentResponseSchema)
    .mutation(async ({ input }) => {
      try {
        // Validate input
        const { request_text, agent_names, request_files } = input;

        // Validate agent names
        const availableAgents = getAvailableAgentNames();
        const invalidAgents = agent_names.filter(name => !availableAgents.includes(name));
        if (invalidAgents.length > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid agent names: ${invalidAgents.join(', ')}. Available agents: ${availableAgents.join(', ')}`
          });
        }

        // Process file uploads if provided
        let presignedUrls: string[] = [];
        if (request_files && request_files.length > 0) {
          try {
            const fileUploads: FileUpload[] = request_files.map(file => ({
              filename: file.filename,
              content: Buffer.from(file.content, 'base64'),
              ...(file.contentType && { contentType: file.contentType })
            }));
            
            presignedUrls = await getPresignedUrls(fileUploads);
          } catch (error) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
          }
        }

        // Get agents by names
        let agents;
        try {
          agents = getAgents(agent_names);
        } catch (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error instanceof Error ? error.message : 'Failed to get agents'
          });
        }

        // Connect to Temporal and execute workflow
        let client;
        try {
          client = await createClient();
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to connect to Temporal: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }

        // Create workflow input with presigned URLs and agents
        const agentRequest: AgentRequest = {
          request_text,
          request_files: presignedUrls,
          agents: agents.map(agent => ({
            name: agent.name,
            system_prompt: agent.system_prompt,
            tools: agent.tools.map(tool => ({
              name: tool.name,
              description: tool.description,
              inputs: tool.inputs
            } as ToolType)),
            llm_provider: agent.llm_provider,
            model: agent.model
          } as AgentDefinition))
        };

        // Execute workflow
        let result: string;
        try {
          result = await client.workflow.execute(AgentWorkflow, {
            args: [agentRequest],
            workflowId: `agent-workflow-${request_text.substring(0, 20)}-${Date.now()}`,
            taskQueue: 'agent-task-queue'
          });
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Workflow execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }

        return {
          request_text,
          request_files: presignedUrls,
          result,
          status: 200
        };

      } catch (error) {
        // Re-throw tRPC errors as-is
        if (error instanceof TRPCError) {
          throw error;
        }

        // Convert unknown errors to tRPC errors
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    }),

  /**
   * Get available agents procedure
   */
  getAvailableAgents: publicProcedure
    .output(z.object({
      agents: z.array(z.string()),
      count: z.number()
    }))
    .query(() => {
      const agents = getAvailableAgentNames();
      return {
        agents,
        count: agents.length
      };
    }),

  /**
   * Health check procedure
   */
  health: publicProcedure
    .output(z.object({
      status: z.string(),
      timestamp: z.string(),
      version: z.string()
    }))
    .query(() => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
    })
});

// Export the router type for client usage
export type AppRouter = typeof appRouter;