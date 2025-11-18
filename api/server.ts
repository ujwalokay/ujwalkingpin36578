import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { mockSessionMiddleware } from '../server/mockSession';

const app = express();

// Trust proxy for Vercel
app.set('trust proxy', 1);

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Vercel serverless, mobile apps)
    if (!origin) return callback(null, true);
    
    // Allow configured origins
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow same-origin requests
    if (process.env.VERCEL_URL && origin.includes(process.env.VERCEL_URL)) {
      return callback(null, true);
    }
    
    callback(null, true); // For now, allow all origins in demo mode
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// Security headers (optimized for Vercel)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Request size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

// Mock session for demo mode - provides fake session data to routes
app.use(mockSessionMiddleware);

// Import route registration - use the pure function that doesn't create a server
let routesInitialized = false;
let routesPromise: Promise<void> | null = null;

// Lazy-load routes to handle async imports and storage initialization
app.use(async (req, res, next) => {
  if (!routesInitialized) {
    if (!routesPromise) {
      routesPromise = (async () => {
        try {
          console.log('[Vercel] Initializing storage...');
          const { storage } = await import('../server/storage');
          await storage.initializeDefaults();
          console.log('[Vercel] Storage initialized successfully');
          
          console.log('[Vercel] Registering routes...');
          const { registerAppRoutes } = await import('../server/routes');
          await registerAppRoutes(app);
          routesInitialized = true;
          console.log('[Vercel] API routes registered successfully');
        } catch (error) {
          console.error('[Vercel] Initialization error:', error);
          throw error;
        }
      })();
    }
    try {
      await routesPromise;
    } catch (error) {
      console.error('[Vercel] Failed to initialize:', error);
      // Reset promise to allow retry on next request (prevents poisoning)
      routesPromise = null;
      return res.status(500).json({
        error: 'Server initialization failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        retry: 'This was a transient error. Please try again.'
      });
    }
  }
  next();
});

// Health check endpoint (available immediately)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: 'vercel',
    routesInitialized 
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = err.status || err.statusCode || 500;
  
  console.error('[Vercel] Error occurred:', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  });
  
  res.status(status).json({ 
    error: 'An error occurred',
    message: status === 500 
      ? "An internal error occurred. Please try again later."
      : err.message || "An error occurred",
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

// Export for Vercel serverless
export default app;
