import { Schema, model, type HydratedDocument, type Types } from "mongoose";

export const ROLES = ["user", "moderator", "admin"] as const;
export type Role = (typeof ROLES)[number];
export const USER_STATUSES = ["active", "suspended", "banned"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface EmailPrefs {
  comments: boolean;
  mentions: boolean;
  follows: boolean;
  reactions: boolean;
  digest: boolean;
}

export interface IUser {
  _id: Types.ObjectId;
  username: string;
  email: string;
  password?: string;
  name: string;
  bio: string;
  avatar: string;
  website: string;
  location: string;
  role: Role;
  status: UserStatus;
  suspendedUntil?: Date | null;
  moderationNote?: string;
  emailVerified: boolean;
  googleId?: string;
  tokenVersion: number;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  followedTags: string[];
  onboarded: boolean;
  emailPrefs: EmailPrefs;
  lastDigestAt?: Date | null;
  /** Temporary "Continue as guest" account, deleted at guestExpiresAt unless upgraded. */
  isGuest: boolean;
  guestExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_AVATAR = "";

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    name: { type: String, default: "", trim: true, maxlength: 60 },
    bio: { type: String, default: "", maxlength: 280 },
    avatar: { type: String, default: DEFAULT_AVATAR },
    website: { type: String, default: "" },
    location: { type: String, default: "" },
    role: { type: String, enum: ROLES, default: "user", index: true },
    status: { type: String, enum: USER_STATUSES, default: "active", index: true },
    suspendedUntil: { type: Date, default: null },
    moderationNote: { type: String, default: "" },
    emailVerified: { type: Boolean, default: false },
    googleId: { type: String, index: { unique: true, sparse: true } },
    tokenVersion: { type: Number, default: 0 },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },
    followedTags: { type: [String], default: [], index: true },
    onboarded: { type: Boolean, default: false },
    emailPrefs: {
      comments: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      follows: { type: Boolean, default: false },
      reactions: { type: Boolean, default: false },
      digest: { type: Boolean, default: true },
    },
    lastDigestAt: { type: Date, default: null },
    isGuest: { type: Boolean, default: false },
    guestExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ name: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isGuest: 1, guestExpiresAt: 1 });

export type UserDoc = HydratedDocument<IUser>;
export const User = model<IUser>("User", userSchema);

/** Fields that are safe to show to anyone. */
export const PUBLIC_USER_FIELDS = "username name avatar bio role";
