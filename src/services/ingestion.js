const fs = require('fs');
const csv = require('csv-parser');
const moment = require('moment');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

const ingestData = (filePath, source, runId) => {
    return new Promise((resolve, reject) => {
        const transactions = [];

        fs.createReadStream(filePath)
            // Use mapHeaders to trim and cleanly handle headers like "transaction " or "timestamp"
            .pipe(csv({
                mapHeaders: ({ header }) => header.trim().toLowerCase()
            }))
            .on('data', (row) => {
                const raw = { ...row };
                const errors = [];
                
                // Flexible column mapping based on the provided CSV screenshot
                const transactionId = row.transaction || row.transaction_id || row.id;
                const timestampStr = row.timestamp || row.utc_time || row.date;
                const operationStr = row.type || row.operation;
                const assetStr = row.asset || row.base_coin || row.coin;
                const quantityStr = row.quantity || row.amount;
                const priceStr = row.price_usd || row.price;

                let utcTime = null;
                if (!timestampStr) {
                    errors.push('Missing timestamp');
                } else {
                    const parsedDate = moment(timestampStr, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss']);
                    if (!parsedDate.isValid()) {
                        errors.push('Invalid timestamp format');
                    } else {
                        utcTime = parsedDate.toDate();
                    }
                }

                if (!operationStr) errors.push('Missing operation/type');
                if (!assetStr) errors.push('Missing asset');
                
                let amount = parseFloat(quantityStr);
                if (isNaN(amount) || amount < 0) {
                    errors.push('Invalid or negative quantity');
                    amount = null;
                }

                let price = parseFloat(priceStr);
                if (!priceStr) {
                    errors.push('Missing price');
                    price = null;
                } else if (isNaN(price)) {
                    errors.push('Invalid price');
                    price = null;
                }

                const ingestionStatus = errors.length > 0 ? 'invalid' : 'valid';

                transactions.push({
                    runId,
                    source,
                    transactionId,
                    utcTime,
                    operation: operationStr ? operationStr.toUpperCase().trim() : undefined,
                    baseAsset: assetStr ? assetStr.toUpperCase().trim() : undefined,
                    amount,
                    price,
                    ingestionStatus,
                    ingestionErrors: errors,
                    raw
                });
            })
            .on('end', async () => {
                try {
                    if (transactions.length > 0) {
                        await Transaction.insertMany(transactions, { ordered: false });
                    }
                    logger.info(`${source} data ingested successfully. Total rows: ${transactions.length}`);
                    resolve(transactions);
                } catch (dbError) {
                    logger.error(`Error saving ${source} data to DB:`, dbError);
                    reject(dbError);
                }
            })
            .on('error', (streamError) => {
                logger.error(`Error reading ${source} CSV file:`, streamError);
                reject(streamError);
            });
    });
};

module.exports = { ingestData };
