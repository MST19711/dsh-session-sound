/**
 * dsh-session-sound — Client half（静态包 v1.1.0）
 *
 * 会话暂停 / 结束提示音：
 *  - 会话暂停（提问选项 ask_user_question / 计划审核等 approval 请求）播放「暂停音」；
 *  - 一轮会话结束（agent 由 running 转为 idle）播放「结束音」；
 *  - 两种提示音独立设置：Ubuntu Yaru 声音包 15 音效任选，或使用可调合成音；
 *    配置持久化于 localStorage（键 dsh-session-sound:config）。
 *
 * 信号来源：订阅会话快照（sessions.binding(sessionId).session）：
 *  - 暂停：snapshot.pending 由空变为非空（approval/requested、question/requested 帧）；
 *  - 结束：snapshot.running 由 true 变为 false（host/session-status 帧）。
 * 跟随 sessions.list 的 current：启动时无会话则等待，切换会话自动重挂接。
 *
 * 播放回退链：包内路由（/dsh-session-sound/assets，同源 fetch → decodeAudioData）
 *             → jsDelivr CDN（<audio>）→ 内置合成音（正弦波）。
 *
 * License: MIT（代码）；音效资产为 CC-BY-SA-4.0（见 assets/NOTICE.md）。
 */
window.__ModuleLoader__.load({
  id: "@deepseek-ai/dsh-session-sound",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

    //#region styles
    const css = `
      .dsh-snd-panel {
        display: flex; flex-direction: column; gap: 8px;
        padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 8px; background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-label-primary);
        font-size: 13px; line-height: 1.5;
      }
      .dsh-snd-page { max-width: 560px; }
      .dsh-snd-title { font-weight: 600; font-size: 14px; }
      .dsh-snd-desc { color: var(--dsw-alias-label-secondary); font-size: 12px; }
      .dsh-snd-group {
        display: flex; flex-direction: column; gap: 6px;
        padding: 8px 0; border-top: 1px solid var(--dsw-alias-border-l1);
      }
      .dsh-snd-group-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .dsh-snd-check { display: flex; align-items: center; gap: 6px; font-weight: 600; cursor: pointer; }
      .dsh-snd-check input { accent-color: var(--dsw-alias-brand-primary); }
      .dsh-snd-fields { display: flex; flex-wrap: wrap; gap: 8px; }
      .dsh-snd-field { display: flex; align-items: center; gap: 6px; color: var(--dsw-alias-label-secondary); }
      .dsh-snd-field-label { min-width: 58px; font-size: 12px; }
      .dsh-snd-num {
        width: 84px; padding: 3px 6px; font-size: 12px;
        border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px;
        background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary);
      }
      .dsh-snd-btn {
        padding: 3px 10px; font-size: 12px; cursor: pointer;
        border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px;
        background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary);
      }
      .dsh-snd-btn:hover { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
      .dsh-snd-disabled .dsh-snd-fields,
      .dsh-snd-disabled .dsh-snd-btn,
      .dsh-snd-disabled .dsh-snd-source { opacity: 0.45; pointer-events: none; }
      .dsh-snd-source { display: flex; align-items: center; gap: 6px; color: var(--dsw-alias-label-secondary); }
      .dsh-snd-select {
        padding: 3px 6px; font-size: 12px;
        border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px;
        background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary);
      }
      .dsh-snd-vol {
        display: flex; align-items: center; gap: 8px;
        border-top: 1px solid var(--dsw-alias-border-l1); padding-top: 8px;
      }
      .dsh-snd-vol input[type='range'] { flex: 1; accent-color: var(--dsw-alias-brand-primary); }
      .dsh-snd-vol-num { min-width: 44px; text-align: right; font-size: 12px; color: var(--dsw-alias-label-secondary); }
      .dsh-snd-note { color: var(--dsw-alias-label-secondary); font-size: 12px; }
      /* 设置页导航：把「会话提示音」一行的默认齿轮图标替换为扁平铃铛 ——
         16px 填充剪影（与 DSH 图标风格一致），经 CSS mask 绘制并取 currentColor 随主题变色。
         当前该行是导航末位（order 25）；若 DSH 升级改了样式类名或出现更高 order 的 section，
         此规则失效时齿轮图标会重新出现，不影响功能。 */
      .VOzbGW_navList > .VOzbGW_navCell:last-child > .VOzbGW_navIcon { display: none; }
      .VOzbGW_navList > .VOzbGW_navCell:last-child > .VOzbGW_navLabel::before {
        content: '';
        display: inline-block;
        width: 16px;
        height: 16px;
        margin-right: 6px;
        vertical-align: -3px;
        background-color: currentColor;
        -webkit-mask-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A//www.w3.org/2000/svg'%20viewBox%3D'0%200%2016%2016'%3E%3Cpath%20fill%3D'%23000'%20d%3D'M8%2016a2%202%200%200%200%202-2H6a2%202%200%200%200%202%202M8%201.918l-.797.161A4.002%204.002%200%200%200%204%206c0%20.628-.134%202.197-.459%203.742-.16.767-.376%201.566-.663%202.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134%208.197%2012%206.628%2012%206a4.002%204.002%200%200%200-3.203-3.92z'/%3E%3C/svg%3E");
        mask-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A//www.w3.org/2000/svg'%20viewBox%3D'0%200%2016%2016'%3E%3Cpath%20fill%3D'%23000'%20d%3D'M8%2016a2%202%200%200%200%202-2H6a2%202%200%200%200%202%202M8%201.918l-.797.161A4.002%204.002%200%200%200%204%206c0%20.628-.134%202.197-.459%203.742-.16.767-.376%201.566-.663%202.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134%208.197%2012%206.628%2012%206a4.002%204.002%200%200%200-3.203-3.92z'/%3E%3C/svg%3E");
        -webkit-mask-size: contain;
        mask-size: contain;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
      }
    `;
    const tagId = "@deepseek-ai/dsh-session-sound/sound-panel.css";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = "@deepseek-ai/dsh-session-sound";
      tag.dataset.pluginCss = tagId;
      tag.textContent = css;
      document.head.appendChild(tag);
    }
    //#endregion

    // 音效包内路由（同源）与 CDN 回退
    const ASSET_BASE = "/dsh-session-sound/assets";
    function remoteUrl(name) {
      return "https://cdn.jsdelivr.net/gh/ubuntu/yaru@master/sounds/src/stereo/" + name + ".oga";
    }

    // 音效名中文说明（供选择器展示；未知音效只显示标准名）
    const SAMPLE_LABELS = {
      "audio-volume-change": "音量变化",
      "battery-low": "电量不足",
      bell: "铃声",
      complete: "任务完成",
      "desktop-login": "桌面登录",
      "desktop-logoff": "桌面注销",
      "device-added": "设备已连接",
      "device-removed": "设备已移除",
      "dialog-error": "错误提示",
      "dialog-question": "提问提示",
      "dialog-warning": "警告提示",
      "message-new-email": "新邮件",
      "message-new-instant": "新消息",
      "trash-empty": "清空回收站",
      "warty-startup": "经典启动音",
    };

    // 音效清单（与包内 assets/ 保持一致）
    const SAMPLE_NAMES = [
      "audio-volume-change", "battery-low", "bell", "complete", "desktop-login",
      "desktop-logoff", "device-added", "device-removed", "dialog-error",
      "dialog-question", "dialog-warning", "message-new-email", "message-new-instant",
      "trash-empty", "warty-startup",
    ];

    // 提示音配置默认值
    const DEFAULTS = {
      pause: { enabled: true, source: "yaru", sample: "message-new-instant", freq: 880, duration: 200, count: 2, gap: 140 },
      end: { enabled: true, source: "yaru", sample: "complete", freq: 660, duration: 450, count: 1, gap: 0 },
      volume: 0.7,
    };
    const STORAGE_KEY = "dsh-session-sound:config";

    function loadConfig() {
      let saved = null;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw !== null) saved = JSON.parse(raw);
      } catch (error) {
        saved = null;
      }
      if (saved === null || typeof saved !== "object") {
        return JSON.parse(JSON.stringify(DEFAULTS));
      }
      const out = {};
      for (const kind of ["pause", "end"]) {
        const s = saved[kind];
        const patch = (s !== null && typeof s === "object") ? {
          enabled: typeof s.enabled === "boolean" ? s.enabled : DEFAULTS[kind].enabled,
          source: s.source === "tone" ? "tone" : "yaru",
          sample: typeof s.sample === "string" && s.sample.length > 0 ? s.sample : DEFAULTS[kind].sample,
          freq: Number.isFinite(s.freq) ? s.freq : DEFAULTS[kind].freq,
          duration: Number.isFinite(s.duration) ? s.duration : DEFAULTS[kind].duration,
          count: Number.isFinite(s.count) ? s.count : DEFAULTS[kind].count,
          gap: Number.isFinite(s.gap) ? s.gap : DEFAULTS[kind].gap,
        } : {};
        out[kind] = { ...DEFAULTS[kind], ...patch };
      }
      out.volume = (typeof saved.volume === "number" && Number.isFinite(saved.volume))
        ? Math.max(0, Math.min(1, saved.volume))
        : DEFAULTS.volume;
      return out;
    }

    let config = loadConfig();

    function saveConfig() {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        return true;
      } catch (error) {
        return false;
      }
    }

    //#region audio
    let audioCtx = null;
    function getAudioCtx() {
      if (audioCtx === null) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC === undefined) return null;
        audioCtx = new AC();
      }
      return audioCtx;
    }

    function fetchDecode(ac, url) {
      return fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error("http " + res.status);
          return res.arrayBuffer();
        })
        .then((buf) => ac.decodeAudioData(buf));
    }

    const sampleCache = {};
    function ensureSampleBuffer(ac, name) {
      if (sampleCache[name] !== undefined) return sampleCache[name];
      const p = fetchDecode(ac, ASSET_BASE + "/" + name + ".oga")
        .catch(() => fetchDecode(ac, remoteUrl(name)))
        .catch(() => null);
      sampleCache[name] = p;
      return p;
    }

    function playUrl(url) {
      if (typeof url !== "string" || url.trim().length === 0) return;
      try {
        const el = document.createElement("audio");
        el.src = url.trim();
        el.volume = Math.max(0, Math.min(1, config.volume));
        el.play().catch(() => {});
      } catch (error) {}
    }

    function noteAt(ac, freq, dur, vol, t) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      const peak = Math.max(0.02, Math.min(1, vol)) * 0.3;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.015);
      const holdEnd = t + Math.max(0.03, dur - 0.06);
      gain.gain.setValueAtTime(peak, holdEnd);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.06);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + dur + 0.1);
    }

    function playTone(kind) {
      const s = config[kind];
      if (s === undefined || !s.enabled) return;
      const ac = getAudioCtx();
      if (ac === null) return;
      if (ac.state === "suspended") ac.resume().catch(() => {});
      const t0 = ac.currentTime + 0.03;
      for (let i = 0; i < s.count; i += 1) {
        const t = t0 + (i * (s.duration + s.gap)) / 1000;
        noteAt(ac, s.freq, s.duration / 1000, config.volume, t);
      }
    }

    function playBuffer(ac, buf) {
      const src = ac.createBufferSource();
      const gain = ac.createGain();
      src.buffer = buf;
      gain.gain.value = Math.max(0.05, Math.min(1, config.volume)) * 0.9;
      src.connect(gain);
      gain.connect(ac.destination);
      src.start();
    }

    function playSample(kind) {
      const s = config[kind];
      if (s === undefined) return;
      const name = s.sample;
      const ac = getAudioCtx();
      if (ac === null) {
        playUrl(remoteUrl(name));
        return;
      }
      if (ac.state === "suspended") ac.resume().catch(() => {});
      ensureSampleBuffer(ac, name)
        .then((buf) => {
          if (buf === null) playUrl(remoteUrl(name));
          else playBuffer(ac, buf);
        })
        .catch(() => playUrl(remoteUrl(name)));
    }

    function play(kind) {
      const s = config[kind];
      if (s === undefined || !s.enabled) return;
      if (s.source === "yaru") playSample(kind);
      else playTone(kind);
    }
    //#endregion

    //#region session watcher
    // 暂停信号：pending 由空变非空；结束信号：running 由 true 变 false。
    // 跟随 sessions.list 的 current：启动时无会话则等待，切换会话自动重挂接。
    let appCtx = null;
    let sessionId = null;
    let watcher = null;
    let retryTimer = null;
    let prev = null;

    function check() {
      try {
        if (watcher === null) return;
        const snap = watcher.session.getSnapshot();
        const running = snap.running === true;
        const pendingCount = Array.isArray(snap.pending) ? snap.pending.length : 0;
        if (prev !== null) {
          if (pendingCount > 0 && prev.pendingCount === 0) play("pause");
          if (prev.running && !running) play("end");
        }
        prev = { running, pendingCount };
      } catch (error) {
        console.log("dsh-session-sound: 状态检查失败", error);
      }
    }

    function attach() {
      if (appCtx === null || sessionId === null) return false;
      if (watcher !== null) {
        watcher.dispose();
        watcher = null;
      }
      const binding = appCtx.sessions.binding(sessionId);
      if (binding === undefined) return false;
      watcher = {
        session: binding.session,
        dispose: binding.session.subscribe(check),
      };
      prev = null;
      check();
      return true;
    }

    function stopRetry() {
      if (retryTimer !== null) {
        retryTimer();
        retryTimer = null;
      }
    }

    function syncTarget(force) {
      try {
        if (appCtx === null) return;
        const snap = appCtx.sessions.list.getSnapshot();
        const next = (snap !== undefined && snap.current !== undefined) ? snap.current : null;
        if (!force && next === sessionId) return;
        sessionId = next;
        stopRetry();
        if (watcher !== null) {
          watcher.dispose();
          watcher = null;
        }
        prev = null;
        if (sessionId === null) return;
        if (attach()) return;
        let tries = 0;
        retryTimer = appCtx.timer.interval(() => {
          tries += 1;
          if (attach()) stopRetry();
          else if (tries > 40) {
            stopRetry();
            console.log("dsh-session-sound: 未能建立会话监听，已停止重试");
          }
        }, 500);
      } catch (error) {
        console.log("dsh-session-sound: 会话目标同步失败", error);
      }
    }
    //#endregion

    //#region settings UI
    function Field({ label, value, min, max, step, onChange }) {
      return React.createElement(
        "label",
        { className: "dsh-snd-field" },
        React.createElement("span", { className: "dsh-snd-field-label" }, label),
        React.createElement("input", {
          type: "number",
          className: "dsh-snd-num",
          min: String(min),
          max: String(max),
          step: String(step),
          value: String(value),
          onChange: (e) => {
            const raw = e.target.value;
            if (raw === "") return;
            const n = Number(raw);
            if (!Number.isFinite(n)) return;
            onChange(Math.max(min, Math.min(max, n)));
          },
        }),
      );
    }

    function sampleDisplayName(name) {
      const label = SAMPLE_LABELS[name];
      return label === undefined ? name : name + "（" + label + "）";
    }

    function SoundGroup({ title, kind, ui, onChange }) {
      const s = ui[kind];
      const body = [];
      if (s.source === "yaru") {
        body.push(
          React.createElement(
            "div",
            { className: "dsh-snd-source", key: "source" },
            React.createElement("span", null, "音效"),
            React.createElement(
              "select",
              {
                className: "dsh-snd-select",
                value: SAMPLE_NAMES.includes(s.sample) ? s.sample : "",
                onChange: (e) => onChange({ sample: e.target.value }),
              },
              SAMPLE_NAMES.map((name) =>
                React.createElement("option", { value: name, key: name }, sampleDisplayName(name))),
            ),
          ),
        );
      } else {
        body.push(
          React.createElement(
            "div",
            { className: "dsh-snd-fields", key: "fields" },
            React.createElement(Field, {
              label: "频率 Hz", value: s.freq, min: 100, max: 20000, step: 10,
              onChange: (v) => onChange({ freq: v }),
            }),
            React.createElement(Field, {
              label: "时长 ms", value: s.duration, min: 50, max: 5000, step: 10,
              onChange: (v) => onChange({ duration: v }),
            }),
            React.createElement(Field, {
              label: "次数", value: s.count, min: 1, max: 10, step: 1,
              onChange: (v) => onChange({ count: v }),
            }),
          ),
        );
      }
      return React.createElement(
        "div",
        { className: "dsh-snd-group" + (s.enabled ? "" : " dsh-snd-disabled") },
        React.createElement(
          "div",
          { className: "dsh-snd-group-head" },
          React.createElement(
            "label",
            { className: "dsh-snd-check" },
            React.createElement("input", {
              type: "checkbox",
              checked: s.enabled,
              onChange: (e) => onChange({ enabled: e.target.checked }),
            }),
            React.createElement("span", null, title),
          ),
          React.createElement(
            "button",
            { type: "button", className: "dsh-snd-btn", onClick: () => play(kind) },
            "试听",
          ),
        ),
        React.createElement(
          "div",
          { className: "dsh-snd-source" },
          React.createElement("span", null, "音源"),
          React.createElement(
            "select",
            {
              className: "dsh-snd-select",
              value: s.source,
              onChange: (e) => onChange({ source: e.target.value }),
            },
            React.createElement("option", { value: "yaru" }, "Yaru 采样（默认）"),
            React.createElement("option", { value: "tone" }, "合成音"),
          ),
        ),
        body,
      );
    }

    function SoundPanel() {
      const [ui, setUi] = React.useState(() => ({
        pause: { ...config.pause },
        end: { ...config.end },
        volume: Math.round(config.volume * 100),
      }));

      function setKind(kind, patch) {
        const next = { ...ui, [kind]: { ...ui[kind], ...patch } };
        config[kind] = { ...next[kind] };
        setUi(next);
        saveConfig();
      }

      function setVolume(v) {
        const next = { ...ui, volume: v };
        config.volume = v / 100;
        setUi(next);
        saveConfig();
      }

      return React.createElement(
        "div",
        { className: "dsh-snd-page" },
        React.createElement(
          "div",
          { className: "dsh-snd-panel" },
          React.createElement("div", { className: "dsh-snd-title" }, "会话提示音"),
          React.createElement(
            "div",
            { className: "dsh-snd-desc" },
            "会话暂停（提问选项 / 计划审核等）播放暂停音，一轮会话结束时播放结束音；" +
              "每种行为可从 Ubuntu Yaru 声音包中挑选不同的音效。",
          ),
          React.createElement(SoundGroup, {
            title: "暂停提示音", kind: "pause", ui,
            onChange: (p) => setKind("pause", p),
          }),
          React.createElement(SoundGroup, {
            title: "结束提示音", kind: "end", ui,
            onChange: (p) => setKind("end", p),
          }),
          React.createElement(
            "div",
            { className: "dsh-snd-vol" },
            React.createElement(
              "label",
              { className: "dsh-snd-field" },
              React.createElement("span", { className: "dsh-snd-field-label" }, "音量"),
              React.createElement("input", {
                type: "range", min: "0", max: "100", step: "1",
                value: String(ui.volume),
                onChange: (e) => setVolume(Number(e.target.value)),
              }),
              React.createElement("span", { className: "dsh-snd-vol-num" }, String(ui.volume) + "%"),
            ),
          ),
          React.createElement(
            "div",
            { className: "dsh-snd-note" },
            "设置已自动保存到本浏览器；若未放行声音，请先点击一次任一「试听」按钮。" +
              "音效来自 Ubuntu Yaru 声音主题（CC-BY-SA 4.0 · github.com/ubuntu/yaru），" +
              "本地不可用时自动回退为在线源或合成音。",
          ),
        ),
      );
    }
    //#endregion

    //#region plugin body
    /** 必需服务：槽位注册、会话快照、定时器。 */
    const inject = [
      "slots",
      "sessions",
      "timer",
    ];

    function apply(ctx) {
      appCtx = ctx;
      // 跟随当前会话，启动时无会话则等待，切换会话自动重挂接
      let listDisposer = null;
      try {
        listDisposer = ctx.sessions.list.subscribe(() => syncTarget(false));
        syncTarget(false);
      } catch (error) {
        console.log("dsh-session-sound: 会话列表订阅失败", error);
      }

      ctx.on("connection/reset", () => {
        stopRetry();
        if (watcher !== null) {
          watcher.dispose();
          watcher = null;
        }
        prev = null;
        syncTarget(true);
      });

      // 停止/卸载时清理全部副作用
      ctx.effect(() => () => {
        stopRetry();
        if (watcher !== null) watcher.dispose();
        if (listDisposer !== null) listDisposer();
      });

      // 侧边栏「设置」页
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "session-sound",
        order: 25,
        label: "会话提示音",
      }, () => React.createElement(SoundPanel)));
    }
    //#endregion

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
