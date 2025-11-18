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

// Import route registration - this needs to be done synchronously
// We'll use a lazy-loading approach to handle the async routes
let routesInitialized = false;
let routesPromise: Promise<void> | null = null;

// Middleware to ensure routes are initialized before handling requests
app.use(async (req, res, next) => {
  if (!routesInitialized) {
    if (!routesPromise) {
      routesPromise = (async () => {
        try {
          // Dynamically import and register routes
          const { registerRoutes } = await import('../server/routes');
          await registerRoutes(app);
          routesInitialized = true;
          console.log('[Vercel] API routes registered successfully');
        } catch (error) {
          console.error('[Vercel] Error registering routes:', error);
          throw error;
        }
      })();
    }
    await routesPromise;
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

// Export for Vercel serverless
export default app;
