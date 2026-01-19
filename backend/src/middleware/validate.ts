import { Request, Response, NextFunction } from 'express';

// Validation error class
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

// Validate required fields
export const validateRequiredFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingFields: string[] = [];
    
    fields.forEach(field => {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
          fields: missingFields
        }
      });
    }

    next();
  };
};

// Validate email format
export const validateEmail = (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (email && !emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid email format'
      }
    });
  }
  
  next();
};

// Validate target format for network scanning
export const validateTargetFormat = (req: Request, res: Response, next: NextFunction) => {
  const { target } = req.body;
  
  if (!target) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Target is required'
      }
    });
  }

  // Allow digits, dots, slashes, dashes, and CIDR notation
  const targetRegex = /^[\d\.\-\/]+$/;
  
  if (!targetRegex.test(target)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid target format. Only digits, dots, dashes, and slashes allowed'
      }
    });
  }

  // Check for private IP ranges (RFC1918) unless admin override is enabled
  const isAdminOverride = process.env.ADMIN_ALLOW_PUBLIC_SCAN === 'true';
  const isPrivateRange = /^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^192\.168\./.test(target);
  
  if (!isAdminOverride && !isPrivateRange) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Scanning public IP ranges is restricted. Only private networks allowed (10.x.x.x, 172.16-31.x.x, 192.168.x.x)'
      }
    });
  }

  next();
};

// Validate scan profile
export const validateScanProfile = (req: Request, res: Response, next: NextFunction) => {
  const { profile } = req.body;
  const validProfiles = ['quick', 'full'];
  
  if (profile && !validProfiles.includes(profile)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid scan profile. Valid options: quick, full'
      }
    });
  }
  
  next();
};