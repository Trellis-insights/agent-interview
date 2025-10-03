// tRPC context creation - handles request context and authentication
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';

/**
 * Create context for tRPC requests
 * This is called for each request and provides the context object to all procedures
 */
export function createContext({ req, res }: CreateExpressContextOptions) {
  return {
    req,
    res,
    // Add any authentication or user context here
    user: null, // Placeholder for future authentication
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;