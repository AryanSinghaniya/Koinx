const { ingestData } = require('../../services/ingestion');
const { reconcileTransactions } = require('../../services/reconciliation');
const ReconciliationRun = require('../../models/ReconciliationReport');
const Transaction = require('../../models/Transaction');
const { v4: uuidv4 } = require('uuid');

const triggerReconciliation = async (req, res) => {
    try {
        const runId = uuidv4();
        
        if (!req.files || !req.files.user_file || !req.files.exchange_file) {
            return res.status(400).json({ message: 'Please upload both user and exchange transaction files.' });
        }

        const userFilePath = req.files.user_file[0].path;
        const exchangeFilePath = req.files.exchange_file[0].path;

        // Ingest data
        await ingestData(userFilePath, 'user', runId);
        await ingestData(exchangeFilePath, 'exchange', runId);

        // Reconcile
        const run = await reconcileTransactions(runId, req.body);

        res.status(200).json({ message: 'Reconciliation completed', runId, summary: run.summary });
    } catch (error) {
        res.status(500).json({ message: 'Error triggering reconciliation', error: error.message });
    }
};

const getReport = async (req, res) => {
    try {
        const { runId } = req.params;
        const run = await ReconciliationRun.findOne({ runId });

        if (!run) {
            return res.status(404).json({ message: 'Report not found' });
        }
        
        const matched = await Transaction.find({ runId, reconciliationStatus: 'matched' });
        const conflicting = await Transaction.find({ runId, reconciliationStatus: 'conflicting' });
        const unmatchedUser = await Transaction.find({ runId, source: 'user', reconciliationStatus: 'unmatched', ingestionStatus: 'valid' });
        const unmatchedExchange = await Transaction.find({ runId, source: 'exchange', reconciliationStatus: 'unmatched', ingestionStatus: 'valid' });

        res.status(200).json({
            runId: run.runId,
            summary: run.summary,
            matched,
            conflicting,
            unmatchedUser,
            unmatchedExchange
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching report', error: error.message });
    }
};

const getReportSummary = async (req, res) => {
    try {
        const { runId } = req.params;
        const run = await ReconciliationRun.findOne({ runId });

        if (!run) {
            return res.status(404).json({ message: 'Report not found' });
        }

        res.status(200).json(run.summary);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching report summary', error: error.message });
    }
};

const getUnmatched = async (req, res) => {
    try {
        const { runId } = req.params;
        
        const unmatchedUser = await Transaction.find({ runId, source: 'user', reconciliationStatus: 'unmatched', ingestionStatus: 'valid' });
        const unmatchedExchange = await Transaction.find({ runId, source: 'exchange', reconciliationStatus: 'unmatched', ingestionStatus: 'valid' });

        res.status(200).json({
            unmatchedUser,
            unmatchedExchange,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching unmatched transactions', error: error.message });
    }
};

module.exports = {
    triggerReconciliation,
    getReport,
    getReportSummary,
    getUnmatched,
};
