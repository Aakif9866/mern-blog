import { Schema, model, type Types } from "mongoose";

export interface ITag {
  _id: Types.ObjectId;
  slug: string;
  name: string;
  description: string;
  postsCount: number;
  followersCount: number;
  trendingScore: number;
  createdAt: Date;
}

const tagSchema = new Schema<ITag>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    postsCount: { type: Number, default: 0 },
    followersCount: { type: Number, default: 0 },
    trendingScore: { type: Number, default: 0, index: -1 },
  },
  { timestamps: true }
);

tagSchema.index({ postsCount: -1 });

export const Tag = model<ITag>("Tag", tagSchema);
