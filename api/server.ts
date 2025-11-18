import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { registerRoutes } from '../server/routes';
import { mockSessionMiddleware } from '../server/mockSession';

const app = express();

// Trust proxy for Vercel
app.set('trust proxy', 1);

// CORS - allow all origins for demo
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security headers (relaxed for demo)
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Parse JSON and cookies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Mock session for demo mode - provides fake session data to routes
app.use(mockSessionMiddleware);

// Register API routes (must be async to ensure routes are registered)
let routesRegistered = false;
if (!routesRegistered) {
  registerRoutes(app).then(() => {
    console.log('API routes registered for Vercel');
  });
  routesRegistered = true;
}

// Export for Vercel serverless
export default app;
