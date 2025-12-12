import { Router } from 'express';
import { z } from 'zod';
import { JobApplication } from '../models/JobApplication';
import { Job } from '../models/Job';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/me', requireAuth(['candidate', 'recruiter', 'admin']), async (req: AuthRequest, res) => {
  const apps = await JobApplication.find({ candidate_id: req.userId }).sort({ applied_at: -1 }).populate('job_id');
  const formatted = apps.map((a) => ({
    ...a.toObject(),
    id: a._id,
    job: a.get('job_id'),
  }));
  res.json(formatted);
});

const applySchema = z.object({
  jobId: z.string(),
  coverLetter: z.string().optional(),
  resumeUrl: z.string().optional(),
});

router.post('/', requireAuth(['candidate', 'recruiter', 'admin']), async (req: AuthRequest, res) => {
  const parsed = applySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
  const { jobId, coverLetter, resumeUrl } = parsed.data;

  const existing = await JobApplication.findOne({ job_id: jobId, candidate_id: req.userId });
  if (existing) return res.status(400).json({ message: 'Already applied' });

  const job = await Job.findById(jobId);
  if (!job) return res.status(404).json({ message: 'Job not found' });

  const app = await JobApplication.create({
    job_id: jobId,
    candidate_id: req.userId,
    cover_letter: coverLetter,
    resume_url: resumeUrl,
  });
  res.status(201).json(app);
});

router.patch('/:id', requireAuth(['candidate', 'recruiter', 'admin']), async (req: AuthRequest, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ message: 'Status required' });
  const app = await JobApplication.findById(req.params.id);
  if (!app) return res.status(404).json({ message: 'Not found' });
  if (app.candidate_id.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden' });
  app.status = status;
  await app.save();
  res.json(app);
});

export default router;



