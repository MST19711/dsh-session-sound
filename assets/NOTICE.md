# 音效来源与署名（Attribution / NOTICE）

本目录的采样音效全部取自 **Ubuntu Yaru 声音主题**（`sounds/src/stereo/`）：

- `audio-volume-change.oga` — 音量变化
- `battery-low.oga` — 电量不足
- `bell.oga` — 铃声
- `complete.oga` — 任务完成（结束音默认）
- `desktop-login.oga` — 桌面登录
- `desktop-logoff.oga` — 桌面注销
- `device-added.oga` — 设备已连接
- `device-removed.oga` — 设备已移除
- `dialog-error.oga` — 错误提示
- `dialog-question.oga` — 提问提示
- `dialog-warning.oga` — 警告提示
- `message-new-email.oga` — 新邮件
- `message-new-instant.oga` — 新消息（暂停音默认）
- `trash-empty.oga` — 清空回收站
- `warty-startup.oga` — 经典启动音

- 来源仓库：https://github.com/ubuntu/yaru
- 许可证：**CC-BY-SA-4.0**（署名 + 相同方式共享）
- 音效作者：Mads Rosendahl（`sounds/*`，2018，见 Ubuntu 打包版权声明：
  https://changelogs.ubuntu.com/changelogs/pool/main/y/yaru-theme/yaru-theme_24.10.4-0ubuntu1/copyright ）
- 插件运行期从本目录按需读取（插件代码中硬编码了本目录绝对路径）；
  文件缺失时回退：jsDelivr CDN 在线源 → 内置合成音。
- 在线镜像（回退用）：https://cdn.jsdelivr.net/gh/ubuntu/yaru@master/sounds/src/stereo/
