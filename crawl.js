#!/usr/bin/env node
const https = require('https');

const url = 'https://flkrs.com/echo';
//const url = 'https://www.rescale.com';

https.get(url, (res) => {
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});
