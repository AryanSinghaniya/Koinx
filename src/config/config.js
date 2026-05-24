require('dotenv').config();

module.exports = {
    mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/koinx',
    timestampTolerance: process.env.TIMESTAMP_TOLERANCE_SECONDS || 300,
    quantityTolerance: process.env.QUANTITY_TOLERANCE_PCT || 0.0001,
};
