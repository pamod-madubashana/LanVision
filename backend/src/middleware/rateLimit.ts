import { Request, Response, NextFunction } from 'express';

// Rate limiting middleware
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

export const rateLimiter = (windowMs: number = 900000, maxRequests: number = 100) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    Object.keys(rateLimitStore).forEach(key => {
      if (rateLimitStore[key].resetTime < now) {
        delete rateLimitStore[key];
      }
    });

    if (!rateLimitStore[clientIP]) {
      rateLimitStore[clientIP] = {
        count: 0,
        resetTime: now + windowMs
      };
    }

    rateLimitStore[clientIP].count++;

    const remaining = Math.max(0, maxRequests - rateLimitStore[clientIP].count);
    const resetTime = new Date(rateLimitStore[clientIP].resetTime).toUTCString();

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    if (rateLimitStore[clientIP].count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests, please try again later'
        }
      });
    }

    next();
  };
};