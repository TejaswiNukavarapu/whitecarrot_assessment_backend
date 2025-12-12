import mongoose, { Schema, Document } from 'mongoose';

export interface IContentSection {
  id: string;
  type: 'about' | 'culture' | 'benefits' | 'team' | 'values' | 'custom';
  title: string;
  content: string;
  order: number;
  isVisible: boolean;
}

export interface ICompany extends Document {
  slug: string;
  name: string;
  logo_url?: string;
  banner_url?: string;
  culture_video_url?: string;
  primary_color: string;
  secondary_color: string;
  tagline?: string;
  description?: string;
  content_sections: IContentSection[];
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

const ContentSectionSchema = new Schema<IContentSection>({
  id: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  order: { type: Number, required: true },
  isVisible: { type: Boolean, default: true },
});

const CompanySchema = new Schema<ICompany>({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  logo_url: { type: String },
  banner_url: { type: String },
  culture_video_url: { type: String },
  primary_color: { type: String, required: true },
  secondary_color: { type: String, required: true },
  tagline: { type: String },
  description: { type: String },
  content_sections: { type: [ContentSectionSchema], default: [] },
  is_published: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

CompanySchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

export const Company = mongoose.model<ICompany>('Company', CompanySchema);



