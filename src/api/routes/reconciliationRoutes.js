const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
    triggerReconciliation,
    getReport,
    getReportSummary,
    getUnmatched,
} = require('../controllers/reconciliationController');

const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); //Appending extension
    }
});

const upload = multer({ storage: storage });

router.post('/reconcile', upload.fields([{ name: 'user_file' }, { name: 'exchange_file' }]), triggerReconciliation);
router.get('/report/:runId', getReport);
router.get('/report/:runId/summary', getReportSummary);
router.get('/report/:runId/unmatched', getUnmatched);

module.exports = router;
