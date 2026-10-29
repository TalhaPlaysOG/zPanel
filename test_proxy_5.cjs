const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
app.use('/', createProxyMiddleware({
  target: { socketPath: '/var/run/docker.sock' },
  onError: (err, req, res) => {
    console.error('Proxy Error:', err.message);
    res.status(500).send('Proxy Error');
  }
}));
app.listen(6769, () => console.log('listening'));
