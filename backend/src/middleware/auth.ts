import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  // Check for token in Authorization header (Bearer)
  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  // If no header token, check URL query parameter (for SSE connections)
  if (!token && req.query.token) {
    const queryToken = req.query.token;
    if (typeof queryToken === 'string') {
      token = queryToken;
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Access token required'
      }
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as JwtPayload;
    req.user = {
      userId: decoded.userId,
      role: decoded.role
    };
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Invalid or expired token'
      }
    });
  }
};