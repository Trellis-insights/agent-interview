// HTTP server for tRPC - TypeScript translation of main.py
import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createContext } from './context';
import { appRouter } from './router';

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true
}));

// Parse JSON requests
app.use(express.json({ limit: '50mb' }));

// tRPC middleware
app.use('/api/trpc', createExpressMiddleware({
  router: appRouter,
  createContext
}));

// Health check endpoint (direct Express route)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Start server
const port = parseInt(process.env.PORT || '8000', 10);

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
  console.log(`tRPC API available at http://0.0.0.0:${port}/api/trpc`);
});

export { app };