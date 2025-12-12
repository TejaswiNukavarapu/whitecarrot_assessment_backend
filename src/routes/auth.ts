import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User';
import { UserRole } from '../models/UserRole';
import { CompanyMember } from '../models/CompanyMember';
import { Company } from '../models/Company';
import { signToken } from '../utils/token';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
});

router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const { email, password, fullName } = parsed.data;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash, full_name: fullName });
  await UserRole.create({ user_id: user._id, role: 'candidate' });

  const token = signToken(user._id.toString());
  res.json({ token, user: toProfile(user), roles: ['candidate'], company: null });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const { email, password } = parsed.data;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

  const payload = await buildUserContext(user._id.toString());
  const token = signToken(user._id.toString());
  res.json({ token, ...payload });
});

router.get('/me', requireAuth(), async (req: AuthRequest, res) => {
  const payload = await buildUserContext(req.userId!);
  res.json(payload);
});

async function buildUserContext(userId: string) {
  const user = await User.findById(userId);
  const roles = await UserRole.find({ user_id: userId });
  const membership = await CompanyMember.findOne({ user_id: userId });
  let company = null;

  if (membership) {
    company = await Company.findById(membership.company_id);
  }

  return {
    user: user ? toProfile(user) : null,
    roles: roles.map((r) => ({ id: r._id.toString(), user_id: userId, role: r.role })),
    company,
  };
}

function toProfile(user: any) {
  return {
    id: user._id.toString(),
    email: user.email,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    created_at: user.created_at?.toISOString?.() ?? user.created_at,
    updated_at: user.updated_at?.toISOString?.() ?? user.updated_at,
  };
}

export default router;

