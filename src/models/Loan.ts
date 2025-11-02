import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Interfaz TypeScript para el modelo Loan
 */
export interface ILoan extends Document {
  _id: mongoose.Types.ObjectId;
  userId: Types.ObjectId;
  equipmentId: Types.ObjectId;
  reservedAt: Date;
  startDate: Date;
  endDate: Date;
  checkoutAt: Date | null;
  returnedAt: Date | null;
  status: 'reservado' | 'activo' | 'devuelto' | 'vencido';
  reservationRemarks: string;
  returnRemarks: string;
}

/**
 * Esquema de Mongoose para Loan
 */
const LoanSchema = new Schema<ILoan>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    equipmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Equipment',
      required: true,
    },
    reservedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (this: ILoan, endDate: Date) {
          return endDate > this.startDate;
        },
        message: 'endDate debe ser posterior a startDate',
      },
    },
    checkoutAt: {
      type: Date,
      default: null,
    },
    returnedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['reservado', 'activo', 'devuelto', 'vencido'],
      default: 'reservado',
      required: true,
    },
    reservationRemarks: {
      type: String,
      default: '',
      trim: true,
    },
    returnRemarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: false,
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
LoanSchema.index({ userId: 1 });
LoanSchema.index({ equipmentId: 1 });
LoanSchema.index({ status: 1 });
LoanSchema.index({ startDate: 1, endDate: 1 });
// Índice compuesto para verificar solapamientos
LoanSchema.index({ equipmentId: 1, startDate: 1, endDate: 1 });

export const Loan = mongoose.model<ILoan>('Loan', LoanSchema);

