import bcrypt from 'bcryptjs';
import { connectDb } from './db/connection';
import { User } from './models/User';
import { UserRole } from './models/UserRole';
import { Company } from './models/Company';
import { CompanyMember } from './models/CompanyMember';
import { Job } from './models/Job';

async function seed() {
  await connectDb();
  await User.deleteMany({});
  await UserRole.deleteMany({});
  await Company.deleteMany({});
  await CompanyMember.deleteMany({});
  await Job.deleteMany({});

  const passwordHash = await bcrypt.hash('Demo123!', 10);

  const recruiter1 = await User.create({ email: 'recruiter@techflow.io', passwordHash, full_name: 'TechFlow Recruiter' });
  const recruiter2 = await User.create({ email: 'recruiter@greenleaf.io', passwordHash, full_name: 'GreenLeaf Recruiter' });
  const candidate = await User.create({ email: 'candidate@demo.io', passwordHash, full_name: 'Demo Candidate' });

  await UserRole.create([
    { user_id: recruiter1._id, role: 'recruiter' },
    { user_id: recruiter2._id, role: 'recruiter' },
    { user_id: candidate._id, role: 'candidate' },
  ]);

  const sampleCompanies = [
    {
      slug: 'techflow',
      name: 'TechFlow',
      logo_url: '',
      banner_url: '',
      culture_video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      primary_color: '#2563eb',
      secondary_color: '#1e40af',
      tagline: 'Building the future of workflow automation',
      description: "TechFlow is a leading SaaS company revolutionizing how teams collaborate and automate their workflows. Founded in 2019, we've grown to serve over 10,000 companies worldwide.",
      content_sections: [
        { id: 'sec-1', type: 'about', title: 'About Us', content: 'We believe in empowering teams to do their best work. Our platform combines cutting-edge AI with intuitive design to help businesses automate repetitive tasks and focus on what matters most.', order: 1, isVisible: true },
        { id: 'sec-2', type: 'culture', title: 'Life at TechFlow', content: 'At TechFlow, we foster a culture of innovation, collaboration, and continuous learning. Our team is distributed across 15 countries, united by our mission to transform how work gets done.', order: 2, isVisible: true },
        { id: 'sec-3', type: 'benefits', title: 'Benefits & Perks', content: '• Competitive salary & equity\n• Remote-first culture\n• Unlimited PTO\n• Health, dental & vision insurance\n• $2,000 annual learning budget\n• Home office stipend\n• Quarterly team retreats', order: 3, isVisible: true },
        { id: 'sec-4', type: 'values', title: 'Our Values', content: '**Customer First** - Every decision starts with our customers\n**Move Fast** - We ship, learn, and iterate quickly\n**Own It** - Take responsibility and make an impact\n**Stay Curious** - Never stop learning and growing', order: 4, isVisible: true },
      ],
      is_published: true,
    },
    {
      slug: 'greenleaf',
      name: 'GreenLeaf Analytics',
      logo_url: '',
      banner_url: '',
      culture_video_url: '',
      primary_color: '#059669',
      secondary_color: '#047857',
      tagline: 'Sustainable data for a greener tomorrow',
      description: 'GreenLeaf Analytics helps companies measure, track, and reduce their environmental impact through intelligent data analytics.',
      content_sections: [
        { id: 'sec-5', type: 'about', title: 'Our Mission', content: "We're on a mission to make sustainability measurable and actionable. Our platform provides real-time insights that help organizations reduce their carbon footprint.", order: 1, isVisible: true },
        { id: 'sec-6', type: 'culture', title: 'Join Our Team', content: "We're a passionate team of data scientists, engineers, and sustainability experts working together to combat climate change through technology.", order: 2, isVisible: true },
      ],
      is_published: true,
    },
  ];

  const [techflow, greenleaf] = await Company.insertMany(sampleCompanies);

  await CompanyMember.create([
    { company_id: techflow._id, user_id: recruiter1._id },
    { company_id: greenleaf._id, user_id: recruiter2._id },
  ]);

  const jobs = [
    // TechFlow
    {
      company_id: techflow._id,
      title: 'Senior Frontend Engineer',
      department: 'Engineering',
      location: 'San Francisco, CA',
      employment_type: 'full-time',
      salary_range: '$150,000 - $200,000',
      description: "We're looking for a Senior Frontend Engineer to help build the next generation of our workflow automation platform. You'll work closely with design and product teams to create beautiful, performant user interfaces.",
      requirements: [
        '5+ years of experience with React/TypeScript',
        'Strong understanding of modern CSS and responsive design',
        'Experience with state management (Redux, Zustand, etc.)',
        'Excellent communication skills',
        'Experience with testing frameworks',
      ],
      benefits: ['Health insurance', 'Equity', 'Remote work', 'Learning budget'],
      posted_at: new Date('2024-03-15T10:00:00Z'),
      is_active: true,
    },
    {
      company_id: techflow._id,
      title: 'Product Designer',
      department: 'Design',
      location: 'Remote',
      employment_type: 'full-time',
      salary_range: '$120,000 - $160,000',
      description: 'Join our design team to craft intuitive experiences that help millions of users automate their work. You will own the end-to-end design process from research to implementation.',
      requirements: [
        '3+ years of product design experience',
        'Strong portfolio demonstrating UX/UI skills',
        'Proficiency in Figma',
        'Experience with design systems',
        'Ability to conduct user research',
      ],
      benefits: [],
      posted_at: new Date('2024-03-10T09:00:00Z'),
      is_active: true,
    },
    {
      company_id: techflow._id,
      title: 'Backend Engineer',
      department: 'Engineering',
      location: 'New York, NY',
      employment_type: 'full-time',
      salary_range: '$130,000 - $170,000',
      description: 'We need a Backend Engineer to help scale our infrastructure and build robust APIs. You will work on high-throughput systems processing millions of workflow executions daily.',
      requirements: [
        '3+ years of backend development experience',
        'Proficiency in Node.js or Python',
        'Experience with PostgreSQL and Redis',
        'Understanding of microservices architecture',
        'Experience with AWS or GCP',
      ],
      benefits: [],
      posted_at: new Date('2024-03-12T14:00:00Z'),
      is_active: true,
    },
    // GreenLeaf
    {
      company_id: greenleaf._id,
      title: 'Data Scientist',
      department: 'Data Science',
      location: 'Boston, MA',
      employment_type: 'full-time',
      salary_range: '$140,000 - $180,000',
      description: 'Help us build ML models that predict environmental impact and recommend sustainable practices. You will work with large datasets from IoT sensors and public sources.',
      requirements: [
        '5+ years in data science',
        'Experience with Python, TensorFlow/PyTorch',
        'Background in environmental science is a plus',
        'Strong statistics knowledge',
        'Experience with big data tools',
      ],
      benefits: [],
      posted_at: new Date('2024-03-14T10:00:00Z'),
      is_active: true,
    },
    {
      company_id: greenleaf._id,
      title: 'Sustainability Consultant',
      department: 'Consulting',
      location: 'Remote',
      employment_type: 'remote',
      salary_range: '$90,000 - $120,000',
      description: 'Work directly with clients to help them understand and act on their sustainability data. You will translate complex analytics into actionable recommendations.',
      requirements: [
        '3+ years in sustainability consulting',
        'Knowledge of ESG frameworks',
        'Strong presentation skills',
        'Experience with carbon accounting',
        'Client-facing experience',
      ],
      benefits: [],
      posted_at: new Date('2024-03-16T11:00:00Z'),
      is_active: true,
    },
  ];

  await Job.insertMany(jobs);

  console.log('Seed completed');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});



