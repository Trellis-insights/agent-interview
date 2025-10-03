# Python to TypeScript Translation Plan

## Project Overview
The `temporal-agent` project is a Python-based application that uses Temporal workflows with FastAPI to orchestrate AI agents. It consists of ~1,166 lines of code across 23 Python files.

### Current Architecture
- **Web Framework**: FastAPI
- **Workflow Engine**: Temporal.io Python SDK
- **AI Integration**: OpenAI SDK
- **Data Validation**: Pydantic
- **Key Components**:
  - FastAPI server with agent invocation endpoints
  - Temporal workflows for agent orchestration
  - Tool registry system with abstract base classes
  - Agent definitions and schema validation
  - File upload handling with presigned URLs

## Translation Strategy

### Phase 1: Project Setup & Dependencies (1-2 days)
1. **Initialize TypeScript Project**
   - Create `ts_version/` directory structure
   - Set up `package.json` with TypeScript, Node.js dependencies
   - Configure `tsconfig.json` for strict TypeScript compilation
   - Set up build tools (webpack/rollup) and development environment

2. **Map Python Dependencies to TypeScript/Node.js**
   - `temporalio` → `@temporalio/worker` + `@temporalio/client`
   - `fastapi` → `express` + `@types/express` or `fastify`
   - `uvicorn` → Built-in Node.js server or `pm2`
   - `pydantic` → `zod` for runtime validation + TypeScript types
   - `python-multipart` → `multer` for file uploads
   - `httpx` → `axios` or `fetch` API
   - `python-dotenv` → `dotenv`
   - `openai` → `openai` (same package)

### Phase 2: Core Schema Translation (2-3 days)
1. **Type Definitions (`schemas.py` → `types/` directory)**
   - Convert Pydantic models to TypeScript interfaces
   - Convert Python dataclasses to TypeScript types
   - Implement Zod schemas for runtime validation
   - Create enum mappings (`enums.py` → `types/enums.ts`)

2. **Key Translations**:
   ```typescript
   // schemas.py → types/schemas.ts
   interface CallAgentRequest {
     request_text: string;
     agent_names: string[];
     request_files?: File[];
   }
   
   interface AgentDefinition {
     name: string;
     system_prompt: string;
     tools: Tool[];
     llm_provider: string;
     model: string;
   }
   ```

### Phase 3: Base Classes & Tools Translation (3-4 days)
1. **Abstract Base Class Translation (`tools/base.py`)**
   - Convert Python ABC to TypeScript abstract class or interface
   - Implement tool input validation using Zod
   - Create tool registry system with TypeScript generics

2. **Tool Implementations**
   - Translate all tools in `tools/` directory
   - Maintain same interface contracts
   - Implement async/await patterns for I/O operations

3. **Example Translation**:
   ```typescript
   // tools/base.py → tools/base.ts
   abstract class BaseTool {
     abstract name: string;
     abstract description: string;
     abstract inputs: ToolInput[];
     
     abstract call(kwargs: Record<string, any>): Promise<string>;
   }
   ```

### Phase 4: Temporal Workflow Translation (4-5 days)
1. **Workflow Definition (`temporal/agent.py`)**
   - Convert Python Temporal decorators to TypeScript SDK
   - Translate workflow execution patterns
   - Implement activity functions with proper typing
   - Handle retry policies and timeouts

2. **Activities Translation (`temporal/activities/`)**
   - Convert activity functions to TypeScript
   - Maintain same function signatures and return types
   - Implement proper error handling

3. **Worker Setup (`temporal/worker.py`)**
   - Create TypeScript worker equivalent
   - Configure task queues and activity registration

### Phase 5: FastAPI to Express/Fastify Translation (3-4 days)
1. **Server Setup (`main.py`)**
   - Convert FastAPI application to Express/Fastify
   - Implement middleware for file uploads, CORS, etc.
   - Translate route handlers with proper typing

2. **Endpoint Translation**:
   ```typescript
   // main.py → server.ts
   app.post('/call-agent', async (req: Request<{}, CallAgentResponse, CallAgentRequest>, res: Response) => {
     const { request_text, agent_names, request_files } = req.body;
     // Implementation...
   });
   ```

### Phase 6: Utility Functions & Registry (2-3 days)
1. **Utilities Translation (`utils.py`)**
   - Convert utility functions to TypeScript
   - Implement file handling and presigned URL generation
   - Maintain same function interfaces

2. **Registry Systems (`agents/registry.py`, `tools/registry.py`)**
   - Convert registry patterns to TypeScript
   - Use proper typing for registry lookups
   - Implement factory patterns where appropriate

### Phase 7: LLM Integration Translation (2-3 days)
1. **OpenAI Integration (`llm_tool_converters/`, `llm_provider_invocations/`)**
   - Translate OpenAI SDK usage to TypeScript
   - Convert tool format converters
   - Implement proper error handling and response parsing

### Phase 8: Testing & Validation (3-4 days)
1. **Unit Tests**
   - Create Jest/Vitest test suite
   - Test all translated components
   - Verify equivalent behavior to Python version

2. **Integration Tests**
   - Test full workflow execution
   - Validate API endpoints
   - Test file upload functionality

3. **Performance Testing**
   - Compare performance with Python version
   - Optimize bottlenecks if necessary

### Phase 9: Documentation & Deployment (2-3 days)
1. **Documentation Updates**
   - Update README for TypeScript version
   - Create API documentation
   - Document setup and deployment procedures

2. **Deployment Configuration**
   - Create Dockerfile for Node.js
   - Update deployment scripts
   - Configure environment variables

## File Structure Mapping

```
Python Structure                TypeScript Structure
├── main.py                    ├── src/
├── schemas.py                 │   ├── server.ts
├── enums.py                   │   ├── types/
├── utils.py                   │   │   ├── schemas.ts
├── tool_converter.py          │   │   └── enums.ts
├── temporal/                  │   ├── utils/
│   ├── agent.py              │   │   └── index.ts
│   ├── worker.py             │   ├── temporal/
│   └── activities/           │   │   ├── workflows/
├── tools/                     │   │   │   └── agent.ts
│   ├── base.py               │   │   ├── activities/
│   └── *.py                  │   │   └── worker.ts
├── agents/                    │   ├── tools/
│   └── *.py                  │   │   ├── base.ts
└── llm_*/                     │   │   └── implementations/
                              │   ├── agents/
                              │   └── llm/
                              ├── package.json
                              ├── tsconfig.json
                              └── tests/
```

## Key Considerations

### Type Safety
- Leverage TypeScript's strict mode for maximum type safety
- Use proper generic types for tool definitions and registry systems
- Implement runtime validation with Zod schemas

### Async/Await Patterns
- Convert Python async/await to TypeScript equivalents
- Ensure proper error handling with try/catch blocks
- Maintain proper Promise typing throughout

### Dependency Injection
- Consider implementing dependency injection patterns
- Use TypeScript interfaces for better testability
- Implement proper factory patterns for tool creation

### Error Handling
- Translate Python exception patterns to TypeScript
- Implement proper error classes and error handling
- Maintain same error messages and codes where possible

## Timeline Estimate
**Total Duration**: 20-28 days (4-6 weeks)

## Success Criteria
1. All Python functionality reproduced in TypeScript
2. Full test coverage with passing test suite
3. Performance comparable to or better than Python version
4. Type-safe codebase with comprehensive TypeScript typing
5. Successful deployment and operation of translated application

## Risks & Mitigation
1. **Temporal SDK Differences**: Test thoroughly and adapt patterns as needed
2. **Performance Variations**: Benchmark and optimize critical paths
3. **Library Compatibility**: Have fallback options for each dependency
4. **Type Safety**: Implement comprehensive testing to catch type-related issues

This plan provides a systematic approach to translating the Python codebase while maintaining functionality, improving type safety, and leveraging TypeScript/Node.js ecosystem benefits.