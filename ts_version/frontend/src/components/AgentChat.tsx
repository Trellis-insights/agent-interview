import React, { useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Send, Upload, X, Loader2, Bot, User, FileText, AlertCircle } from 'lucide-react';
import { apiService, AVAILABLE_AGENT_NAMES, AgentResponse } from '../services/api';

interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  files?: string[];
  metadata?: {
    execution_time?: number;
    tools_used?: string[];
    tokens_used?: number;
  };
  error?: boolean;
}

export const AgentChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [agentModel, setAgentModel] = useState<'gpt-4o' | 'gpt-4' | 'gpt-4-turbo'>('gpt-4o');
  const [selectedAgent, setSelectedAgent] = useState<string>('benefits');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Generate welcome message based on selected agent
  const getWelcomeMessage = (agentName: string): string => {
    const agentInfo = AVAILABLE_AGENT_NAMES.find(a => a.value === agentName);
    const agentLabel = agentInfo?.label || 'Assistant';
    
    switch (agentName.toLowerCase()) {
      case 'benefits':
        return `Hello! I'm your ${agentLabel}. I can help you with pension calculations, health insurance questions, benefits enrollment, and more. You can also upload files for me to review. How can I assist you today?`;
      case 'finance':
        return `Hello! I'm your ${agentLabel}. I can help you with financial planning, investment advice, budgeting, and financial calculations. How can I assist you with your finances today?`;
      case 'hr':
        return `Hello! I'm your ${agentLabel}. I can help you with HR policies, procedures, employee relations, and workplace questions. How can I help you today?`;
      case 'general':
        return `Hello! I'm your ${agentLabel}. I'm here to help you with a wide variety of tasks and questions. How can I assist you today?`;
      default:
        return `Hello! I'm your ${agentLabel}. How can I assist you today?`;
    }
  };

  // Update welcome message when agent changes
  React.useEffect(() => {
    if (messages.length === 0 || (messages.length === 1 && messages[0].type === 'agent')) {
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'agent',
        content: getWelcomeMessage(selectedAgent),
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgent]);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      setFiles(prev => [...prev, ...acceptedFiles]);
    },
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/csv': ['.csv'],
      'application/json': ['.json']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if (!inputText.trim() && files.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText,
      timestamp: new Date(),
      files: files.map(f => f.name),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Convert files to base64 if any
      let requestFiles: Array<{filename: string; content: string; contentType?: string}> = [];
      if (files.length > 0) {
        try {
          requestFiles = await Promise.all(files.map(async (file) => {
            return new Promise<{filename: string; content: string; contentType?: string}>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const base64String = (reader.result as string).split(',')[1]; // Remove data:...; prefix
                resolve({
                  filename: file.name,
                  content: base64String,
                  contentType: file.type
                });
              };
              reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
              reader.readAsDataURL(file);
            });
          }));
        } catch (fileError) {
          console.error('File processing error:', fileError);
          // Continue without files if processing fails
        }
      }

      // Create agent request using selected agent name
      const agentRequest = {
        request_text: inputText,
        agent_names: [selectedAgent],
        request_files: requestFiles,
      };

      // Call agent
      const response: AgentResponse = await apiService.callAgent(agentRequest);
      
      // Debug: log the actual response structure
      console.log('Agent API Response:', response);
      
      // Handle response structure and extract meaningful content
      console.log('Raw response structure:', response);
      
      let actualResponse = response;
      let resultContent = '';
      
      // Handle tRPC/axios response wrapping
      if (response && typeof response === 'object' && 'data' in response) {
        actualResponse = (response as any).data;
        console.log('Extracted data:', actualResponse);
      }
      
      // Extract the result field specifically
      if (actualResponse && typeof actualResponse === 'object' && 'result' in actualResponse) {
        const resultField = actualResponse.result;
        console.log('Found result field:', resultField);
        
        if (typeof resultField === 'string') {
          // Clean up the result string - remove technical formatting
          resultContent = resultField
            .replace(/^[{[]"*(.*?)[}]"]*$/, '$1') // Remove wrapper quotes/brackets
            .replace(/\\n/g, '\n') // Convert escaped newlines to real newlines
            .replace(/\\"/g, '"') // Convert escaped quotes
            .replace(/^\s*["']|["']\s*$/g, '') // Remove leading/trailing quotes
            .trim();
            
          // Handle common bad response patterns
          if (resultContent.startsWith('{') && resultContent.endsWith('}')) {
            try {
              const parsed = JSON.parse(resultContent);
              if (parsed.content) resultContent = parsed.content;
              else if (parsed.message) resultContent = parsed.message;
              else if (parsed.response) resultContent = parsed.response;
              else if (typeof parsed === 'string') resultContent = parsed;
            } catch (e) {
              // Keep original if parsing fails
            }
          }
          
          // Remove common unwanted patterns
          resultContent = resultContent
            .replace(/^(Response|Result|Output):\s*/i, '') // Remove prefixes
            .replace(/^\d+\.\s*/, '') // Remove leading numbers
            .replace(/^[-*]\s*/, '') // Remove bullet points
            .trim();
            
        } else if (resultField && typeof resultField === 'object') {
          // If result is an object, try to extract meaningful content
          if ((resultField as any).content) {
            resultContent = (resultField as any).content;
          } else if ((resultField as any).message) {
            resultContent = (resultField as any).message;
          } else if ((resultField as any).response) {
            resultContent = (resultField as any).response;
          } else if ((resultField as any).text) {
            resultContent = (resultField as any).text;
          } else {
            // Last resort: prettify the JSON
            resultContent = JSON.stringify(resultField, null, 2);
          }
        } else {
          // Use resultField directly if it's not a string or object
          resultContent = String(resultField || 'No response received');
        }
      } else {
        // Fallback for other response types
        resultContent = String(actualResponse || 'No response received');
      }

      // Validate that we have a meaningful response
      if (!resultContent || 
          resultContent === 'undefined' || 
          resultContent === 'null' || 
          resultContent === '{}' || 
          resultContent === '[]' ||
          resultContent.trim().length === 0) {
        resultContent = 'I apologize, but I didn\'t receive a proper response. Please try again.';
      }
      
      // Add some basic formatting improvements
      if (resultContent.length > 0) {
        // Ensure proper sentence structure
        if (!resultContent.match(/[.!?]$/)) {
          resultContent += '.';
        }
        
        // Capitalize first letter if it's not already
        resultContent = resultContent.charAt(0).toUpperCase() + resultContent.slice(1);
      }

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: resultContent,
        timestamp: new Date(),
        metadata: {
          execution_time: actualResponse.execution_time,
          tools_used: actualResponse.tools_used,
          tokens_used: actualResponse.metadata?.tokens_used,
        },
      };

      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error('Agent error:', error);
      
      // Safely extract error message, ensuring it's always a string
      let errorText = 'Unknown error';
      if (error instanceof Error) {
        errorText = error.message;
      } else if (typeof error === 'string') {
        errorText = error;
      } else if (error && typeof error === 'object') {
        // Handle structured error objects
        errorText = JSON.stringify(error);
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: `Sorry, I encountered an error: ${errorText}`,
        timestamp: new Date(),
        error: true,
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setInputText('');
      setFiles([]);
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="card p-4 mb-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Agent Chat</h2>
          <div className="flex items-center space-x-4">
            {/* Agent Selection */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Agent:</label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="input-field text-sm py-1 px-2"
              >
                {AVAILABLE_AGENT_NAMES.map((agent) => (
                  <option key={agent.value} value={agent.value}>
                    {agent.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Model Selection */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Model:</label>
              <select
                value={agentModel}
                onChange={(e) => setAgentModel(e.target.value as any)}
                className="input-field text-sm py-1 px-2"
              >
                <option value="gpt-4o">GPT-4O</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 card p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 ${message.type === 'user' ? 'ml-2' : 'mr-2'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-primary-600' 
                      : message.error 
                        ? 'bg-red-500' 
                        : 'bg-gray-600'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : message.error ? (
                      <AlertCircle className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>

                {/* Message */}
                <div className={`rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-primary-600 text-white'
                    : message.error
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Files */}
                  {message.files && message.files.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {message.files.map((filename, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                            message.type === 'user'
                              ? 'bg-primary-700 text-primary-100'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          {filename}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className={`flex justify-between items-center mt-2 text-xs ${
                    message.type === 'user'
                      ? 'text-primary-200'
                      : 'text-gray-500'
                  }`}>
                    <span>{formatTimestamp(message.timestamp)}</span>
                    {message.metadata && (
                      <div className="flex space-x-2">
                        {message.metadata.execution_time && (
                          <span>{(message.metadata.execution_time / 1000).toFixed(1)}s</span>
                        )}
                        {message.metadata.tools_used && message.metadata.tools_used.length > 0 && (
                          <span>🔧 {message.metadata.tools_used.join(', ')}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex flex-row">
                <div className="flex-shrink-0 mr-2">
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                    <div className="flex flex-col">
                      <span className="text-primary-700 text-sm font-medium">
                        {AVAILABLE_AGENT_NAMES.find(a => a.value === selectedAgent)?.label} is thinking...
                      </span>
                      <span className="text-primary-500 text-xs">
                        Processing your request with {agentModel.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* File Upload Area */}
      {files.length > 0 && (
        <div className="card p-3 mt-4">
          <div className="flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
                <FileText className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-sm text-gray-700 mr-2">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="card p-4 mt-4">
        <div className="flex space-x-2">
          {/* File Upload */}
          <div
            {...getRootProps()}
            className={`flex-shrink-0 border-2 border-dashed rounded-lg p-2 cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-5 h-5 text-gray-400" />
          </div>

          {/* Text Input */}
          <div className="flex-1">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={selectedAgent === 'benefits' ? "Ask about benefits, pension calculations, health insurance..." :
                          selectedAgent === 'finance' ? "Ask about financial planning, investments, budgeting..." :
                          selectedAgent === 'hr' ? "Ask about HR policies, procedures, employee relations..." :
                          "Ask me anything..."}
              className="input-field resize-none"
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={sendMessage}
            disabled={isLoading || (!inputText.trim() && files.length === 0)}
            className="btn-primary flex-shrink-0 self-end"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};