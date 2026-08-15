# dsh-session-sound

**会话提示音 · Session Sound Alert**

> Session pause & completion sounds for the DeepSeek Harness Web UI — 15 Ubuntu Yaru sounds, independently configurable.
>
> DeepSeek Harness Web 端会话暂停/结束提示音插件：内置 15 个 Ubuntu Yaru 音效，两种提示音独立配置。

## Features / 特性

- **Pause & end alerts / 暂停与结束双提示**：会话暂停（`ask_user_question` 提问选项、`approval/requested` 计划审核/审批等）播放「暂停音」；一轮会话结束（agent 由 running 转 idle）播放「结束音」。
- **Ubuntu Yaru sound set / Yaru 音效可选**：内置 Ubuntu Yaru 声音主题 15 个音效（遵循 freedesktop 声音命名规范），暂停/结束各自独立下拉挑选，默认分别为 `message-new-instant`、`complete`。
- **Tunable synth fallback / 合成音兜底**：每种行为也可切换为可调合成音（频率 / 时长 / 次数）。
- **Graceful degradation / 三级降级**：本地采样（Host 读取 base64 → `decodeAudioData`）→ jsDelivr 在线源（`<audio>`）→ 合成音。
- **Zero-intrusion / 零侵入**：动态 Cordis 插件，双设置入口（Run 卡片面板 + 侧边栏「设置 → 会话提示音」页，带铃铛图标），配置持久化于浏览器 localStorage，无需修改任何内置包。
- **Self-cleaning / 自清理**：插件停止 / 更新时自动解除会话监听、取消定时器、移除样式与槽位注册。

## Requirements / 环境要求

- DSH Web（`dsh web` / `dsh --profile web`），浏览器需支持 Web Audio `decodeAudioData`（Chrome / Edge / Firefox，及 Safari 17.4+；旧版 Safari 自动回退为 `<audio>` 在线源或合成音）。
- 插件为**动态 Cordis 插件**：通过会话内 `cordis_define` / `cordis_run` 加载，激活需在 Run 卡片上批准。

## Install / 安装

> ⚠️ **第一步必做**：`plugin.host.js` 顶部的 `ASSET_DIR` 是**本机绝对路径**（默认指向本仓库开发机的 `releases/dsh-session-sound/assets`）。克隆本仓库后，请把它改为你机器上本仓库 `assets/` 目录的实际路径，例如：
> ```js
> const ASSET_DIR = '/home/you/dsh-session-sound/assets'
> ```
> 目录缺失时播放会自动回退到 CDN 在线源 / 内置合成音，功能不受影响，但本地音效不会生效。

然后在 DSH 会话中让 agent 执行：

1. **定义**：`cordis_define`（idPrefix 建议 `snd`，名称「会话提示音」）——`code.host` 使用 `plugin.host.js` 的完整内容，`code.client` 使用 `plugin.client.js` 的完整内容；
2. **激活**：`cordis_run`（首次需在 UI 中批准）；
3. **验证**：Run 卡片出现「会话提示音」面板，点击「试听」应听到音效（若浏览器未放行声音，先点任意一次「试听」解锁）。

## Configuration / 配置

「设置 → 会话提示音」页（🔔 入口）或 Run 卡片面板：

| 项 | 说明 |
| --- | --- |
| 暂停提示音 | 启用开关 · 音源（Yaru 采样 / 合成音）· Yaru 模式下音效下拉（15 选 1）· 合成音模式下频率/时长/次数 · 试听 |
| 结束提示音 | 同上，独立设置 |
| 音量 | 全局滑块（0–100%） |

配置自动保存到 localStorage（键 `dsh-session-sound:config`），刷新页面 / 插件升级后保留。

## Sound list / 音效清单

| 标准名（freedesktop） | 说明 | 默认用于 |
| --- | --- | --- |
| `message-new-instant` | 新消息 | 暂停音 |
| `complete` | 任务完成 | 结束音 |
| `bell` / `dialog-question` / `dialog-warning` / `dialog-error` / `message-new-email` / `device-added` / `device-removed` / `battery-low` / `audio-volume-change` / `desktop-login` / `desktop-logoff` / `trash-empty` / `warty-startup` | 铃声 / 提问 / 警告 / 错误 / 新邮件 / 设备连接 / 设备移除 / 电量不足 / 音量变化 / 登录 / 注销 / 清空回收站 / 经典启动音 | 可选 |

## How it works / 工作原理

1. **监听**：Client 订阅 `sessions.binding(sessionId).session` 会话快照——`pending` 由空变非空（`approval/requested`、`question/requested` 帧）触发暂停音；`running` 由 `true` 变 `false`（`host/session-status` 帧）触发结束音；
2. **取音**：Host 经 `harness.handle('sounds' | 'sample')` 从本地 `assets/` 按需读取音效并 base64 交付；Client 解码播放，缓存解码结果；
3. **降级**：本地缺失 → jsDelivr CDN 在线源 → 合成音；
4. **生命周期**：激活即监听当前会话，`connection/reset` 后重新挂接，`ctx.effect` 统一清理。

## Troubleshooting / 故障排查

- **听不到声音**：点击一次「试听」解锁 AudioContext；检查系统/浏览器音量；若在旧版 Safari，Yaru 采样会回退为在线源或合成音。
- **试听无声但合成音正常**：Host 读取音效失败（检查 `ASSET_DIR` 路径与 `assets/` 目录是否存在）。
- **设置不保留**：浏览器禁用了 localStorage；播放仍生效于内存配置。

## Repository layout / 仓库结构

| 文件 | 说明 |
| --- | --- |
| `plugin.host.js` / `plugin.client.js` | 动态插件双 half 源码（`cordis_define` 的 `code.host` / `code.client`） |
| `assets/` | Ubuntu Yaru 声音主题 15 个音效（`NOTICE.md` 含署名） |
| `manifest.json` | 包元数据（名称 / 版本 / 入口 / 音效清单） |
| `LICENSE` | 插件代码许可（MIT） |
| `LICENSE.md` | 详细许可：MIT（代码）+ CC BY-SA 4.0 全文（音效） |

## License

- 插件代码：MIT（`LICENSE`）
- 音效资产 `assets/*.oga`：CC BY-SA 4.0（Ubuntu Yaru 声音主题，作者 Mads Rosendahl；署名见 `assets/NOTICE.md` 与 `LICENSE.md`）
- 设置页铃铛图形：Bootstrap Icons `bell-fill`（MIT）

## Release

- v1.0.0：见 `RELEASE_NOTES-v1.0.0.md`
- v1.0.1（扁平铃铛图标）：见 `RELEASE_NOTES-v1.0.1.md`
