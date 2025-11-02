import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interfaz TypeScript para el modelo User
 */
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'estudiante' | 'profesor' | 'admin';
  active: boolean;
  createdAt: Date;
  lastAccess: Date;
}

/**
 * Esquema de Mongoose para User
 */
const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
    },
    passwordHash: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['estudiante', 'profesor', 'admin'],
      default: 'estudiante',
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastAccess: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // Usamos createdAt manual
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Índices
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);

