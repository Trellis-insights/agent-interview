// Comprehensive tests for enhanced LLM integration
import {
  invokeOpenAI,
  invokeOpenAILoop,
  OpenAIError,
  OpenAIRateLimitError,
  OpenAIQuotaError,
  OpenAIAuthenticationError
} from '../llm/providers/openai';
import {
  convertToolsToOpenAI,
  inputTypeToOpenAIType,
  ToolConversionError,
  validateOpenAIFunction
} from '../llm/toolConverters/openai';
import { InputType } from '../types';
import { calculatePensionTool } from '../tools/implementations';

// Mock OpenAI
jest.mock('openai');
jest.mock('../tools', () => ({
  getTool: jest.fn()
}));
jest.mock('../utils', () => ({
  getEnvVar: jest.fn().mockReturnValue('test-api-key')
}));

const mockOpenAI = require('openai');
const { getTool } = require('../tools');

describe('Enhanced LLM Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('OpenAI Provider Error Handling', () => {
    it('should throw OpenAIAuthenticationError for 401 errors', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue({
              status: 401,
              message: 'Invalid API key'
            })
          }
        }
      };
      mockOpenAI.mockImplementation(() => mockClient);

      const messages = [{ role: 'user', content: 'Hello' }];

      await expect(invokeOpenAI(messages)).rejects.toThrow(OpenAIAuthenticationError);
      await expect(invokeOpenAI(messages)).rejects.toThrow('Authentication failed: Invalid API key');
    });

    it('should throw OpenAIRateLimitError for 429 errors', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue({
              status: 429,
              message: 'Rate limit exceeded'
            })
          }
        }
      };
      mockOpenAI.mockImplementation(() => mockClient);

      const messages = [{ role: 'user', content: 'Hello' }];

      await expect(invokeOpenAI(messages)).rejects.toThrow(OpenAIRateLimitError);
    });

    it('should throw OpenAIQuotaError for quota exceeded', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue({
              status: 429,
              code: 'insufficient_quota',
              message: 'You have exceeded your quota'
            })
          }
        }
      };
      mockOpenAI.mockImplementation(() => mockClient);

      const messages = [{ role: 'user', content: 'Hello' }];

      await expect(invokeOpenAI(messages)).rejects.toThrow(OpenAIQuotaError);
    });

    it('should handle server errors with appropriate error types', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue({
              status: 500,
              message: 'Internal server error'
            })
          }
        }
      };
      mockOpenAI.mockImplementation(() => mockClient);

      const messages = [{ role: 'user', content: 'Hello' }];

      await expect(invokeOpenAI(messages)).rejects.toThrow(OpenAIError);
      await expect(invokeOpenAI(messages)).rejects.toThrow('OpenAI server error');
    });

    it('should validate input messages', async () => {
      await expect(invokeOpenAI([])).rejects.toThrow('Input list cannot be empty');
      
      await expect(invokeOpenAI([{ role: 'user' }])).rejects.toThrow(
        'Messages must have content unless they are assistant messages with tool calls'
      );
    });

    it('should handle network errors', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue({
              code: 'ECONNREFUSED',
              message: 'Connection refused'
            })
          }
        }
      };
      mockOpenAI.mockImplementation(() => mockClient);

      const messages = [{ role: 'user', content: 'Hello' }];

      await expect(invokeOpenAI(messages)).rejects.toThrow('Network error: Connection refused');
    });
  });

  describe('OpenAI Provider Success Cases', () => {
    it('should handle successful API calls', async () => {
      const mockResponse = {
        choices: [{
          message: {
            role: 'assistant',
            content: 'Hello! How can I help you?'
          }
        }]
      };

      const mockClient = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      };
      mockOpenAI.mockImplementation(() => mockClient);

      const messages = [{ role: 'user', content: 'Hello' }];
      const result = await invokeOpenAI(messages);

      expect(result.output_text).toBe('Hello! How can I help you?');
      expect(result.function_calls).toHaveLength(0);
      expect(result.output_items).toHaveLength(1);
    });

    it('should handle function calls in responses', async () => {
      const mockResponse = {
        choices: [{
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: 'call_123',
              type: 'function',
              function: {
                name: 'calculate_pension',
                arguments: '{"age": 65, "salary": 80000}'
              }
            }]
          }
        }]
      };

      const mockClient = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      };
      mockOpenAI.mockImplementation(() => mockClient);

      const messages = [{ role: 'user', content: 'Calculate my pension' }];
      const result = await invokeOpenAI(messages);

      expect(result.function_calls).toHaveLength(1);
      expect(result.function_calls[0]).toEqual({
        name: 'calculate_pension',
        arguments: '{"age": 65, "salary": 80000}',
        call_id: 'call_123'
      });
    });

    it('should handle malformed response gracefully', async () => {
      const mockResponse = {
        choices: []
      };

      const mockClient = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      };
      mockOpenAI.mockImplementation(() => mockClient);

      const messages = [{ role: 'user', content: 'Hello' }];

      await expect(invokeOpenAI(messages)).rejects.toThrow('No choices returned in OpenAI response');
    });
  });

  describe('OpenAI Loop Function', () => {
    it('should handle successful loops without tool calls', async () => {
      const mockResponse = {
        choices: [{
          message: {
            role: 'assistant',
            content: 'Final answer'
          }
        }]
      };

      const mockClient = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      };
      mockOpenAI.mockImplementation(() => mockClient);

      const messages = [{ role: 'user', content: 'Hello' }];
      const result = await invokeOpenAILoop(messages);

      expect(result).toBe('Final answer');
    });

    it('should execute tools and continue the loop', async () => {
      const mockTool = {
        call: jest.fn().mockResolvedValue('{"result": "pension calculated: $2500/month"}')
      };
      getTool.mockReturnValue(mockTool);

      // First call with tool call, second call with final answer
      const mockClient = {
        chat: {
          completions: {
            create: jest.fn()
              .mockResolvedValueOnce({
                choices: [{
                  message: {
                    role: 'assistant',
                    content: null,
                    tool_calls: [{
                      id: 'call_123',
                      type: 'function',
                      function: {
                        name: 'calculate_pension',
                        arguments: '{"age": 65, "salary": 80000}'
                      }
                    }]
                  }
                }]
              })
              .mockResolvedValueOnce({
                choices: [{
                  message: {
                    role: 'assistant',
                    content: 'Based on the calculation, your pension would be $2500/month.'
                  }
                }]
              })
          }
        }
      };
      mockOpenAI.mockImplementation(() => mockClient);

      const messages = [{ role: 'user', content: 'Calculate my pension' }];
      const result = await invokeOpenAILoop(messages);

      expect(mockTool.call).toHaveBeenCalledWith({ age: 65, salary: 80000 });
      expect(result).toBe('Based on the calculation, your pension would be $2500/month.');
    });

    it('should handle tool execution errors gracefully', async () => {
      const mockTool = {
        call: jest.fn().mockRejectedValue(new Error('Tool execution failed'))
      };
      getTool.mockReturnValue(mockTool);

      const mockClient = {
        chat: {
          completions: {
            create: jest.fn()
              .mockResolvedValueOnce({
                choices: [{
                  message: {
                    role: 'assistant',
                    content: null,
                    tool_calls: [{
                      id: 'call_123',
                      type: 'function',
                      function: {
                        name: 'calculate_pension',
                        arguments: '{"age": 65, "salary": 80000}'
                      }
                    }]
                  }
                }]
              })
              .mockResolvedValueOnce({
                choices: [{
                  message: {
                    role: 'assistant',
                    content: 'Sorry, there was an error calculating your pension.'
                  }
                }]
              })
          }
        }
      };
      mockOpenAI.mockImplementation(() => mockClient);

      const messages = [{ role: 'user', content: 'Calculate my pension' }];
      const result = await invokeOpenAILoop(messages);

      expect(result).toBe('Sorry, there was an error calculating your pension.');
    });

    it('should retry on rate limit errors with exponential backoff', async () => {
      let callCount = 0;
      const mockClient = {
        chat: {
          completions: {
            create: jest.fn().mockImplementation(() => {
              callCount++;
              if (callCount <= 2) {
                const error = new Error('Rate limit exceeded');
                (error as any).status = 429;
                throw error;
              }
              return Promise.resolve({
                choices: [{
                  message: {
                    role: 'assistant',
                    content: 'Success after retry'
                  }
                }]
              });
            })
          }
        }
      };
      mockOpenAI.mockImplementation(() => mockClient);

      const messages = [{ role: 'user', content: 'Hello' }];
      const result = await invokeOpenAILoop(messages);

      expect(callCount).toBe(3);
      expect(result).toBe('Success after retry');
    });

    it('should handle max iterations gracefully', async () => {
      const mockTool = {
        call: jest.fn().mockResolvedValue('{"result": "tool executed"}')
      };
      getTool.mockReturnValue(mockTool);

      // Always return a tool call to force max iterations
      const mockClient = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [{
                    id: 'call_123',
                    type: 'function',
                    function: {
                      name: 'test_tool',
                      arguments: '{}'
                    }
                  }]
                }
              }]
            })
          }
        }
      };
      mockOpenAI.mockImplementation(() => mockClient);

      const messages = [{ role: 'user', content: 'Hello' }];
      const result = await invokeOpenAILoop(messages, [], 'gpt-4', 2);

      expect(result).toContain('Reached maximum 2 iterations');
    });
  });

  describe('Tool Conversion', () => {
    it('should convert InputType to OpenAI types correctly', () => {
      expect(inputTypeToOpenAIType(InputType.STRING)).toBe('string');
      expect(inputTypeToOpenAIType(InputType.INTEGER)).toBe('integer');
      expect(inputTypeToOpenAIType(InputType.FLOAT)).toBe('number');
      expect(inputTypeToOpenAIType(InputType.BOOLEAN)).toBe('boolean');
      expect(inputTypeToOpenAIType(InputType.LIST)).toBe('array');
      expect(inputTypeToOpenAIType(InputType.DICT)).toBe('object');
      expect(inputTypeToOpenAIType(InputType.ANY)).toBe('string');
    });

    it('should convert tools to OpenAI format successfully', () => {
      const mockTool = {
        name: 'test_tool',
        description: 'A test tool',
        inputs: [{
          name: 'param1',
          description: 'First parameter',
          type: InputType.STRING,
          required: true
        }, {
          name: 'param2',
          description: 'Second parameter',
          type: InputType.INTEGER,
          required: true
        }]
      };

      const result = convertToolsToOpenAI([mockTool]);

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('test_tool');
      expect(result[0]?.function.parameters.properties).toHaveProperty('param1');
      expect(result[0]?.function.parameters.properties).toHaveProperty('param2');
      expect(result[0]?.function.parameters.required).toEqual(['param1', 'param2']);
    });

    it('should throw ToolConversionError for invalid tools', () => {
      expect(() => convertToolsToOpenAI(null as any)).toThrow('Tools must be provided as an array');
      
      expect(() => convertToolsToOpenAI([null as any])).toThrow('Tool cannot be null or undefined');
      
      expect(() => convertToolsToOpenAI([{
        name: '',
        description: 'Test',
        inputs: []
      } as any])).toThrow('Tool name must be a non-empty string');
      
      expect(() => convertToolsToOpenAI([{
        name: 'test',
        description: '',
        inputs: []
      } as any])).toThrow('Tool description must be a non-empty string');
    });

    it('should detect duplicate tool names', () => {
      const tools = [
        { name: 'duplicate', description: 'First', inputs: [] },
        { name: 'duplicate', description: 'Second', inputs: [] }
      ];

      expect(() => convertToolsToOpenAI(tools as any)).toThrow("Duplicate tool name 'duplicate' found");
    });

    it('should detect duplicate input names within a tool', () => {
      const tool = {
        name: 'test_tool',
        description: 'Test tool',
        inputs: [
          { name: 'param', description: 'First param', type: InputType.STRING, required: true },
          { name: 'param', description: 'Duplicate param', type: InputType.STRING, required: true }
        ]
      };

      expect(() => convertToolsToOpenAI([tool as any])).toThrow('Duplicate input names found: param');
    });

    it('should validate OpenAI function format', () => {
      const validFunction = {
        type: 'function',
        name: 'test',
        description: 'Test function',
        function: {
          name: 'test',
          description: 'Test function',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
            additionalProperties: false
          }
        },
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      };

      expect(validateOpenAIFunction(validFunction)).toBe(true);

      expect(() => validateOpenAIFunction({} as any)).toThrow('OpenAI function must have a name');
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle malformed tool arguments gracefully', async () => {
      const mockTool = {
        call: jest.fn().mockResolvedValue('{"result": "success"}')
      };
      getTool.mockReturnValue(mockTool);

      const mockClient = {
        chat: {
          completions: {
            create: jest.fn()
              .mockResolvedValueOnce({
                choices: [{
                  message: {
                    role: 'assistant',
                    content: null,
                    tool_calls: [{
                      id: 'call_123',
                      type: 'function',
                      function: {
                        name: 'test_tool',
                        arguments: 'invalid json{'
                      }
                    }]
                  }
                }]
              })
              .mockResolvedValueOnce({
                choices: [{
                  message: {
                    role: 'assistant',
                    content: 'Handled the error and continued'
                  }
                }]
              })
          }
        }
      };
      mockOpenAI.mockImplementation(() => mockClient);

      const messages = [{ role: 'user', content: 'Test' }];
      const result = await invokeOpenAILoop(messages);

      expect(result).toBe('Handled the error and continued');
      expect(mockTool.call).not.toHaveBeenCalled();
    });

    it('should handle non-existent tools gracefully', async () => {
      getTool.mockReturnValue(null);

      const mockClient = {
        chat: {
          completions: {
            create: jest.fn()
              .mockResolvedValueOnce({
                choices: [{
                  message: {
                    role: 'assistant',
                    content: null,
                    tool_calls: [{
                      id: 'call_123',
                      type: 'function',
                      function: {
                        name: 'nonexistent_tool',
                        arguments: '{}'
                      }
                    }]
                  }
                }]
              })
              .mockResolvedValueOnce({
                choices: [{
                  message: {
                    role: 'assistant',
                    content: 'Tool not found, but I handled it'
                  }
                }]
              })
          }
        }
      };
      mockOpenAI.mockImplementation(() => mockClient);

      const messages = [{ role: 'user', content: 'Test' }];
      const result = await invokeOpenAILoop(messages);

      expect(result).toBe('Tool not found, but I handled it');
    });
  });
});