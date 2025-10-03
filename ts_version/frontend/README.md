# Temporal Agent Frontend

A modern React TypeScript frontend for the Temporal Agent API. This application provides a chat interface to interact with AI agents, upload files, and monitor system status.

## 🚀 Features

- **Interactive Chat Interface**: Real-time conversation with AI agents
- **File Upload Support**: Drag-and-drop file upload with support for PDF, TXT, DOC, DOCX, CSV, and JSON
- **Multiple LLM Models**: Support for GPT-4, GPT-4O, and GPT-4 Turbo
- **System Status Monitoring**: Real-time API health checks and performance metrics
- **Responsive Design**: Modern UI built with Tailwind CSS
- **Type Safety**: Full TypeScript implementation
- **Real-time Updates**: Auto-refreshing status checks

## 📋 Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher
- Running Temporal Agent backend (see main README)

## 🛠️ Installation

1. **Navigate to the frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment:**
```bash
# Copy environment files
cp .env.development .env.local

# Update API URL if needed
# Default: http://localhost:8000
```

## 🚀 Development

### Start Development Server
```bash
npm start
# or
npm run dev
```

The application will start at `http://localhost:3000`.

### Build for Production
```bash
npm run build:prod
```

### Run Tests
```bash
npm test
```

### Serve Production Build
```bash
npm install -g serve
npm run serve
```

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/        # React components
│   │   ├── AgentChat.tsx  # Main chat interface
│   │   └── ApiStatus.tsx  # System status page
│   ├── services/          # API services
│   │   └── api.ts         # API client and types
│   ├── App.tsx            # Main app component
│   ├── index.tsx          # Entry point
│   └── index.css          # Global styles with Tailwind
├── tailwind.config.js     # Tailwind configuration
├── package.json           # Dependencies and scripts
└── .env.development       # Environment variables
```

## 🎯 Usage

### Chat Interface

1. **Text Input**: Type your message about benefits, pension calculations, etc.
2. **File Upload**: 
   - Drag and drop files onto the upload area
   - Or click the upload button to select files
   - Supported formats: PDF, TXT, DOC, DOCX, CSV, JSON
   - Max file size: 10MB per file
3. **Model Selection**: Choose between GPT-4, GPT-4O, or GPT-4 Turbo
4. **Send Message**: Press Enter or click Send

### Example Queries

- "Calculate my pension benefits for 25 years of service with a $75,000 salary"
- "What health insurance plans are available for a family of 4?"
- "Help me enroll in benefits"
- "What's my PTO balance?"
- "Calculate FSA savings for $3,000 in medical expenses"

### System Status

Monitor the health and performance of:
- API connectivity
- Agent services
- File upload functionality
- Response times and uptime metrics

## ⚙️ Configuration

### Environment Variables

```bash
# .env.development
REACT_APP_API_URL=http://localhost:8000
REACT_APP_APP_NAME=Temporal Agent Frontend
REACT_APP_VERSION=1.0.0
REACT_APP_DEBUG=true

# .env.production
REACT_APP_API_URL=https://your-api-domain.com
REACT_APP_APP_NAME=Temporal Agent Frontend
REACT_APP_VERSION=1.0.0
REACT_APP_DEBUG=false
```

### Tailwind CSS Configuration

The app uses a custom Tailwind configuration with:
- Primary blue color palette
- Custom component classes for buttons, inputs, and cards
- Responsive breakpoints
- Custom animations

## 🔧 API Integration

The frontend communicates with the backend via:

- **POST /api/trpc/callAgent** - Execute agent requests
- **POST /api/trpc/uploadFiles** - Upload files
- **GET /health** - Health check
- **GET /api/agents** - Get available agents

All API calls include:
- Request/response logging
- Error handling with user-friendly messages
- Loading states and timeouts
- Automatic retries for failed requests

## 🎨 Components

### AgentChat
- Real-time chat interface
- File upload with drag-and-drop
- Message history with timestamps
- Loading indicators and error states
- Model selection
- Tool usage indicators

### ApiStatus
- Real-time health monitoring
- Performance metrics
- Service status indicators
- Auto-refresh capabilities
- API information display

## 🔒 Security

- Environment-based configuration
- Input validation
- File type restrictions
- CORS handling
- Error message sanitization

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build:prod
serve -s build
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:prod

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Check if backend is running on correct port
   - Verify REACT_APP_API_URL in environment
   - Check CORS configuration

2. **File Upload Not Working**
   - Check file size (max 10MB)
   - Verify file format is supported
   - Check backend file upload service

3. **Styling Issues**
   - Ensure Tailwind CSS is properly configured
   - Check if PostCSS is processing styles
   - Verify tailwind.config.js paths

### Debug Mode

Enable debug mode by setting `REACT_APP_DEBUG=true`:
- Shows detailed API request/response logs
- Displays error stack traces
- Shows performance timing

## 📊 Performance

The frontend is optimized for:
- Fast initial load (code splitting)
- Responsive design (mobile-first)
- Efficient re-renders (React optimization)
- Minimal bundle size (tree shaking)
- Cached API responses

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper TypeScript types
4. Add tests for new components
5. Ensure responsive design works
6. Submit a pull request

## 📝 License

Same as the main project (MIT License).

---

**Frontend Version**: v1.0.0  
**React Version**: 19.x  
**TypeScript Version**: 4.x  
**Tailwind CSS Version**: 4.x