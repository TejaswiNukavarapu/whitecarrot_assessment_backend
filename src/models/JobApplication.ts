import mongoose, { Schema, Document } from 'mongoose';

export type ApplicationStatus =
  | 'pending'
  | 'reviewing'
  | 'interview'
  | 'offered'
  | 'rejected'
  | 'withdrawn';

export interface IJobApplication extends Document {
  job_id: mongoose.Types.ObjectId;
  candidate_id: mongoose.Types.ObjectId;
  status: ApplicationStatus;
  resume_url?: string;
  cover_letter?: string;
  applied_at: Date;
  updated_at: Date;
}

const JobApplicationSchema = new Schema<IJobApplication>({
  job_id: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  candidate_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'reviewing', 'interview', 'offered', 'rejected', 'withdrawn'], default: 'pending' },
  resume_url: { type: String },
  cover_letter: { type: String },
  applied_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

JobApplicationSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

export const JobApplication = mongoose.model<IJobApplication>('JobApplication', JobApplicationSchema);



