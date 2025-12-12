import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { connectDb } from './db/connection';
import authRoutes from './routes/auth';
import companyRoutes from './routes/companies';
import jobRoutes from './routes/jobs';
import applicationRoutes from './routes/applications';
import { errorHandler } from './middleware/error';

async function start() {
  await connectDb();

  const app = express();
  const allowedOrigins = [env.clientUrl, 'http://localhost:5173', 'http://localhost:8083'];
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/auth', authRoutes);
  app.use('/companies', companyRoutes);
  app.use('/jobs', jobRoutes);
  app.use('/applications', applicationRoutes);

  app.use(errorHandler);

  app.listen(env.port, () => {
    console.log(`API running on http://localhost:${env.port}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

