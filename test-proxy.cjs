const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');
const fs = require('fs');
fs.writeFileSync('/tmp/test.sock', ''); // mock socket

const app = express();
app.use('/', createProxyMiddleware({
  target: {
    host: 'localhost',
    protocol: 'http:',
    socketPath: '/tmp/test.sock'
  },
  changeOrigin: true
}));
const server = app.listen(0, () => {
  const http = require('http');
  http.get(`http://localhost:${server.address().port}/`, (res) => {
    console.log("Status:", res.statusCode);
    process.exit(0);
  });
});
