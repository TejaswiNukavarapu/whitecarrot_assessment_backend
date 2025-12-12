import { Router } from 'express';
import { z } from 'zod';
import { Company } from '../models/Company';
import { CompanyMember } from '../models/CompanyMember';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
  const published = req.query.published === 'true';
  const query = published ? { is_published: true } : {};
  const companies = await Company.find(query);
  res.json(companies);
});

router.get('/slug/:slug', async (req, res) => {
  const company = await Company.findOne({ slug: req.params.slug });
  if (!company) return res.status(404).json({ message: 'Not found' });
  res.json(company);
});

router.get('/:id', async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ message: 'Not found' });
  res.json(company);
});

const updateSchema = z.object({
  name: z.string().optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  logo_url: z.string().optional(),
  banner_url: z.string().optional(),
  culture_video_url: z.string().optional(),
  is_published: z.boolean().optional(),
  content_sections: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      title: z.string(),
      content: z.string(),
      order: z.number(),
      isVisible: z.boolean(),
    })
  ).optional(),
});

router.patch('/:id', requireAuth(['admin', 'recruiter']), async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  const membership = await CompanyMember.findOne({ user_id: req.userId });
  if (!membership || membership.company_id.toString() !== req.params.id) {
    return res.status(403).json({ message: 'Not authorized for this company' });
  }

  const updated = await Company.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
  res.json(updated);
});

export default router;



