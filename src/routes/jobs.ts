import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Job } from '../models/Job';
import { Company } from '../models/Company';
import { CompanyMember } from '../models/CompanyMember';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { companyId, active } = req.query;
    const filter: any = {};
    
    if (companyId) {
      // Validate ObjectId format
      if (mongoose.Types.ObjectId.isValid(companyId as string)) {
        filter.company_id = new mongoose.Types.ObjectId(companyId as string);
      } else {
        return res.status(400).json({ message: 'Invalid company ID format' });
      }
    }
    
    if (active === 'true') {
      filter.is_active = true;
    }
    
    const jobs = await Job.find(filter).sort({ posted_at: -1 });
    res.json(jobs);
  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch jobs' });
  }
});

router.get('/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    
    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: 'Invalid company ID format' });
    }
    
    const jobs = await Job.find({ 
      company_id: new mongoose.Types.ObjectId(companyId), 
      is_active: true 
    }).sort({ posted_at: -1 });
    
    res.json(jobs);
  } catch (error: any) {
    console.error('Error fetching jobs by company:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch jobs' });
  }
});

router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({ message: 'Company slug is required' });
    }
    
    const company = await Company.findOne({ slug });
    if (!company) {
      return res.json([]);
    }
    
    const jobs = await Job.find({ 
      company_id: company._id, 
      is_active: true 
    }).sort({ posted_at: -1 });
    
    res.json(jobs);
  } catch (error: any) {
    console.error('Error fetching jobs by slug:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch jobs' });
  }
});

// Get single job by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Job ID is required' });
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid job ID format' });
    }
    
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    res.json(job);
  } catch (error: any) {
    console.error('Error fetching job:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch job' });
  }
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
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    // Validate company_id ObjectId format
    if (!mongoose.Types.ObjectId.isValid(parsed.data.company_id)) {
      return res.status(400).json({ message: 'Invalid company ID format' });
    }

    const membership = await CompanyMember.findOne({ user_id: req.userId });
    if (!membership || membership.company_id.toString() !== parsed.data.company_id) {
      return res.status(403).json({ message: 'Not authorized for this company' });
    }

    const job = await Job.create({ 
      ...parsed.data,
      company_id: new mongoose.Types.ObjectId(parsed.data.company_id),
      posted_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    res.status(201).json(job);
  } catch (error: any) {
    console.error('Error creating job:', error);
    res.status(500).json({ message: error.message || 'Failed to create job' });
  }
});

const updateSchema = createSchema.partial().extend({
  is_active: z.boolean().optional(),
});

router.patch('/:id', requireAuth(['admin', 'recruiter']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Job ID is required' });
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid job ID format' });
    }
    
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    const membership = await CompanyMember.findOne({ user_id: req.userId });
    const job = await Job.findById(id);
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    if (!membership || membership.company_id.toString() !== job.company_id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this company' });
    }

    // Validate company_id if being updated
    if (parsed.data.company_id) {
      if (!mongoose.Types.ObjectId.isValid(parsed.data.company_id)) {
        return res.status(400).json({ message: 'Invalid company ID format' });
      }
      parsed.data.company_id = new mongoose.Types.ObjectId(parsed.data.company_id) as any;
    }

    const updated = await Job.findByIdAndUpdate(
      id, 
      { ...parsed.data, updated_at: new Date() }, 
      { new: true }
    );
    
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating job:', error);
    res.status(500).json({ message: error.message || 'Failed to update job' });
  }
});

router.delete('/:id', requireAuth(['admin', 'recruiter']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Job ID is required' });
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid job ID format' });
    }
    
    const membership = await CompanyMember.findOne({ user_id: req.userId });
    const job = await Job.findById(id);
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    if (!membership || membership.company_id.toString() !== job.company_id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this company' });
    }
    
    await Job.findByIdAndDelete(id);
    res.status(204).end();
  } catch (error: any) {
    console.error('Error deleting job:', error);
    res.status(500).json({ message: error.message || 'Failed to delete job' });
  }
});

export default router;
