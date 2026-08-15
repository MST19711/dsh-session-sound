# Release v1.0.1 — dsh-session-sound

> 发布文案：可直接粘贴到 GitHub Releases 表单。

## 标题

v1.0.1 — Flat bell icon for the settings entry / 设置入口扁平铃铛图标

## 正文

**English**

- The "会话提示音" entry in the Settings sidebar now shows a flat 16px filled bell silhouette (matching the DSH icon style, `currentColor`-tinted per theme) instead of the default gear icon.

**中文**

- 设置侧边栏中「会话提示音」入口的图标由默认齿轮改为**扁平铃铛**：16px 填充剪影，与 DSH 图标风格一致，颜色随主题（`currentColor`）自动适配，取代了此前临时使用的 emoji。

**Notes**

- The settings nav icon for custom sections is hardcoded by the shipped shell (gear fallback). This release renders the bell via a CSS mask (`mask-image` + `background-color: currentColor`) on the row's label pseudo-element and hides the default gear SVG on that row. If a DSH upgrade renames the style module classes (`VOzbGW_*`) or a higher-`order` section appears, the rule degrades to showing the gear again — no functional impact.
- Bell glyph: Bootstrap Icons `bell-fill` (MIT), 16×16 viewBox.

**Assets**

- 与 v1.0.0 相同（双 half 源码 + 音效资产 + 文档），仅客户端 UI 微调与版本号更新。
