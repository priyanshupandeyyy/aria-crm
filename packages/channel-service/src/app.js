require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sendRouter = require('./routes/send');

const app = express();

app.use(cors());
app.use(express.json());

// GET /health -> { status: "ok", service: "channel-service" }
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'channel-service'
  });
});

// Mount /api/send -> send router
app.use('/api/send', sendRouter);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`📡 Channel Service running on port ${PORT}`);
});

module.exports = app;
