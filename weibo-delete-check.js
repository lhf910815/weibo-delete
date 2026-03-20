#!/usr/bin/env node
/**
 * 微博删除技能 - 环境检测与启动引导
 * 首次使用请先运行此脚本进行环境检查
 *
 * 用法: node weibo-delete-check.js
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

const WORKSPACE = path.dirname(__filename);
const CDP_PORT = 18800;  // OpenClaw Agent Browser CDP 端口

function c(msg) { console.log(msg); }

function step(n, msg) { c('\n[步骤 ' + n + '] ' + msg); }
function ok(msg) { c('  [OK] ' + msg); }
function fail(msg) { c('  [FAIL] ' + msg); }
function warn(msg) { c('  [WARN] ' + msg); }
function info(msg) { c('  ' + msg); }

function checkPort(port) {
  return new Promise(resolve => {
    const req = http.get({ hostname: '127.0.0.1', port, path: '/json' }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve([]); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => { try { req.destroy(); } catch(e) {} resolve(null); });
  });
}

async function main() {
  c('========================================');
  c('  微博删除技能 - 环境检测');
  c('========================================');

  // ====== 步骤 1: 检查 OpenClaw Agent Browser ======
  step(1, '检查 OpenClaw Agent Browser');
  info('Agent Browser 是 OpenClaw 管理的内置浏览器，');
  info('用于控制浏览器自动化操作。');
  info('');
  info('检查项:');
  info('  - OpenClaw 是否安装了 Agent Browser 插件/功能');
  info('  - Agent Browser 进程是否运行中');

  const tabs = await checkPort(CDP_PORT);

  if (!tabs || tabs.length === 0) {
    warn('Agent Browser 未运行 (端口 ' + CDP_PORT + ')');
    c('');
    info('请按以下步骤操作:');
    c('');
    info('  1. 启动 OpenClaw 主程序');
    info('  2. 在 OpenClaw 界面中点击"启动浏览器"按钮');
    info('  3. 或运行命令: openclaw browser start');
    c('');
    info('如果已启动但仍报错，请重启 OpenClaw Gateway');
    process.exit(1);
  }

  ok('Agent Browser 运行正常');
  const pageTabs = tabs.filter(t => t.type === 'page');
  info('已打开页面: ' + pageTabs.length + ' 个');

  // ====== 步骤 2: 检查微博页面 ======
  step(2, '检查微博页面');
  const weiboTabs = tabs.filter(t => t.url && (t.url.includes('weibo.com') || t.url.includes('weibo.cn')));
  if (weiboTabs.length > 0) {
    ok('发现微博页面: ' + weiboTabs.length + ' 个');
    weiboTabs.forEach(t => info('  - ' + t.url.substring(0, 80)));
  } else {
    warn('未发现微博页面');
    info('请在 Agent Browser 中打开: https://weibo.com/');
    info('登录后前往个人主页: https://weibo.com/u/YOUR_UID');
  }

  // ====== 步骤 3: 检查脚本文件 ======
  step(3, '检查技能脚本文件');
  const required = [
    'weibo-deleter-inject.js',
    'weibo-cdp-deleter-v2.js',
    'weibo-monitor.js',
    'weibo-debug2.js',
  ];
  let allGood = true;
  for (const f of required) {
    const fp = path.join(WORKSPACE, f);
    if (fs.existsSync(fp)) { ok(f); }
    else { fail('缺少: ' + f); allGood = false; }
  }
  if (!allGood) {
    fail('部分脚本缺失，请重新安装技能');
    process.exit(1);
  }

  c('\n========================================');
  c('  环境检测完成');
  c('========================================');
  c('');
  if (weiboTabs.length > 0) {
    c('  一切就绪，可以开始删除微博！');
    c('');
    c('  快速启动:');
    c('  cd ' + WORKSPACE);
    c('  node weibo-cdp-deleter-v2.js    # 注入并启动删除');
    c('  node weibo-monitor.js          # 后台监控(推荐)');
    c('  node weibo-debug2.js          # 查看当前状态');
  } else {
    c('  请先在 Agent Browser 中打开微博并登录');
    c('');
    c('  1. 打开: https://weibo.com/');
    c('  2. 登录你的账号');
    c('  3. 进入个人主页: https://weibo.com/u/YOUR_UID');
    c('  4. 重新运行本检测脚本');
  }
  c('');
  c('  注意: 首次使用前需将脚本中的 YOUR_UID');
  c('        替换为你的实际微博 UID');
  c('');
}

main().catch(e => { c('检测出错: ' + e.message); process.exit(1); });
