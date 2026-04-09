import mongoose from 'mongoose';

const abAssignmentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  experiment: { type: String, default: 'pricing-v1' },
  variant: { type: String, required: true },
  assignedAt: { type: Date, default: Date.now },
});

// Compound index to ensure uniqueness per user per experiment
abAssignmentSchema.index({ userId: 1, experiment: 1 }, { unique: true });

const ABAssignment = mongoose.model('ABAssignment', abAssignmentSchema);
export default ABAssignment;
