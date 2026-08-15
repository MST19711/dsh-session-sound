# Release v1.0.0 — dsh-session-sound

> 发布文案：可直接粘贴到 GitHub Releases 表单。

## 标题

v1.0.0 — Session pause & completion sounds for the DeepSeek Harness Web UI / 会话暂停/结束提示音

## 正文

**English**

- Plays a sound when the session pauses — the agent asks a question with options (`ask_user_question`) or requests an approval (plan review etc.) — and a distinct sound when a turn completes.
- 15 bundled Ubuntu Yaru system sounds (freedesktop-standard names like `message-new-instant`, `complete`, `bell`, `dialog-question`, `warty-startup`), independently selectable for pause and end sounds; defaults are `message-new-instant` / `complete`.
- Tunable synthesized-tone fallback (frequency / duration / repeats) with a global volume control.
- Playback degrades gracefully: local samples (host-served base64) → jsDelivr online mirror → synthesized tone.
- Settings persist in the browser via localStorage; two config entry points (Run card panel + Settings page), no built-in packages touched.
- Clean lifecycle: session watcher, timers, styles, and slot registrations are fully disposed on stop/update.

**中文**

- 会话暂停（提问选项 `ask_user_question`、审批/计划审核等）播放暂停音；一轮会话结束播放结束音。
- 内置 15 个 Ubuntu Yaru 系统音效（freedesktop 标准命名：`message-new-instant`、`complete`、`bell`、`dialog-question`、`warty-startup` 等），暂停/结束各自独立挑选，默认 `message-new-instant` / `complete`。
- 合成音兜底（频率/时长/次数可调）+ 全局音量。
- 播放三级降级：本地采样（Host 提供 base64）→ jsDelivr 在线镜像 → 合成音。
- 配置持久化于浏览器 localStorage；Run 卡片面板与「设置」页双入口；不改动任何内置包。
- 生命周期干净：停止/更新时自动解除会话监听、清理定时器、样式与槽位注册。

**Install**

通过 DSH 会话内 `cordis_define` / `cordis_run` 加载（`code.host` = `plugin.host.js`，`code.client` = `plugin.client.js`；idPrefix 建议 `snd`），首次激活需在 Run 卡片批准。音效目录按 `plugin.host.js` 顶部 `ASSET_DIR` 配置。

**Assets**

- `plugin.host.js` / `plugin.client.js` — 动态插件双 half 源码
- `assets/` — Ubuntu Yaru 声音主题 15 个音效（CC BY-SA 4.0）+ `NOTICE.md` 署名
- `LICENSE.md` — MIT（代码）+ CC BY-SA 4.0 全文（音效）
- `manifest.json` — 包元数据

**License**

MIT (code) · CC BY-SA 4.0 (sound assets, © Mads Rosendahl / Ubuntu Yaru project, https://github.com/ubuntu/yaru)
