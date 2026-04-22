const express = require('express');
const {
  getHello,
  incrementHelloCount,
} = require('./controllers/helloController');

const app = express();
const PORT = process.env.PORT || 5000;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});
app.get('/api/hello', getHello);
app.post('/api/hello/click', incrementHelloCount);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
