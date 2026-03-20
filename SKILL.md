# 微博删除技能 (weibo-delete)

通过浏览器自动化，批量删除微博账号已发布的微博，支持反反爬策略和自动监控重启。

---

## 首次使用必读

**首次使用前，必须先将脚本中的 `YOUR_UID` 替换为实际的微博 UID。**

微博 UID 查看方法：登录微博网页版 → 个人主页 URL 中 `/u/` 后面的数字即为 UID。
例如：`https://weibo.com/u/1234567890` → UID 为 `1234567890`。

---

## 功能

- 随机选择微博删除（避免顺序删除触发反爬）
- 每删除 20-30 条自动模拟人类浏览行为（随机滚动、阅读帖子、偶尔点赞）
- 自动监控脚本运行状态，停止后自动重启
- 断点续传（window.name 持久化计数，重启不丢失进度）

---

## 必要环境

| 依赖 | 说明 |
|------|------|
| SkillHub CLI | 用于安装和管理技能，参考上方安装步骤 |
| Agent Browser 技能 | 浏览器自动化核心技能，**必须通过 SkillHub 安装**（见第一步） |
| Edge 或 Chrome | 必须已安装（由 Agent Browser 技能调用） |
| 微博已登录 | 浏览器中已登录微博 |

> 无需单独安装 Node.js、ws 模块等，Agent Browser 技能已内置这些依赖。

---

## 第一步：检测并安装 Agent Browser 技能

### 1.1 检查技能是否已安装

运行以下命令检查 Agent Browser 技能是否可用：

```batch
cd C:\Users\user\.openclaw\workspace
node skills\weibo-delete\weibo-delete-check.js
```

如果脚本输出"未检测到 Agent Browser 技能"，请按以下步骤安装：

### 1.2 安装 SkillHub 命令行工具

打开终端，执行以下命令：

```bash
curl -fsSL https://skillhub-1388575217.cos.ap-guangzhou.myqcloud.com/install/install.sh | bash
```

安装完成后，**重启 OpenClaw**（重启命令：`openclaw gateway restart`），让系统识别 SkillHub。

### 1.3 安装 Agent Browser 技能

重启 OpenClaw 后，在终端执行：

```bash
skillhub install agent-browser
```

或使用完整命令：

```bash
skillhub install agent-browser --workspace C:\Users\user\.openclaw\workspace
```

安装完成后会看到类似输出，确认 `agent-browser` 技能已安装到 `skills/` 目录下。

### 1.4 验证安装成功

再次运行环境检测脚本：

```batch
cd C:\Users\user\.openclaw\workspace
node skills\weibo-delete\weibo-delete-check.js
```

看到"Agent Browser 技能已安装"或"CDP 连接正常"即可。

---

## 第二步：启动 Agent Browser

如果检测脚本提示"Agent Browser 未运行"，请在 OpenClaw 界面中点击"启动浏览器"按钮，或重启 OpenClaw Gateway。

---

## 第三步：确认微博已登录

### 3.1 自动打开微博（OpenClaw自动帮你操作）

OpenClaw 会通过 OpenClaw 内置浏览器自动打开微博，无需你手动输入网址。

如果浏览器尚未启动，OpenClaw会自动启动浏览器并打开微博登录页。

如果浏览器未显示已登录状态（顶部有"登录"按钮），请：
1. 点击右上角"登录"
2. 选择扫码登录或账号密码登录
3. 登录成功后，刷新页面确认个人主页可访问

### 3.2 验证登录状态

登录后，检测脚本会**自动检查登录状态**。也可以手动验证：

- 打开 `https://weibo.com/u/YOUR_UID`（替换为你的 UID）
- 如果显示你的用户名和微博内容，说明已登录
- 如果跳转到登录页或提示登录，说明未登录成功

> ⚠️ **未登录无法删除微博**。请确保在 Agent Browser 中完成登录，且不要关闭浏览器窗口。

---

## 第四步：打开微博个人主页并开始删除

在 Agent Browser 中打开微博个人主页：
```
https://weibo.com/u/YOUR_UID
```

（OpenClaw 会自动帮你打开微博并定位到个人主页，无需手动操作）

（替换 `YOUR_UID` 为你的微博 UID）

### 方式 A：直接启动

```batch
cd C:\Users\user\.openclaw\workspace\skills\weibo-delete
node weibo-cdp-deleter-v2.js
```

脚本会自动连接微博页面并注入删除器。

### 方式 B：自动监控（推荐，长期运行）

```batch
cd C:\Users\user\.openclaw\workspace\skills\weibo-delete
node weibo-monitor.js
```

每 60 秒检查一次脚本状态，发现停止自动重启注入。

### 方式 C：查看当前进度

```batch
cd C:\Users\user\.openclaw\workspace\skills\weibo-delete
node weibo-debug2.js
```

---

## 核心脚本说明

| 脚本 | 作用 |
|------|------|
| `weibo-delete-check.js` | 环境检测与使用引导，首次必读 |
| `weibo-deleter-inject.js` | 注入到微博页面的删除逻辑（纯 JS，在页面内运行） |
| `weibo-cdp-deleter-v2.js` | 通过 CDP 连接微博页面，注入删除器脚本 |
| `weibo-monitor.js` | 持续监控，停止后自动重启注入 |
| `weibo-debug2.js` | 快速查看当前删除状态 |

---

## 删除策略（反反爬机制）

| 策略 | 说明 |
|------|------|
| 随机选择微博 | 随机选第 1-5 条之一删除，不按顺序 |
| 间隔 800-1500ms | 每条删除间隔随机，避免规律性 |
| 20-30 条触发浏览 | 自动触发一次模拟人类行为 |
| 浏览行为 | 随机滚动（慢速向下/跳中部/上下微调），偶尔尝试点赞 |
| 最多 50 错误自动停 | 防止无限空转 |

---

## 模拟人类浏览行为

每删除 20-30 条后自动执行一次，不跳转页面（留在主页），行为随机：

- **慢速滚动**：每次步进 150-350px，间隔 1-2.5 秒
- **跳中部浏览**：滚动到页面中部，停留 5-8 秒
- **阅读+点赞**：把某条微博滚动到视窗中心，停留 4-7 秒，尝试点赞
- **上下微调**：向上滚一点再向下，假装在翻看

---

## 手动控制

在浏览器控制台（F12）执行：

```javascript
_stopDel()           // 停止删除
_statusDel()         // 查看状态
```

---

## 重要提示

- **浏览器窗口不能关** — 关了脚本停止，但计数不丢（window.name 持久化）
- **远程调试端口必须保持开启** — 关闭浏览器后脚本会自动断开
- **大量删除建议分次进行** — 每次删 200-500 条后休息一段时间
- **遇到验证码** — 脚本会暂停等待，手动在浏览器中完成验证后继续

---

## 风险提示

- 批量删除可能被微博检测并限制操作
- 删除后无法恢复，请谨慎操作
- 建议单次删除不超过 500 条，间隔一段时间再继续

---

## 故障排除

| 问题 | 解决方法 |
|------|----------|
| "Agent Browser 未运行" | 在 OpenClaw 界面中点击"启动浏览器"按钮 |
| "Weibo tab not found" | 先在浏览器打开微博主页 `https://weibo.com/u/YOUR_UID` |
| 删除速度变慢 | 可能是触发了反爬，等待几分钟后继续 |
| 脚本停止但计数不对 | 重启后注入脚本会自动读取 window.name 恢复进度 |
