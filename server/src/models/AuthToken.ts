import { Schema, model, type Types } from "mongoose";

export type AuthTokenType = "verify_email" | "reset_password";

export interface IAuthToken {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: AuthTokenType;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
}

const authTokenSchema = new Schema<IAuthToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["verify_email", "reset_password"], required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

authTokenSchema.index({ user: 1, type: 1 });
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthToken = model<IAuthToken>("AuthToken", authTokenSchema);
