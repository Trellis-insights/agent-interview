import axios from 'axios';

// Types (matching backend tRPC schema)
export interface AgentRequest {
  request_text: string;
  agent_names: string[];
  request_files?: Array<{
    filename: string;
    content: string; // Base64 encoded
    contentType?: string;
  }>;
}

export interface AgentDefinition {
  name: string;
  system_prompt: string;
  tools: Tool[];
  llm_provider: 'OPENAI';
  model: 'gpt-4' | 'gpt-4o' | 'gpt-4-turbo';
}

export interface Tool {
  name: string;
  description: string;
  inputs: ToolInput[];
}

export interface ToolInput {
  name: string;
  description: string;
  type: 'string' | 'integer' | 'float' | 'boolean' | 'list' | 'dict' | 'any';
  required: boolean;
}

export interface AgentResponse {
  result: string;
  execution_time?: number;
  tools_used?: string[];
  metadata?: {
    tokens_used?: number;
    model_used?: string;
    workflow_id?: string;
  };
}

export interface FileUploadResponse {
  urls: string[];
  metadata: {
    filename: string;
    size: number;
    contentType: string;
    uploadTime: string;
  }[];
}

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for long-running agent requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request/Response interceptors for error handling
apiClient.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    
    // Handle common error cases
    if (error.response?.status === 400) {
      throw new Error(`Validation Error: ${error.response.data.error?.message || 'Invalid request'}`);
    } else if (error.response?.status === 500) {
      throw new Error(`Server Error: ${error.response.data.error?.message || 'Internal server error'}`);
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - the agent is taking too long to respond');
    } else if (!error.response) {
      throw new Error('Network error - please check your connection');
    }
    
    return Promise.reject(error);
  }
);

// API Functions
export const apiService = {
  // Call agent with request
  async callAgent(request: AgentRequest): Promise<AgentResponse> {
    try {
      const response = await apiClient.post('/api/trpc/callAgent', request);
      return response.data;
    } catch (error) {
      console.error('Call agent error:', error);
      throw error;
    }
  },

  // Upload files
  async uploadFiles(files: File[]): Promise<FileUploadResponse> {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await apiClient.post('/api/trpc/uploadFiles', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Upload files error:', error);
      throw error;
    }
  },

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  },

  // Get available agents (if endpoint exists)
  async getAvailableAgents(): Promise<string[]> {
    try {
      const response = await apiClient.get('/api/agents');
      return response.data;
    } catch (error) {
      console.warn('Get available agents error - using default agents:', error);
      // Return default agents if endpoint doesn't exist
      return ['benefits'];
    }
  },
};

// Utility functions
// Agent Creation Functions
export const createBenefitsAgent = (customPrompt?: string): AgentDefinition => ({
  name: 'benefits',
  system_prompt: customPrompt || 'You are a helpful HR benefits assistant specialized in pension calculations, health insurance, and benefits enrollment. Provide clear, accurate information and use the available tools when needed.',
  tools: [
    {
      name: 'calculate_pension',
      description: 'Calculate pension benefits based on salary and years of service',
      inputs: [
        {
          name: 'current_salary',
          description: 'Current annual salary in dollars',
          type: 'float',
          required: true
        },
        {
          name: 'years_of_service',
          description: 'Years of service with the company',
          type: 'integer',
          required: true
        },
        {
          name: 'retirement_age',
          description: 'Planned retirement age',
          type: 'integer',
          required: true
        },
        {
          name: 'pension_plan_type',
          description: 'Type of pension plan (traditional, hybrid, etc.)',
          type: 'string',
          required: false
        }
      ]
    },
    {
      name: 'health_insurance_lookup',
      description: 'Look up health insurance plans and coverage details',
      inputs: [
        {
          name: 'plan_type',
          description: 'Insurance plan type',
          type: 'string',
          required: true
        },
        {
          name: 'employee_tier',
          description: 'Employee tier/level',
          type: 'string',
          required: true
        },
        {
          name: 'family_size',
          description: 'Number of family members',
          type: 'integer',
          required: false
        }
      ]
    },
    {
      name: 'benefits_enrollment',
      description: 'Handle benefits enrollment and plan selection',
      inputs: [
        {
          name: 'employee_id',
          description: 'Employee identifier',
          type: 'string',
          required: true
        },
        {
          name: 'benefit_type',
          description: 'Type of benefit to enroll',
          type: 'string',
          required: true
        },
        {
          name: 'plan_selection',
          description: 'Selected plan option',
          type: 'string',
          required: true
        }
      ]
    }
  ],
  llm_provider: 'OPENAI',
  model: 'gpt-4o'
});

// Additional Agent Types (for future expansion)
export const createGeneralAssistantAgent = (customPrompt?: string): AgentDefinition => ({
  name: 'general',
  system_prompt: customPrompt || 'You are a helpful general-purpose AI assistant. Provide accurate, helpful information and assistance with a wide variety of tasks.',
  tools: [],
  llm_provider: 'OPENAI',
  model: 'gpt-4o'
});

export const createFinanceAgent = (customPrompt?: string): AgentDefinition => ({
  name: 'finance',
  system_prompt: customPrompt || 'You are a financial advisor AI assistant. Help with financial planning, investment advice, budgeting, and financial calculations.',
  tools: [],
  llm_provider: 'OPENAI',
  model: 'gpt-4o'
});

export const createHRAgent = (customPrompt?: string): AgentDefinition => ({
  name: 'hr',
  system_prompt: customPrompt || 'You are an HR specialist AI assistant. Help with human resources questions, policies, procedures, and employee relations.',
  tools: [],
  llm_provider: 'OPENAI',
  model: 'gpt-4o'
});

// Agent factory function
export const createAgentByName = (agentName: string, model: 'gpt-4' | 'gpt-4o' | 'gpt-4-turbo' = 'gpt-4o'): AgentDefinition => {
  let agent: AgentDefinition;
  
  switch (agentName.toLowerCase()) {
    case 'benefits':
      agent = createBenefitsAgent();
      break;
    case 'general':
      agent = createGeneralAssistantAgent();
      break;
    case 'finance':
      agent = createFinanceAgent();
      break;
    case 'hr':
      agent = createHRAgent();
      break;
    default:
      // Default to benefits agent if unknown agent name
      agent = createBenefitsAgent();
      agent.name = agentName; // Use the requested name
      break;
  }
  
  // Set the model
  agent.model = model;
  return agent;
};

// Available agent names for dropdown
export const AVAILABLE_AGENT_NAMES = [
  { value: 'benefits', label: 'Benefits Assistant' },
  { value: 'general', label: 'General Assistant' },
  { value: 'finance', label: 'Finance Assistant' },
  { value: 'hr', label: 'HR Assistant' }
];

export default apiService;