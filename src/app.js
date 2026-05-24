const express = require('express');
const mongoose = require('mongoose');
const config = require('./config/config');
const logger = require('./utils/logger');
const reconciliationRoutes = require('./api/routes/reconciliationRoutes');

const app = express();

// Middleware
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
