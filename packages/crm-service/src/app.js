require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

app.get('/health', (req, res) => res.json({ status: 'ok', db: 'connected' }))

// Empty routers for now
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders', express.Router());
app.use('/api/segments', require('./routes/segments'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/communications', express.Router());
app.use('/api/receipts', require('./routes/receipts'));
app.use('/api/aria', require('./routes/aria'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 CRM Service running on port ${PORT}`);
});

module.exports = app;
