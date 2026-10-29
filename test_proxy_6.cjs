const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
app.use('/', createProxyMiddleware({
  target: 'http://unix:/var/run/docker.sock'
}));
app.listen(6769, () => console.log('listening'));
