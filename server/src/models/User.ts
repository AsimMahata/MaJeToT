import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  avatarColor: string;
  groupId: string | null;
  lastProgressDate: Date | null;
  currentStreak: number;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  avatarColor: { type: String, default: '#6366f1' },
  groupId: { type: String, ref: 'Group', default: null },
  lastProgressDate: { type: Date, default: null },
  currentStreak: { type: Number, default: 0 },
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', userSchema);
