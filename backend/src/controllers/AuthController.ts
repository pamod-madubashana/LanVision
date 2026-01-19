import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User';
import logger from '../utils/logger';

interface LoginRequest {
  username: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export class AuthController {
  // Register new user
  static async register(req: Request, res: Response) {
    try {
      const { username, email, password, confirmPassword }: RegisterRequest = req.body;

      // Validate input
      if (!username || !email || !password || !confirmPassword) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'All fields are required'
          }
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Passwords do not match'
          }
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ username }, { email }]
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Username or email already exists'
          }
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = new User({
        username,
        email,
        password: hashedPassword,
        role: 'user'
      });

      await user.save();

      // Create token
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      logger.audit(user._id.toString(), 'register', { username, email });

      res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        }
      });

    } catch (error: any) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error'
        }
      });
    }
  }

  // Login user
  static async login(req: Request, res: Response) {
    try {
      const { username, password }: LoginRequest = req.body;

      // Validate input
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Username and password are required'
          }
        });
      }

      // Find user
      const user = await User.findOne({
        $or: [{ username }, { email: username }]
      }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid credentials'
          }
        });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid credentials'
          }
        });
      }

      // Create token
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      logger.audit(user._id.toString(), 'login', { username: user.username });

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        }
      });

    } catch (error: any) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error'
        }
      });
    }
  }

  // Get current user profile
  static async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required'
          }
        });
      }

      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found'
          }
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
          }
        }
      });

    } catch (error: any) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error'
        }
      });
    }
  }

  // Create admin user (for initial setup)
  static async createAdmin(req: Request, res: Response) {
    try {
      // Check if admin already exists
      const adminExists = await User.findOne({ role: 'admin' });
      
      if (adminExists) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Admin user already exists'
          }
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      // Create admin user
      const admin = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin'
      });

      await admin.save();

      logger.info('Admin user created successfully');

      res.status(201).json({
        success: true,
        message: 'Admin user created successfully',
        data: {
          username: admin.username,
          email: admin.email
        }
      });

    } catch (error: any) {
      logger.error('Create admin error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error'
        }
      });
    }
  }
}