const moment = require('moment');
const Transaction = require('../models/Transaction');
const ReconciliationRun = require('../models/ReconciliationReport'); 
const config = require('../config/config');
const logger = require('../utils/logger');

const normalizeAsset = (asset) => {
    if (!asset) return asset;
    const upper = asset.toUpperCase().trim();
    const map = { 'BITCOIN': 'BTC', 'ETHEREUM': 'ETH', 'TETHER': 'USDT' };
    return map[upper] || upper;
};

const typesMatch = (type1, type2) => {
    if (!type1 || !type2) return false;
    if (type1 === type2) return true;
    
    // Handle specific mappings
    if ((type1 === 'TRANSFER_IN' && type2 === 'TRANSFER_OUT') ||
        (type1 === 'TRANSFER_OUT' && type2 === 'TRANSFER_IN') ||
        (type1 === 'TRANSFER' && type2 === 'TRANSFER_IN') ||
        (type1 === 'TRANSFER' && type2 === 'TRANSFER_OUT') ||
        (type1 === 'TRANSFER' && type2 === 'TRANSFER')) {
        return true;
    }
    return false;
};

const reconcileTransactions = async (runId, toleranceConfig = {}) => {
    const timestampTolerance = toleranceConfig.timestampTolerance !== undefined ? toleranceConfig.timestampTolerance : config.timestampTolerance;
    const quantityTolerance = toleranceConfig.quantityTolerance !== undefined ? toleranceConfig.quantityTolerance : config.quantityTolerance;

    const run = new ReconciliationRun({
        runId,
        status: 'processing',
        config: { timestampTolerance, quantityTolerance }
    });
    await run.save();

    try {
        const userTxs = await Transaction.find({ runId, source: 'user', ingestionStatus: 'valid' });
        let exchangeTxs = await Transaction.find({ runId, source: 'exchange', ingestionStatus: 'valid' });

        const invalidUser = await Transaction.countDocuments({ runId, source: 'user', ingestionStatus: 'invalid' });
        const invalidExchange = await Transaction.countDocuments({ runId, source: 'exchange', ingestionStatus: 'invalid' });

        let matchedCount = 0;
        let conflictingCount = 0;

        for (let userTx of userTxs) {
            let bestMatchIndex = -1;
            let isConflicting = false;
            let conflictReason = '';

            const uAsset = normalizeAsset(userTx.baseAsset);

            for (let i = 0; i < exchangeTxs.length; i++) {
                const exTx = exchangeTxs[i];
                const eAsset = normalizeAsset(exTx.baseAsset);

                if (uAsset !== eAsset) continue;
                if (!typesMatch(userTx.operation, exTx.operation)) continue;

                const timeDiff = Math.abs(moment(userTx.utcTime).diff(moment(exTx.utcTime), 'seconds'));

                if (timeDiff <= timestampTolerance) {
                    // It's a probable match, now check precision/quantity
                    const diff = Math.abs(userTx.amount - exTx.amount);
                    const maxAmt = Math.max(userTx.amount, exTx.amount);
                    // Handle division by zero 
                    const qtyDiffPct = maxAmt === 0 ? 0 : diff / maxAmt; 

                    if (qtyDiffPct <= quantityTolerance) {
                        bestMatchIndex = i;
                        isConflicting = false;
                        break; // Perfect match found!
                    } else {
                        bestMatchIndex = i;
                        isConflicting = true;
                        conflictReason = `Quantity difference exceeds tolerance. User: ${userTx.amount}, Exchange: ${exTx.amount}`;
                        // We continue looking in case there's an exact quantity match within the time window
                    }
                }
            }

            if (bestMatchIndex !== -1) {
                const matchedExchangeTx = exchangeTxs[bestMatchIndex];
                
                if (isConflicting) {
                    userTx.reconciliationStatus = 'conflicting';
                    matchedExchangeTx.reconciliationStatus = 'conflicting';
                    userTx.ingestionErrors.push(conflictReason); // Can store reasoning here or separate report
                    conflictingCount++;
                } else {
                    userTx.reconciliationStatus = 'matched';
                    matchedExchangeTx.reconciliationStatus = 'matched';
                    matchedCount++;
                }
                
                await userTx.save();
                await matchedExchangeTx.save();
                exchangeTxs.splice(bestMatchIndex, 1); // remove from pool 
            } else {
                userTx.reconciliationStatus = 'unmatched';
                await userTx.save();
            }
        }

        // Remaining exchange transactions are unmatched
        for (let exTx of exchangeTxs) {
            exTx.reconciliationStatus = 'unmatched';
            await exTx.save();
        }

        run.status = 'completed';
        run.completedAt = new Date();
        run.summary = {
            matched: matchedCount,
            conflicting: conflictingCount,
            unmatchedUser: await Transaction.countDocuments({ runId, source: 'user', reconciliationStatus: 'unmatched', ingestionStatus: 'valid' }),
            unmatchedExchange: exchangeTxs.length,
            invalidUserRows: invalidUser,
            invalidExchangeRows: invalidExchange
        };

        await run.save();
        return run;

    } catch (err) {
        logger.error('Reconciliation error:', err);
        run.status = 'failed';
        run.error = err.message;
        await run.save();
        throw err;
    }
};

module.exports = { reconcileTransactions };
