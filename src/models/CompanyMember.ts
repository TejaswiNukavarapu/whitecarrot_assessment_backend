import mongoose, { Schema, Document } from 'mongoose';

export interface ICompanyMember extends Document {
  company_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  created_at: Date;
}

const CompanyMemberSchema = new Schema<ICompanyMember>({
  company_id: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  created_at: { type: Date, default: Date.now },
});

export const CompanyMember = mongoose.model<ICompanyMember>('CompanyMember', CompanyMemberSchema);



