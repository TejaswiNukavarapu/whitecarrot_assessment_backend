import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT || '4000',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/brand-careers-hub',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set. Using a default development secret.');
}



