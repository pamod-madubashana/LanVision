import User from '../models/User';
import bcrypt from 'bcryptjs';
import logger from './logger';

export const initializeDefaultAdmin = async (): Promise<void> => {
  try {
    // Check if any users exist in the database
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      // Hash the default password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash('password', saltRounds);
      
      // Create the default admin user
      const adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin'
      });
      
      await adminUser.save();
      
      logger.info('Default admin user created successfully');
      logger.info(`Username: admin`);
      logger.info(`Email: admin@example.com`);
      logger.info(`Password: password (for testing purposes)`);
    } else {
      logger.info(`Database already contains ${userCount} user(s). Skipping default admin creation.`);
    }
  } catch (error) {
    logger.error('Error initializing default admin user:', error);
    throw error;
  }
};