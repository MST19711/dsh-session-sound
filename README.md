# dsh-session-sound

**会话提示音 · Session Sound Alert**

> Session pause & completion sounds for the DeepSeek Harness Web UI — 15 Ubuntu Yaru sounds, independently configurable, persistent across restarts.
>
> DeepSeek Harness Web 端会话暂停/结束提示音插件：内置 15 个 Ubuntu Yaru 音效，两种提示音独立配置，**随 DSH 启动常驻**。

## Features / 特性

- **Pause & end alerts / 暂停与结束双提示**：会话暂停（`ask_user_question` 提问选项、`approval/requested` 计划审核/审批等）播放「暂停音」；一轮会话结束（agent 由 running 转 idle）播放「结束音」。
- **Ubuntu Yaru sound set / Yaru 音效可选**：内置 Ubuntu Yaru 声音主题 15 个音效（遵循 freedesktop 声音命名规范），暂停/结束各自独立下拉挑选，默认分别为 `message-new-instant`、`complete`。
- **Persistent / 持久化**：静态 Cordis 插件包，随 DSH profile 启动自动装载 —— **重启后无需任何手动操作**。
- **No hardcoded paths / 无硬编码路径**：音效由宿主 half 从包内 `assets/`（`import.meta.url` 定位）经 `/dsh-session-sound/assets` 路由伺服，任意机器、任意安装位置均可用。
- **Graceful degradation / 三级降级**：包内路由（同源 fetch → `decodeAudioData`）→ jsDelivr CDN（`<audio>`）→ 合成音。
- **Tunable synth fallback / 合成音兜底**：每种行为也可切换为可调合成音（频率 / 时长 / 次数）。
- **Zero-intrusion / 零侵入**：仅注册一个设置页（侧边栏「设置 → 🔔 会话提示音」）+ 一个静态资源路由，不改动任何内置包。
- **Self-cleaning / 自清理**：插件卸载时自动解除会话监听、取消定时器、移除样式与槽位注册。

## Requirements / 环境要求

- DSH Web（`dsh --profile web`），浏览器需支持 Web Audio `decodeAudioData`（Chrome / Edge / Firefox，及 Safari 17.4+；旧版 Safari 自动回退为 `<audio>` 在线源或合成音）。
- 需要一次 DSH 重启使插件装载（安装后首次）。

## Install / 安装

在 DSH 安装机上，把本仓库 checkout 到任意位置，然后：

```bash
bash install.sh
systemctl --user restart dsh-web
```

脚本是幂等的：重复执行会跳过已完成的步骤。它完成两件事：

1. 将包（`package.json` + `lib/` + `assets/`）复制到 `~/.dsh/profiles/node_modules/@deepseek-ai/dsh-session-sound/`；
2. 在 `~/.dsh/profiles/web/cordis.patch.yml` 追加注册行（缺失时创建文件）。

环境变量覆盖：`DSH_HOME`（默认 `$HOME/.dsh`）、`PROFILE`（默认 `web`）。

### 手动安装

```bash
# 1. 复制包
mkdir -p ~/.dsh/profiles/node_modules/@deepseek-ai/dsh-session-sound/{lib,assets}
cp package.json ~/.dsh/profiles/node_modules/@deepseek-ai/dsh-session-sound/
cp lib/index.js lib/client.js ~/.dsh/profiles/node_modules/@deepseek-ai/dsh-session-sound/lib/
cp assets/*.oga assets/NOTICE.md ~/.dsh/profiles/node_modules/@deepseek-ai/dsh-session-sound/assets/

# 2. 编辑 ~/.dsh/profiles/web/cordis.patch.yml 追加：
#    - insert:
#        - id: dsh-session-sound
#          name: '@deepseek-ai/dsh-session-sound'

# 3. 重启
systemctl --user restart dsh-web
```

### 卸载

1. 从 `~/.dsh/profiles/web/cordis.patch.yml` 删除 `dsh-session-sound` 注册块；
2. 删除 `~/.dsh/profiles/node_modules/@deepseek-ai/dsh-session-sound/` 目录；
3. 重启并刷新浏览器。

## Configuration / 配置

「设置 → 会话提示音」页（🔔 入口）：

| 项 | 说明 |
| --- | --- |
| 暂停提示音 | 启用开关 · 音源（Yaru 采样 / 合成音）· Yaru 模式下音效下拉（15 选 1）· 合成音模式下频率/时长/次数 · 试听 |
| 结束提示音 | 同上，独立设置 |
| 音量 | 全局滑块（0–100%） |

配置自动保存到 localStorage（键 `dsh-session-sound:config`），刷新页面 / DSH 重启后保留。

## Sound list / 音效清单

| 标准名（freedesktop） | 说明 | 默认用于 |
| --- | --- | --- |
| `message-new-instant` | 新消息 | 暂停音 |
| `complete` | 任务完成 | 结束音 |
| `bell` / `dialog-question` / `dialog-warning` / `dialog-error` / `message-new-email` / `device-added` / `device-removed` / `battery-low` / `audio-volume-change` / `desktop-login` / `desktop-logoff` / `trash-empty` / `warty-startup` | 铃声 / 提问 / 警告 / 错误 / 新邮件 / 设备连接 / 设备移除 / 电量不足 / 音量变化 / 登录 / 注销 / 清空回收站 / 经典启动音 | 可选 |

## How it works / 工作原理

1. **装载**：cordis.patch.yml 注册行使宿主 half 随 profile 启动；`dsh.client` 声明使客户端 bundle 进入 Web 启动清单，页面加载 `/plugins/@deepseek-ai/dsh-session-sound/client.js`；
2. **取音**：宿主 half 注册 `/dsh-session-sound/assets` 前缀路由，从包内 `assets/`（白名单文件名）伺服 ogg；客户端同源 `fetch` → `decodeAudioData` 播放，失败依次回退 CDN / 合成音；
3. **监听**：客户端订阅 `sessions.list` 跟随当前会话，再订阅会话快照——`pending` 由空变非空触发暂停音，`running` 由 `true` 变 `false` 触发结束音；`connection/reset` 后自动重挂接；
4. **生命周期**：`ctx.effect` 统一清理监听、定时器与槽位注册。

## Troubleshooting / 故障排查

- **听不到声音**：点击一次「试听」解锁 AudioContext；检查系统/浏览器音量；若在旧版 Safari，Yaru 采样会回退为在线源或合成音。
- **试听无声但合成音正常**：检查 `curl -sI http://127.0.0.1:3081/dsh-session-sound/assets/bell.oga` 是否 200；非 200 说明宿主 half 未装载（重启过吗？）或安装目录被移动。
- **设置不保留**：浏览器禁用了 localStorage；播放仍生效于内存配置。

## Repository layout / 仓库结构

| 文件 | 说明 |
| --- | --- |
| `package.json` | 包元数据（`dsh.client` 声明，platform: web） |
| `lib/index.js` | Host half：`/dsh-session-sound/assets` 路由伺服音效 |
| `lib/client.js` | Client half：会话监听 + 设置页 UI（`__ModuleLoader__` bundle） |
| `assets/` | Ubuntu Yaru 声音主题 15 个音效（`NOTICE.md` 含署名） |
| `install.sh` | 幂等一键安装脚本（复制 + 注册 + 重启提示） |
| `LICENSE` | 插件代码许可（MIT） |
| `LICENSE.md` | 详细许可：MIT（代码）+ CC BY-SA 4.0 全文（音效） |

## License

- 插件代码：MIT（`LICENSE`）
- 音效资产 `assets/*.oga`：CC BY-SA 4.0（Ubuntu Yaru 声音主题，作者 Mads Rosendahl；署名见 `assets/NOTICE.md` 与 `LICENSE.md`）
- 设置页铃铛图形：Bootstrap Icons `bell-fill`（MIT）

## Release

- v1.0.0 / v1.0.1（动态插件形态，历史）：见 `RELEASE_NOTES-v1.0.0.md` / `RELEASE_NOTES-v1.0.1.md`
- v1.1.0（静态插件，持久化 + 无硬编码路径）：见 `RELEASE_NOTES-v1.1.0.md`
