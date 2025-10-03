// tRPC server setup and configuration
import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';

// Create context for tRPC
export interface Context {
  // Add any context data you need (user info, request headers, etc.)
}

export const createContext = (): Context => {
  return {};
};

// Initialize tRPC with context
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        code: error.code,
        httpStatus: getHTTPStatusCodeFromError(error),
      },
    };
  },
});

// Helper function to map tRPC errors to HTTP status codes
function getHTTPStatusCodeFromError(error: TRPCError): number {
  switch (error.code) {
    case 'BAD_REQUEST':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'METHOD_NOT_SUPPORTED':
      return 405;
    case 'TIMEOUT':
      return 408;
    case 'CONFLICT':
      return 409;
    case 'PRECONDITION_FAILED':
      return 412;
    case 'PAYLOAD_TOO_LARGE':
      return 413;
    case 'UNPROCESSABLE_CONTENT':
      return 422;
    case 'TOO_MANY_REQUESTS':
      return 429;
    case 'CLIENT_CLOSED_REQUEST':
      return 499;
    case 'INTERNAL_SERVER_ERROR':
      return 500;
    default:
      return 500;
  }
}

// Export reusable pieces
export const router = t.router;
export const procedure = t.procedure;
export const middleware = t.middleware;

// Create a reusable error handling middleware
export const errorHandlerMiddleware = middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    console.error('tRPC Error:', error);
    
    if (error instanceof TRPCError) {
      throw error;
    }
    
    // Convert unknown errors to tRPC errors
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      cause: error,
    });
  }
});

// Create public procedure with error handling
export const publicProcedure = procedure.use(errorHandlerMiddleware);