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
  role: z.enum(['candidate', 'recruiter', 'admin']).optional(),
  companyId: z.string().optional(),
});

router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const { email, password, fullName, role = 'candidate', companyId } = parsed.data;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash, full_name: fullName });
  
  // Create user role
  await UserRole.create({ user_id: user._id, role });

  // If recruiter/admin and companyId provided, associate with company
  let company = null;
  if ((role === 'recruiter' || role === 'admin') && companyId) {
    const companyExists = await Company.findById(companyId);
    if (companyExists) {
      await CompanyMember.create({
        user_id: user._id,
        company_id: companyId,
      });
      company = companyExists;
    }
  }

  const token = signToken(user._id.toString());
  const payload = await buildUserContext(user._id.toString());
  res.json({ token, ...payload });
});

// Recruiter signup endpoint (convenience endpoint)
const recruiterSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
  companyId: z.string().optional(),
});

router.post('/signup/recruiter', async (req, res) => {
  const parsed = recruiterSignupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const { email, password, fullName, companyId } = parsed.data;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash, full_name: fullName });
  
  // Create recruiter role
  await UserRole.create({ user_id: user._id, role: 'recruiter' });

  // Associate with company if provided
  let company = null;
  if (companyId) {
    const companyExists = await Company.findById(companyId);
    if (companyExists) {
      await CompanyMember.create({
        user_id: user._id,
        company_id: companyId,
      });
      company = companyExists;
    }
  }

  const token = signToken(user._id.toString());
  const payload = await buildUserContext(user._id.toString());
  res.json({ token, ...payload });
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

// Get all users (no auth required)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-passwordHash');
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const roles = await UserRole.find({ user_id: user._id });
        const membership = await CompanyMember.findOne({ user_id: user._id });
        let company = null;
        if (membership) {
          company = await Company.findById(membership.company_id);
        }
        return {
          ...toProfile(user),
          roles: roles.map((r) => ({ id: r._id.toString(), user_id: user._id.toString(), role: r.role })),
          company: company ? {
            id: company._id.toString(),
            name: company.name,
            slug: company.slug,
          } : null,
        };
      })
    );
    res.json(usersWithRoles);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch users' });
  }
});

// Get user by ID (no auth required)
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const payload = await buildUserContext(userId);
    res.json(payload);
  } catch (error: any) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch user' });
  }
});

// Delete user (no auth required)
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete associated data
    await UserRole.deleteMany({ user_id: userId });
    await CompanyMember.deleteMany({ user_id: userId });
    
    // Delete the user
    await User.findByIdAndDelete(userId);

    res.json({ message: 'User deleted successfully', userId });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: error.message || 'Failed to delete user' });
  }
});

// Update user role endpoint
const updateRoleSchema = z.object({
  role: z.enum(['candidate', 'recruiter', 'admin']),
  companyId: z.string().optional(),
});

router.patch('/users/:userId/role', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const parsed = updateRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    const { role, companyId } = parsed.data;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if requesting user is admin or updating themselves
    const requesterRoles = await UserRole.find({ user_id: req.userId });
    const isAdmin = requesterRoles.some(r => r.role === 'admin');
    
    if (!isAdmin && req.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden: Only admins can update other users' });
    }

    // Check if role already exists
    const existingRole = await UserRole.findOne({ 
      user_id: userId, 
      role: role 
    });
    
    if (!existingRole) {
      // Add new role (users can have multiple roles)
      await UserRole.create({
        user_id: userId,
        role: role,
      });
    }

    // Associate with company if provided
    if (companyId) {
      const company = await Company.findById(companyId);
      if (company) {
        const existingMember = await CompanyMember.findOne({ user_id: userId });
        if (!existingMember) {
          await CompanyMember.create({
            user_id: userId,
            company_id: companyId,
          });
        } else if (existingMember.company_id.toString() !== companyId) {
          // Update company association
          existingMember.company_id = companyId as any;
          await existingMember.save();
        }
      }
    }

    const payload = await buildUserContext(userId);
    res.json(payload);
  } catch (error: any) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: error.message || 'Failed to update user role' });
  }
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
