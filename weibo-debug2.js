const WebSocket = require('ws');
const http = require('http');

const PORT = 18800;

(async function() {
  const tabsData = await new Promise((res, rej) => {
    http.get({ hostname: '127.0.0.1', port: PORT, path: '/json' }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(d));
    }).on('error', rej);
  });

  const tabs = JSON.parse(tabsData);
  const weiboTab = tabs.find(t => t.url && t.url.includes('weibo.com/u/'));

  if (!weiboTab) {
    console.log('No weibo tab found. Open tabs:');
    tabs.forEach(t => console.log(' -', t.url, t.title));
    return;
  }

  console.log('Found tab:', weiboTab.url, weiboTab.title);

  const ws = new WebSocket(weiboTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  function send(id, method, params) {
    return new Promise((res, rej) => {
      ws.send(JSON.stringify({ id, method, params }));
      const handler = d => {
        const msg = JSON.parse(d);
        if (msg.id === id) { ws.off('message', handler); res(msg.result); }
      };
      ws.on('message', handler);
      setTimeout(() => { ws.off('message', handler); rej(new Error('timeout')); }, 10000);
    });
  }

  try {
    const r = await send(1, 'Runtime.evaluate', {
      expression: 'JSON.stringify({name:window.name||"",delRun:window._delRun,delTotal:window._delTotal||0,delCount:window._delCount||0,errors:window._delErrors||0,browse:window._browseCount||0,url:window.location.href})'
    });
    const data = JSON.parse(r.result.value);
    const saved = JSON.parse(data.name || '{}');
    console.log('Status:', JSON.stringify({
      total: saved.total || 0,
      delRun: data.delRun,
      delCount: data.delCount || 0,
      errors: data.errors || 0,
      browse: data.browse || 0,
      url: data.url
    }, null, 2));
  } catch(e) {
    console.log('Error:', e.message);
  }

  ws.close();
  process.exit(0);
})();
