import mongoose, { Schema, Document } from 'mongoose';

export type AppRole = 'admin' | 'recruiter' | 'candidate';

export interface IUserRole extends Document {
  user_id: mongoose.Types.ObjectId;
  role: AppRole;
}

const UserRoleSchema = new Schema<IUserRole>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['admin', 'recruiter', 'candidate'], required: true },
});

export const UserRole = mongoose.model<IUserRole>('UserRole', UserRoleSchema);



