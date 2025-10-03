// TypeScript translation of temporal/activities/say_hello.py
import { Context, log } from '@temporalio/activity';

/**
 * Simple hello activity that acknowledges the request
 * @param name - Request text to include in greeting
 * @returns Greeting message
 */
export async function sayHello(name: string): Promise<string> {
  // Only log when in activity context (not during unit tests)
  try {
    Context.current();
    log.info('sayHello activity called', { name });
  } catch {
    // Not in activity context (e.g., unit test)
  }
  
  const result = `Hello World! Request: ${name}`;
  
  try {
    Context.current();
    log.info('sayHello activity completed', { result });
  } catch {
    // Not in activity context (e.g., unit test)
  }
  
  return result;
}