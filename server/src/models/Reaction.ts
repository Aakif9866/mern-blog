import { Schema, model, type Types } from "mongoose";

export const REACTION_TYPES = ["like", "helpful"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];
export type ReactionTarget = "post" | "comment";

export interface IReaction {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  targetType: ReactionTarget;
  target: Types.ObjectId;
  type: ReactionType;
  createdAt: Date;
}

const reactionSchema = new Schema<IReaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: ["post", "comment"], required: true },
    target: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, enum: REACTION_TYPES, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

reactionSchema.index({ user: 1, target: 1, type: 1 }, { unique: true });
reactionSchema.index({ target: 1, type: 1 });
reactionSchema.index({ createdAt: -1 });

export const Reaction = model<IReaction>("Reaction", reactionSchema);
