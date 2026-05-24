const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const config = require('./config/config');
const logger = require('./utils/logger');
const reconciliationRoutes = require('./api/routes/reconciliationRoutes');

const app = express();

// Ensure uploads folder exists (Render filesystem starts clean)
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
    origin: true
}));
app.use(express.json());
app.use(express.static('public'));

// DB Config
const db = config.mongoURI;

const port = process.env.PORT || 5000;

// Connect to MongoDB
mongoose
    .connect(db)
    .then(() => {
        console.log('MongoDB Connected');
        app.listen(port, () => console.log(`Server running on port ${port}`));
    })
    .catch(err => console.log(err));

// Routes
app.use('/api', reconciliationRoutes);
