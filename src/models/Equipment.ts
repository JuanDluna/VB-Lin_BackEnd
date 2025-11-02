import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interfaz TypeScript para el modelo Equipment
 */
export interface IEquipment extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  name: string;
  description: string;
  category: string;
  status: 'disponible' | 'prestado' | 'mantenimiento';
  location: string;
  acquisitionDate: Date;
  estimatedValue: number;
}

/**
 * Esquema de Mongoose para Equipment
 */
const EquipmentSchema = new Schema<IEquipment>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['disponible', 'prestado', 'mantenimiento'],
      default: 'disponible',
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    acquisitionDate: {
      type: Date,
      required: true,
    },
    estimatedValue: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Índices
EquipmentSchema.index({ code: 1 });
EquipmentSchema.index({ category: 1 });
EquipmentSchema.index({ status: 1 });
EquipmentSchema.index({ name: 'text', description: 'text' });

export const Equipment = mongoose.model<IEquipment>('Equipment', EquipmentSchema);

