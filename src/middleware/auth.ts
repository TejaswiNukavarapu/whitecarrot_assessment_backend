import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '../models/UserRole';

export interface AuthRequest extends Request {
  userId?: string;
}

export function requireAuth(requiredRoles?: ('admin' | 'recruiter' | 'candidate')[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : undefined;

      if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const decoded = jwt.verify(token, env.jwtSecret) as { sub: string };
      req.userId = decoded.sub;

      if (requiredRoles && requiredRoles.length > 0) {
        const roles = await UserRole.find({ user_id: decoded.sub });
        const hasRole = roles.some((r) => requiredRoles.includes(r.role));
        if (!hasRole) return res.status(403).json({ message: 'Forbidden' });
      }

      next();
    } catch (err) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  };
}



