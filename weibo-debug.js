const WebSocket = require('ws');
const { hostname, port } = { hostname: '127.0.0.1', port: 18800 };

function cdpSend(ws, id, method, params) {
  return new Promise((resolve) => {
    ws.send(JSON.stringify({ id, method, params }));
    const handler = (data) => {
      const msg = JSON.parse(data);
      if (msg.id === id) {
        ws.off('message', handler);
        resolve(msg.result);
      }
    };
    ws.on('message', handler);
    setTimeout(() => resolve(null), 10000);
  });
}

(async function() {
  // Get Weibo tab
  const tabsData = await new Promise((resolve, reject) => {
    const r = require('http').request(
      { hostname, port, path: '/json' },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); }
    );
    r.on('error', reject);
    r.end();
  });

  const tabs = JSON.parse(tabsData);
  const weiboTab = tabs.find(t => t.url && t.url.includes('weibo.com/u/YOUR_UID'));
  if (!weiboTab) { console.log('No weibo tab'); return; }

  const ws = new WebSocket(weiboTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  // Get page state
  const r1 = await cdpSend(ws, 1, 'Runtime.evaluate', {
    expression: 'JSON.stringify({name:window.name,delRun:window._delRun,delTotal:window._delTotal||0,delCount:window._delCount||0,errors:window._delErrors||0,browse:window._browseCount||0})'
  });
  console.log('Page state:', r1 && r1.result && r1.result.value);

  // Check current URL
  const r2 = await cdpSend(ws, 2, 'Runtime.evaluate', {
    expression: 'window.location.href'
  });
  console.log('Current URL:', r2 && r2.result && r2.result.value);

  ws.close();
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
