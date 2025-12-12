import { Router } from 'express';
import { z } from 'zod';
import { Job } from '../models/Job';
import { Company } from '../models/Company';
import { CompanyMember } from '../models/CompanyMember';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
  const { companyId, active } = req.query;
  const filter: any = {};
  if (companyId) filter.company_id = companyId;
  if (active === 'true') filter.is_active = true;
  const jobs = await Job.find(filter).sort({ posted_at: -1 });
  res.json(jobs);
});

router.get('/company/:companyId', async (req, res) => {
  const jobs = await Job.find({ company_id: req.params.companyId, is_active: true }).sort({ posted_at: -1 });
  res.json(jobs);
});

router.get('/slug/:slug', async (req, res) => {
  const company = await Company.findOne({ slug: req.params.slug });
  if (!company) return res.json([]);
  const jobs = await Job.find({ company_id: company._id, is_active: true }).sort({ posted_at: -1 });
  res.json(jobs);
});

const createSchema = z.object({
  company_id: z.string(),
  title: z.string(),
  department: z.string().optional(),
  location: z.string(),
  employment_type: z.enum(['full-time', 'part-time', 'contract', 'internship', 'remote']),
  description: z.string(),
  requirements: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  salary_range: z.string().optional(),
});

router.post('/', requireAuth(['admin', 'recruiter']), async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const membership = await CompanyMember.findOne({ user_id: req.userId });
  if (!membership || membership.company_id.toString() !== parsed.data.company_id) {
    return res.status(403).json({ message: 'Not authorized for this company' });
  }

  const job = await Job.create({ ...parsed.data, posted_at: new Date() });
  res.status(201).json(job);
});

const updateSchema = createSchema.partial().extend({
  is_active: z.boolean().optional(),
});

router.patch('/:id', requireAuth(['admin', 'recruiter']), async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const membership = await CompanyMember.findOne({ user_id: req.userId });
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ message: 'Not found' });
  if (!membership || membership.company_id.toString() !== job.company_id.toString()) {
    return res.status(403).json({ message: 'Not authorized for this company' });
  }

  const updated = await Job.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
  res.json(updated);
});

router.delete('/:id', requireAuth(['admin', 'recruiter']), async (req: AuthRequest, res) => {
  const membership = await CompanyMember.findOne({ user_id: req.userId });
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ message: 'Not found' });
  if (!membership || membership.company_id.toString() !== job.company_id.toString()) {
    return res.status(403).json({ message: 'Not authorized for this company' });
  }
  await Job.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

export default router;



