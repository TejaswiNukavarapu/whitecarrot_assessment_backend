import mongoose from 'mongoose';
import { env } from '../config/env';

export async function connectDb() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(env.mongoUri);
  console.log('Connected to MongoDB');
}



