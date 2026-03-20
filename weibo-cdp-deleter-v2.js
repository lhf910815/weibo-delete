/**
 * Weibo CDP Deleter v2 - Proper WebSocket CDP connection
 */
const WebSocket = require('ws');
const fs = require('fs');

const CDP_HOST = '127.0.0.1';
const CDP_PORT = 18800;

let ws = null;
let msgId = 0;
const pending = {};

function cdpSend(method, params) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    ws.send(JSON.stringify({ id, method, params }));
    pending[id] = resolve;
    setTimeout(() => {
      if (pending[id]) { reject(new Error('timeout')); delete pending[id]; }
    }, 30000);
  });
}

async function getWeiboTabWsUrl() {
  return new Promise((resolve, reject) => {
    const options = { hostname: CDP_HOST, port: CDP_PORT, path: '/json' };
    const req = require('http').request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const tabs = JSON.parse(data);
          const weiboTab = tabs.find(t => t.url && t.url.includes('weibo.com/u/YOUR_UID'));
          resolve(weiboTab ? weiboTab.webSocketDebuggerUrl : null);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const wsUrl = await getWeiboTabWsUrl();
  if (!wsUrl) { console.log('Weibo tab not found'); return; }
  console.log('Connected to Weibo tab');

  ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (pending[msg.id]) { pending[msg.id](msg.result); delete pending[msg.id]; }
  });

  // First stop any existing run
  try {
    await cdpSend('Runtime.evaluate', { expression: 'window._stopDel && window._stopDel()' });
    console.log('Stopped existing run');
    await new Promise(r => setTimeout(r, 1000));
  } catch(e) {}

  // Read script
  const script = fs.readFileSync('weibo-deleter-inject.js', 'utf8');

  console.log('Injecting new script...');
  const result = await cdpSend('Runtime.evaluate', {
    expression: script,
    sourceURL: 'weibo-deleter.js',
    persistScript: false
  });

  // Check if it's running
  await new Promise(r => setTimeout(r, 2000));
  const statusResult = await cdpSend('Runtime.evaluate', {
    expression: 'JSON.stringify(window._statusDel ? window._statusDel() : {})'
  });

  let status;
  try {
    status = JSON.parse(statusResult.result.value);
  } catch(e) { status = {}; }

  console.log('\n=== Delete script started ===');
  console.log('Total deleted so far: ' + (status.total || 0));
  console.log('Check status: _statusDel()');
  console.log('Stop: _stopDel()\n');

  ws.close();
}

main().catch(console.error);
