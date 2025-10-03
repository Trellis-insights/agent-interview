# API Documentation

## Overview

The Temporal Agent TypeScript API is built on tRPC, providing full type safety from client to server. All endpoints are strongly typed and automatically validated.

## Base URL

```
Development: http://localhost:8000/api/trpc
Production: https://your-domain.com/api/trpc
```

## Authentication

Currently, the API uses API keys for authentication:

```bash
# Environment variables
OPENAI_API_KEY=your_openai_api_key
TRELLIS_API_KEY=your_trellis_api_key_for_file_uploads
```

## Endpoints

### `callAgent`

Execute an AI agent with the provided request and configuration.

**Method:** `POST`  
**Endpoint:** `/callAgent`

#### Request Schema

```typescript
interface AgentRequest {
  request_text: string;                 // The user's request
  request_files?: string[];             // Optional file URLs (from file upload)
  agents: AgentDefinition[];            // Agent configurations
}

interface AgentDefinition {
  name: string;                         // Agent identifier
  system_prompt: string;                // System prompt for the agent
  tools: Tool[];                        // Available tools for the agent
  llm_provider: LLMProvider;            // LLM provider (currently "OPENAI")
  model: OpenAIModel;                   // Model name ("gpt-4", "gpt-4o")
}
```

#### Example Request

```json
{
  "request_text": "Calculate my pension benefits for 25 years of service with a $75,000 salary",
  "request_files": [],
  "agents": [{
    "name": "benefits",
    "system_prompt": "You are a helpful HR benefits assistant specialized in pension calculations and benefits enrollment.",
    "tools": [
      {
        "name": "calculate_pension",
        "description": "Calculate pension benefits based on salary and years of service",
        "inputs": [
          {
            "name": "current_salary",
            "description": "Current annual salary in dollars",
            "type": "float",
            "required": true
          },
          {
            "name": "years_of_service", 
            "description": "Years of service with the company",
            "type": "integer",
            "required": true
          },
          {
            "name": "retirement_age",
            "description": "Planned retirement age",
            "type": "integer",
            "required": true
          },
          {
            "name": "pension_plan_type",
            "description": "Type of pension plan (traditional, hybrid, etc.)",
            "type": "string",
            "required": false
          }
        ]
      }
    ],
    "llm_provider": "OPENAI",
    "model": "gpt-4o"
  }]
}
```

#### Response Schema

```typescript
interface AgentResponse {
  result: string;                       // The agent's response text
  execution_time?: number;              // Execution time in milliseconds
  tools_used?: string[];                // List of tools that were called
  metadata?: {
    tokens_used?: number;
    model_used?: string;
    workflow_id?: string;
  };
}
```

#### Example Response

```json
{
  "result": "Based on your 25 years of service and $75,000 annual salary, I've calculated your pension benefits:\n\n**Pension Calculation Results:**\n- Monthly pension benefit: $2,343.75\n- Annual pension benefit: $28,125\n- Total pension value: $562,500 (20-year payout)\n\nThis calculation assumes:\n- Retirement at age 65\n- Traditional pension plan with 1.5% accrual rate\n- Full vesting after 25 years of service\n\nWould you like me to explore different retirement ages or pension plan options?",
  "execution_time": 2450,
  "tools_used": ["calculate_pension"],
  "metadata": {
    "tokens_used": 1247,
    "model_used": "gpt-4o",
    "workflow_id": "agent-workflow-123456"
  }
}
```

#### Error Response

```typescript
interface ErrorResponse {
  error: {
    code: string;                       // Error code
    message: string;                    // Human-readable error message
    details?: any;                      // Additional error details
  };
}
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR", 
    "message": "request_text must be a non-empty string",
    "details": {
      "field": "request_text",
      "received": "",
      "expected": "non-empty string"
    }
  }
}
```

### File Upload Endpoints

Files are handled through a separate upload process that returns URLs for use in agent requests.

#### `uploadFiles`

**Method:** `POST`  
**Endpoint:** `/uploadFiles`  
**Content-Type:** `multipart/form-data`

#### Request

```typescript
interface FileUploadRequest {
  files: File[];                        // Files to upload
}
```

#### Response

```typescript
interface FileUploadResponse {
  urls: string[];                       // Presigned URLs for uploaded files
  metadata: {
    filename: string;
    size: number;
    contentType: string;
    uploadTime: string;
  }[];
}
```

## Type Definitions

### Core Types

```typescript
// Input types for tool parameters
enum InputType {
  STRING = 'string',
  INTEGER = 'integer', 
  FLOAT = 'float',
  BOOLEAN = 'boolean',
  LIST = 'list',
  DICT = 'dict',
  ANY = 'any'
}

// LLM providers
enum LLMProvider {
  OPENAI = 'OPENAI'
}

// OpenAI model options
enum OpenAIModel {
  GPT_4 = 'gpt-4',
  GPT_4O = 'gpt-4o',
  GPT_4_TURBO = 'gpt-4-turbo'
}

// Tool definition
interface Tool {
  name: string;
  description: string;
  inputs: ToolInput[];
}

interface ToolInput {
  name: string;
  description: string;
  type: InputType;
  required: boolean;
}
```

## Available Agents

### Benefits Agent (`benefits`)

Specialized HR benefits assistant with comprehensive pension, insurance, and benefits tools.

#### Available Tools

##### `calculate_pension`
Calculate pension benefits based on employee information.

**Parameters:**
- `current_salary` (float, required): Current annual salary
- `years_of_service` (integer, required): Years of service
- `retirement_age` (integer, required): Planned retirement age  
- `pension_plan_type` (string, optional): Type of pension plan

**Example Usage:**
```json
{
  "current_salary": 75000,
  "years_of_service": 25,
  "retirement_age": 65,
  "pension_plan_type": "traditional"
}
```

##### `health_insurance_lookup`
Look up health insurance plans and coverage details.

**Parameters:**
- `plan_type` (string, required): Insurance plan type
- `employee_tier` (string, required): Employee tier/level
- `family_size` (integer, optional): Number of family members

##### `benefits_enrollment`
Handle benefits enrollment and plan selection.

**Parameters:**
- `employee_id` (string, required): Employee identifier
- `benefit_type` (string, required): Type of benefit to enroll
- `plan_selection` (string, required): Selected plan option

##### `pto_balance_lookup`
Check PTO balance and accrual information.

**Parameters:**
- `employee_id` (string, required): Employee identifier
- `year` (integer, optional): Year to check (default: current)

##### `fsa_hsa_calculator`
Calculate FSA/HSA contribution recommendations.

**Parameters:**
- `account_type` (string, required): "FSA" or "HSA"
- `annual_income` (float, required): Annual income
- `estimated_expenses` (float, required): Estimated medical expenses
- `employer_contribution` (float, optional): Employer contribution amount

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `AGENT_NOT_FOUND` | Specified agent not found | 404 |
| `TOOL_ERROR` | Tool execution failed | 500 |
| `LLM_ERROR` | LLM provider error | 502 |
| `WORKFLOW_ERROR` | Temporal workflow error | 500 |
| `FILE_UPLOAD_ERROR` | File upload failed | 400 |
| `RATE_LIMIT_ERROR` | Rate limit exceeded | 429 |

## Rate Limits

- **General API**: 100 requests per minute per IP
- **File Upload**: 10 uploads per minute per IP
- **Agent Execution**: 20 requests per minute per API key

## SDKs and Client Libraries

### TypeScript/JavaScript Client

```bash
npm install @temporal-agent/client
```

```typescript
import { TemporalAgentClient } from '@temporal-agent/client';

const client = new TemporalAgentClient({
  baseUrl: 'http://localhost:8000/api/trpc',
  apiKey: 'your-api-key'
});

const response = await client.callAgent({
  request_text: 'Calculate my pension',
  agents: [{
    name: 'benefits',
    system_prompt: 'You are a helpful HR assistant',
    tools: [],
    llm_provider: 'OPENAI',
    model: 'gpt-4o'
  }]
});
```

### cURL Examples

#### Basic Agent Call
```bash
curl -X POST http://localhost:8000/api/trpc/callAgent \
  -H "Content-Type: application/json" \
  -d '{
    "request_text": "What are my health insurance options?",
    "agents": [{
      "name": "benefits",
      "system_prompt": "You are an expert HR benefits assistant",
      "tools": [],
      "llm_provider": "OPENAI", 
      "model": "gpt-4o"
    }]
  }'
```

#### Agent Call with File Upload
```bash
# First upload files
curl -X POST http://localhost:8000/api/trpc/uploadFiles \
  -F "files=@employee_handbook.pdf" \
  -F "files=@benefits_guide.pdf"

# Then call agent with returned URLs
curl -X POST http://localhost:8000/api/trpc/callAgent \
  -H "Content-Type: application/json" \
  -d '{
    "request_text": "Review these documents and explain my benefits",
    "request_files": ["https://uploads.example.com/file1.pdf", "https://uploads.example.com/file2.pdf"],
    "agents": [{
      "name": "benefits",
      "system_prompt": "You are an expert at analyzing HR documents",
      "tools": [],
      "llm_provider": "OPENAI",
      "model": "gpt-4o"
    }]
  }'
```

## Webhooks

Configure webhooks to receive notifications about agent execution events.

### Webhook Events

- `agent.started`: Agent execution started
- `agent.completed`: Agent execution completed
- `agent.failed`: Agent execution failed
- `tool.called`: Tool was called during execution

### Webhook Payload

```typescript
interface WebhookPayload {
  event: string;
  timestamp: string;
  data: {
    workflow_id: string;
    agent_name: string;
    request_text: string;
    result?: string;
    error?: string;
    execution_time?: number;
  };
}
```

## OpenAPI Specification

The full OpenAPI/Swagger specification is available at:
```
GET /api/trpc/openapi.json
```

Interactive documentation:
```
GET /api/docs
```

## Support

For API support:
- **Documentation**: [Full API Docs](https://docs.example.com)
- **Status Page**: [API Status](https://status.example.com)
- **GitHub Issues**: [Report Issues](https://github.com/example/temporal-agent/issues)
- **Discord**: [Join Community](https://discord.gg/temporal-agent)

---

**API Version**: v1.0.0  
**Last Updated**: 2024-01-01  
**tRPC Version**: 10.x  
**TypeScript Version**: 5.x