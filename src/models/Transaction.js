const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    runId: { type: String, required: true, index: true },
    source: { type: String, required: true, enum: ['user', 'exchange'] },
    transactionId: { type: String }, // Original ID from the CSV
    
    // Parsed and cleaned data
    utcTime: { type: Date },
    operation: { type: String }, // e.g., BUY, SELL, TRANSFER_IN, TRANSFER_OUT
    baseAsset: { type: String },
    quoteAsset: { type: String },
    amount: { type: Number }, // Quantity of baseAsset
    price: { type: Number },

    // Status fields
    ingestionStatus: { 
        type: String, 
        required: true, 
        enum: ['valid', 'invalid'], 
        default: 'valid' 
    },
    ingestionErrors: [{ type: String }],
    
    reconciliationStatus: {
        type: String,
        enum: ['unmatched', 'matched', 'conflicting'],
        default: 'unmatched'
    },
    
    // Raw data from CSV for reference
    raw: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
