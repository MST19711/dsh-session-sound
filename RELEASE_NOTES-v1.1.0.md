# Release v1.1.0 — dsh-session-sound

> 发布文案：可直接粘贴到 GitHub Releases 表单。

## 标题

v1.1.0 — Static plugin: persistent install & no hardcoded paths / 静态插件：常驻安装、去除硬编码路径

## 正文

**English**

- **Converted to a static Cordis plugin package** (`@deepseek-ai/dsh-session-sound`): installs into the DSH profile (`~/.dsh/profiles/node_modules/`) and mounts via `cordis.patch.yml` — the plugin now survives restarts with zero manual steps.
- **No hardcoded paths**: the host half resolves the bundled `assets/` relative to the package (`import.meta.url`) and serves the 15 Ubuntu Yaru sounds over a same-origin route (`/dsh-session-sound/assets`, filename whitelist against traversal); the browser half fetches and decodes them, degrading to the jsDelivr mirror and synthesized tones if unavailable.
- Behavior unchanged: pause sounds (`ask_user_question` / approval requests) and turn-completion sounds, 15 Yaru sounds independently selectable per behavior, tunable synth fallback, localStorage persistence, flat bell icon in Settings.
- One-time install: `bash install.sh && systemctl --user restart dsh-web`.
- The dynamic-plugin era files (`plugin.host.js` / `plugin.client.js` / `manifest.json`) are removed from the repo (history retains v1.0.x).

**中文**

- **转换为静态 Cordis 插件包**（`@deepseek-ai/dsh-session-sound`）：安装进 DSH profile（`~/.dsh/profiles/node_modules/`）并经 `cordis.patch.yml` 装载 —— 重启后常驻，无需任何手动操作。
- **去除硬编码路径**：宿主 half 以 `import.meta.url` 相对包内 `assets/` 解析音效，经同源路由 `/dsh-session-sound/assets` 伺服（文件名白名单防穿越）；浏览器 half 同源 fetch 解码播放，不可用时依次回退 jsDelivr 镜像与合成音。
- 行为不变：暂停（提问选项/审批请求）与回合结束提示音、每种行为独立挑选 15 个 Yaru 音效、可调合成音兜底、localStorage 持久化、设置页扁平铃铛图标。
- 一次性安装：`bash install.sh && systemctl --user restart dsh-web`。
- 动态插件时代文件（`plugin.host.js` / `plugin.client.js` / `manifest.json`）已从仓库移除（v1.0.x 保留在历史中）。

**Install**

```bash
bash install.sh
systemctl --user restart dsh-web
```

Requirements: DSH Web profile；安装后需重启一次；`DSH_HOME` / `PROFILE` 可用环境变量覆盖。

**Assets**

- `package.json`（`dsh.client` 声明）· `lib/index.js`（音效路由）· `lib/client.js`（`__ModuleLoader__` bundle）
- `assets/`（Ubuntu Yaru 15 音效 + `NOTICE.md` 署名）· `install.sh`（幂等安装）

**License**

MIT (code) · CC BY-SA 4.0 (sound assets, © Mads Rosendahl / Ubuntu Yaru project, https://github.com/ubuntu/yaru)
