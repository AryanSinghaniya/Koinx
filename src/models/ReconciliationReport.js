const mongoose = require('mongoose');

const reconciliationRunSchema = new mongoose.Schema({
    runId: { type: String, required: true, unique: true, index: true },
    status: { 
        type: String, 
        required: true, 
        enum: ['pending', 'processing', 'completed', 'failed'], 
        default: 'pending' 
    },
    summary: {
        matched: { type: Number, default: 0 },
        conflicting: { type: Number, default: 0 },
        unmatchedUser: { type: Number, default: 0 },
        unmatchedExchange: { type: Number, default: 0 },
        invalidUserRows: { type: Number, default: 0 },
        invalidExchangeRows: { type: Number, default: 0 }
    },
    config: {
        timestampTolerance: Number,
        quantityTolerance: Number
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    error: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ReconciliationRun', reconciliationRunSchema);
