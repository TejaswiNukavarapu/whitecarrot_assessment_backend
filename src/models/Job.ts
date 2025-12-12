import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  company_id: mongoose.Types.ObjectId;
  title: string;
  department: string;
  location: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'internship' | 'remote';
  description: string;
  requirements: string[];
  benefits: string[];
  salary_range?: string;
  is_active: boolean;
  posted_at: Date;
  created_at: Date;
  updated_at: Date;
}

const JobSchema = new Schema<IJob>({
  company_id: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  title: { type: String, required: true },
  department: { type: String },
  location: { type: String, required: true },
  employment_type: { type: String, enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'], required: true },
  description: { type: String },
  requirements: { type: [String], default: [] },
  benefits: { type: [String], default: [] },
  salary_range: { type: String },
  is_active: { type: Boolean, default: true },
  posted_at: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

JobSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

export const Job = mongoose.model<IJob>('Job', JobSchema);



