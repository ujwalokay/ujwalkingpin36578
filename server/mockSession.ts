import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to inject mock session data for demo mode
 * This replaces the need for actual session middleware
 */
export function mockSessionMiddleware(req: Request, res: Response, next: NextFunction) {
  // Create mock session object with demo admin user
  if (!req.session) {
    (req as any).session = {
      userId: 'demo-user',
      username: 'Demo User',
      role: 'admin',
      onboardingCompleted: true,
      // Add any other session properties that routes might expect
      cookie: {
        maxAge: null,
        httpOnly: true,
        secure: false
      },
      // Mock session methods
      save: (callback?: (err?: any) => void) => {
        if (callback) callback();
      },
      destroy: (callback: (err?: any) => void) => {
        if (callback) callback();
      },
      regenerate: (callback: (err?: any) => void) => {
        if (callback) callback();
      },
      reload: (callback: (err?: any) => void) => {
        if (callback) callback();
      }
    };
  }

  // Also mock req.user for compatibility
  if (!req.user) {
    (req as any).user = {
      id: 'demo-user',
      username: 'Demo User',
      role: 'admin',
      onboardingCompleted: true
    };
  }

  next();
}
