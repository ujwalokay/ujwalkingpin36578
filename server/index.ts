import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { registerAuthRoutes } from "./auth";
import { setupGoogleAuth, getSession } from "./googleAuth";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { cleanupScheduler } from "./scheduler";
import { csrfProtectionInit, getCsrfToken } from "./csrf";
import passport from "passport";

const app = express();

// Trust proxy - required for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5000', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins OR allow same-origin requests
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Allow same-origin requests (frontend and backend on same domain)
    // This handles cases like Render where both are served from the same URL
    const requestHost = origin.replace(/^https?:\/\//, '');
    const serverHost = process.env.RENDER_EXTERNAL_URL?.replace(/^https?:\/\//, '') || '';
    
    if (serverHost && requestHost === serverHost) {
      return callback(null, true);
    }
    
    // In production, reject if not in allowed list
    console.warn(`CORS blocked request from origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security headers with enhanced CSP
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    } : false, // Disable CSP in development for Vite HMR
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    frameguard: {
      action: 'deny'
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    }
  })
);

// Request size limits to prevent DOS attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Cookie parser for CSRF protection
app.use(cookieParser());

// HTTPS enforcement in production (after body parsers, only for HTML requests)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Skip for API requests and assets
    if (req.path.startsWith('/api/') || req.path.startsWith('/assets/')) {
      return next();
    }
    
    // Check if request is already HTTPS
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (proto === 'https' || req.secure) {
      return next();
    }
    
    // Only redirect GET requests to avoid losing POST data
    if (req.method === 'GET' || req.method === 'HEAD') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    
    next();
  });
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database with defaults
  await storage.initializeDefaults();
  
  // AUTOMATIC CLEANUP DISABLED - Owner wants to keep ALL data forever
  // Data is valuable for tax records, customer history, and business analytics
  // Using multiple Neon free projects (6 × 512 MB = 3 GB) to store all data
  // cleanupScheduler.start();
  
  // DEMO MODE: Use mock session instead of real authentication
  // For production deployment, restore the session/OAuth setup below
  const { mockSessionMiddleware } = await import("./mockSession");
  app.use(mockSessionMiddleware);
  
  // Real session setup (disabled for demo mode):
  // app.use(getSession());
  // app.use(passport.initialize());
  // app.use(passport.session());
  // await setupGoogleAuth(app);
  // registerAuthRoutes(app);
  
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    
    // Log error details for debugging (but don't expose to client)
    console.error('Error occurred:', {
      path: req.path,
      method: req.method,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      userId: req.session?.userId,
      ip: req.ip
    });
    
    // Send generic error message to prevent information leakage
    const message = status === 500 
      ? "An internal error occurred. Please try again later."
      : err.message || "An error occurred";

    res.status(status).json({ 
      message,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
