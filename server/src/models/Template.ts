import mongoose, { Schema, Document } from 'mongoose';

export interface ITemplate {
  groupId: string;
  schema: Record<string, any>;
  updatedAt: Date;
  save(): Promise<this>;
}

const templateSchema = new Schema<ITemplate>({
  groupId: { type: String, ref: 'Group', required: true, unique: true },
  schema: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true });

export const Template = mongoose.model<ITemplate>('Template', templateSchema);
