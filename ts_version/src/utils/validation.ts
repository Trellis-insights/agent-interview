// Validation utility functions
import { z } from 'zod';

export class ValidationError extends Error {
  constructor(message: string, public errors: z.ZodError) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Generic validation function
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(
      `Validation failed: ${result.error.message}`,
      result.error
    );
  }
  return result.data;
}

// Async validation function for promise-based validation
export async function validateSchemaAsync<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): Promise<T> {
  const result = await schema.safeParseAsync(data);
  if (!result.success) {
    throw new ValidationError(
      `Async validation failed: ${result.error.message}`,
      result.error
    );
  }
  return result.data;
}

// Validation middleware helper for Express
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      req.validatedData = validateSchema(schema, req.body);
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.errors
        });
      }
      throw error;
    }
  };
}

// Type guard helpers
export function isValidSchema<T>(schema: z.ZodSchema<T>, data: unknown): data is T {
  return schema.safeParse(data).success;
}

// Specific validation functions for agent requests
export function validateAgentRequest(data: any): void {
  if (!data || typeof data !== 'object') {
    throw new Error('Request must be an object');
  }

  if (!data.request_text || typeof data.request_text !== 'string' || data.request_text.trim() === '') {
    throw new Error('request_text must be a non-empty string');
  }

  if (!Array.isArray(data.agent_names)) {
    throw new Error('agent_names must be an array');
  }

  if (data.agent_names.length === 0) {
    throw new Error('agent_names must be a non-empty array');
  }

  if (data.request_files !== undefined && !Array.isArray(data.request_files)) {
    throw new Error('request_files must be an array if provided');
  }
}

export function validateCallAgentRequest(data: any): void {
  validateAgentRequest(data);

  if (data.request_files) {
    for (const file of data.request_files) {
      if (!file.filename || typeof file.filename !== 'string' || file.filename.trim() === '') {
        throw new Error('Each file must have a non-empty filename');
      }

      if (!file.content || typeof file.content !== 'string') {
        throw new Error('Each file must have content as a string');
      }
    }
  }
}