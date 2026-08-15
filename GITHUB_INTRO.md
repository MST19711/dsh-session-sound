# GitHub 发布文案 — dsh-session-sound

## 一句话简介（repo description 用）

**EN**
Session pause & completion sounds for the DeepSeek Harness Web UI — pick from the Ubuntu Yaru sound set, configure pause and end sounds independently.

**ZH**
DeepSeek Harness Web 端会话暂停/结束提示音插件：内置 Ubuntu Yaru 音效可选，暂停音与结束音独立配置。

## 简短介绍（README 开头段）

**EN**

> dsh-session-sound is a dynamic Cordis plugin for the DeepSeek Harness Web UI. It plays a sound when the session pauses — the agent asks a question with options or requests an approval (e.g. plan review) — and a different sound when a turn finishes. Both sounds are configured independently: pick any of the 15 bundled Ubuntu Yaru system sounds (freedesktop-standard names) or use a tunable synthesized tone, with a global volume control. Settings persist in the browser (localStorage); playback degrades gracefully from local samples to an online mirror to synthesized tones.

**ZH**

> dsh-session-sound 是 DeepSeek Harness Web 界面的动态 Cordis 插件。当会话暂停——模型提出带选项的问题或发起审批/计划审核——时播放提示音；一轮会话结束时播放另一种提示音。两种提示音完全独立配置：可从内置的 15 个 Ubuntu Yaru 系统音效（freedesktop 标准命名）中挑选，或使用参数可调的合成音，另有全局音量。配置持久化于浏览器（localStorage）；播放链路从本地采样到在线镜像再到合成音逐级降级。

## 精简 README.md 草稿

```markdown
# dsh-session-sound

Session pause & completion sounds for the DeepSeek Harness Web UI / DeepSeek Harness Web 端会话暂停/结束提示音

## Features / 特性

- **Pause & end alerts / 暂停与结束双提示**：提问选项、计划审核等暂停场景播放暂停音；回合结束播放结束音
- **Ubuntu Yaru sound set / Yaru 音效可选**：内置 15 个系统音效（freedesktop 标准名），两种提示音独立挑选，默认 message-new-instant / complete
- **Tunable synth fallback / 合成音兜底**：频率/时长/次数可调，并作为采样不可用时的最终回退
- **Graceful degradation / 三级降级**：本地采样 → jsDelivr 在线源 → 合成音
- **Zero-intrusion / 零侵入**：动态插件，Run 卡片 + 设置页双入口，配置存 localStorage
- **Self-cleaning / 自清理**：停止/更新时自动解除监听、清理样式与槽位

## Requirements / 环境要求

- DSH Web；支持 Web Audio decodeAudioData 的浏览器（Chrome/Edge/Firefox/Safari 17.4+）

## Install / 安装

通过会话内 cordis_define / cordis_run 加载（code.host = plugin.host.js，code.client = plugin.client.js），首次激活需在 Run 卡片批准。详见 README.md。

## License

MIT (code) · CC BY-SA 4.0 (Ubuntu Yaru sound assets, © Mads Rosendahl / Ubuntu Yaru)
```
