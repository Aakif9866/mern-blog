import { Schema, model, type Types } from "mongoose";

/** One row per refresh token. Rotation links tokens of the same login into a family. */
export interface ISession {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  tokenHash: string;
  family: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedBy?: Types.ObjectId | null;
  userAgent: string;
  ip: string;
  lastUsedAt: Date;
  createdAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedBy: { type: Schema.Types.ObjectId, ref: "Session", default: null },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
    lastUsedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = model<ISession>("Session", sessionSchema);
