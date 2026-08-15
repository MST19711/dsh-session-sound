# GitHub 发布文案 — dsh-session-sound

## 一句话简介（repo description 用）

**EN**
Session pause & completion sounds for the DeepSeek Harness Web UI — 15 Ubuntu Yaru sounds, persistent static plugin, independently configurable.

**ZH**
DeepSeek Harness Web 端会话暂停/结束提示音插件：静态插件常驻，内置 15 个 Ubuntu Yaru 音效，暂停音与结束音独立配置。

## 简短介绍（README 开头段）

**EN**

> dsh-session-sound is a static Cordis plugin for the DeepSeek Harness Web UI. It plays a sound when the session pauses — the agent asks a question with options or requests an approval (e.g. plan review) — and a different sound when a turn finishes. Both sounds are configured independently: pick any of the 15 bundled Ubuntu Yaru system sounds (freedesktop-standard names) or use a tunable synthesized tone, with a global volume control. The plugin mounts with the DSH profile and survives restarts; settings persist in the browser (localStorage); audio is served from the package itself via `/dsh-session-sound/assets` (no hardcoded paths), degrading to an online mirror and synthesized tones if unavailable.

**ZH**

> dsh-session-sound 是 DeepSeek Harness Web 界面的静态 Cordis 插件。当会话暂停——模型提出带选项的问题或发起审批/计划审核——时播放提示音；一轮会话结束时播放另一种提示音。两种提示音完全独立配置：可从内置的 15 个 Ubuntu Yaru 系统音效（freedesktop 标准命名）中挑选，或使用参数可调的合成音，另有全局音量。插件随 DSH profile 装载、重启后常驻；配置持久化于浏览器（localStorage）；音效由包自身经 `/dsh-session-sound/assets` 提供（无硬编码路径），不可用时自动回退在线镜像与合成音。

## 精简 README.md 草稿

```markdown
# dsh-session-sound

Session pause & completion sounds for the DeepSeek Harness Web UI / DeepSeek Harness Web 端会话暂停/结束提示音

## Features / 特性

- **Pause & end alerts / 暂停与结束双提示**：提问选项、计划审核等暂停场景播放暂停音；回合结束播放结束音
- **Persistent / 持久化**：静态插件随 profile 装载，重启后常驻，无需手动操作
- **No hardcoded paths / 无硬编码路径**：音效经包内路由 /dsh-session-sound/assets 伺服
- **Ubuntu Yaru sound set / Yaru 音效可选**：内置 15 个系统音效（freedesktop 标准名），两种提示音独立挑选
- **Graceful degradation / 三级降级**：包内路由 → jsDelivr 在线源 → 合成音
- **Zero-intrusion / 零侵入**：仅设置页 + 静态资源路由，不改动内置包

## Install / 安装

```bash
bash install.sh
systemctl --user restart dsh-web
```

Requirements: DSH Web profile；安装后需重启一次。

## License

MIT (code) · CC BY-SA 4.0 (Ubuntu Yaru sound assets, © Mads Rosendahl / Ubuntu Yaru)
```
