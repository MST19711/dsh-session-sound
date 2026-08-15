/**
 * dsh-session-sound — Client half
 *
 * 会话暂停 / 结束提示音插件 v1.0.1（https://github.com/deepseek-ai/deepseek-harness 生态）。
 *
 * 功能：
 *  - 会话暂停（提问选项 ask_user_question / 计划审核等 approval 请求）时播放「暂停音」；
 *  - 一轮会话结束（agent 由 running 转为 idle）时播放「结束音」；
 *  - 两种提示音独立设置：可从 Ubuntu Yaru 声音包的 15 个音效中挑选，
 *    或使用内置合成音（频率 / 时长 / 次数可调）；配置持久化于 localStorage。
 *
 * 信号来源：订阅会话快照（sessions.binding(sessionId).session）：
 *  - 暂停：snapshot.pending 由空变为非空（approval/requested、question/requested 帧）；
 *  - 结束：snapshot.running 由 true 变为 false（host/session-status 帧）。
 *
 * 播放回退链：本地采样（Host 读取 base64 → decodeAudioData）→
 *             jsDelivr 在线源（<audio>）→ 内置合成音（正弦波）。
 *
 * License: MIT（代码部分）；音效资产为 CC-BY-SA-4.0，见 LICENSE.md。
 */
return {
  apply(ctx) {
    const slots = ctx.get('slots')
    const sessions = ctx.get('sessions')
    const timer = ctx.get('timer')
    if (slots === undefined || sessions === undefined || timer === undefined) return

    // ===== 提示音配置（暂停音 / 结束音 各自独立设置，localStorage 持久化）=====
    const STORAGE_KEY = 'dsh-session-sound:config'
    const DEFAULTS = {
      // 暂停音：默认 Yaru 采样（message-new-instant）；合成音模式为 880Hz × 2
      pause: { enabled: true, source: 'yaru', sample: 'message-new-instant', freq: 880, duration: 200, count: 2, gap: 140 },
      // 结束音：默认 Yaru 采样（complete）；合成音模式为 660Hz × 1
      end: { enabled: true, source: 'yaru', sample: 'complete', freq: 660, duration: 450, count: 1, gap: 0 },
      volume: 0.7,
    }

    // 音效名的中文说明（供选择器展示；未知音效只显示标准名）
    const SAMPLE_LABELS = {
      'audio-volume-change': '音量变化',
      'battery-low': '电量不足',
      bell: '铃声',
      complete: '任务完成',
      'desktop-login': '桌面登录',
      'desktop-logoff': '桌面注销',
      'device-added': '设备已连接',
      'device-removed': '设备已移除',
      'dialog-error': '错误提示',
      'dialog-question': '提问提示',
      'dialog-warning': '警告提示',
      'message-new-email': '新邮件',
      'message-new-instant': '新消息',
      'trash-empty': '清空回收站',
      'warty-startup': '经典启动音',
    }

    // Host 不可用时的兜底音效清单（与 Host 目录保持一致）
    const FALLBACK_SAMPLES = [
      'audio-volume-change', 'battery-low', 'bell', 'complete', 'desktop-login',
      'desktop-logoff', 'device-added', 'device-removed', 'dialog-error',
      'dialog-question', 'dialog-warning', 'message-new-email', 'message-new-instant',
      'trash-empty', 'warty-startup',
    ]

    function loadConfig() {
      let saved = null
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw !== null) saved = JSON.parse(raw)
      } catch (error) {
        saved = null
      }
      if (saved === null || typeof saved !== 'object') {
        return JSON.parse(JSON.stringify(DEFAULTS))
      }
      const out = {}
      for (const kind of ['pause', 'end']) {
        const s = saved[kind]
        const patch = (s !== null && typeof s === 'object') ? {
          enabled: typeof s.enabled === 'boolean' ? s.enabled : DEFAULTS[kind].enabled,
          source: (s.source === 'tone') ? 'tone' : 'yaru',
          sample: typeof s.sample === 'string' && s.sample.length > 0 ? s.sample : DEFAULTS[kind].sample,
          freq: Number.isFinite(s.freq) ? s.freq : DEFAULTS[kind].freq,
          duration: Number.isFinite(s.duration) ? s.duration : DEFAULTS[kind].duration,
          count: Number.isFinite(s.count) ? s.count : DEFAULTS[kind].count,
          gap: Number.isFinite(s.gap) ? s.gap : DEFAULTS[kind].gap,
        } : {}
        out[kind] = { ...DEFAULTS[kind], ...patch }
      }
      out.volume = (typeof saved.volume === 'number' && Number.isFinite(saved.volume))
        ? Math.max(0, Math.min(1, saved.volume))
        : DEFAULTS.volume
      return out
    }

    const config = loadConfig()

    function saveConfig() {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
        return true
      } catch (error) {
        // 存储配额不足等情况：配置保留在内存中，播放不受影响
        return false
      }
    }

    // ===== 采样音效（Yaru）：Host 读取 → base64 → 解码播放 =====
    // 回退链：本地采样 → jsDelivr 在线源（<audio>）→ 合成音
    function remoteUrl(name) {
      return 'https://cdn.jsdelivr.net/gh/ubuntu/yaru@master/sounds/src/stereo/' + name + '.oga'
    }

    const sampleCache = {} // 按音效名缓存解码 Promise
    function ensureSampleBuffer(ac, name) {
      if (sampleCache[name] !== undefined) return sampleCache[name]
      const p = (async () => {
        let raw = null
        try {
          raw = await host.call('sample', { name })
        } catch (error) {
          raw = null
        }
        if (raw === null || typeof raw !== 'object' || typeof raw.data !== 'string') return null
        try {
          const bin = window.atob(raw.data)
          const u8 = new Uint8Array(bin.length)
          for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i)
          return await ac.decodeAudioData(u8.buffer)
        } catch (error) {
          return null
        }
      })()
      sampleCache[name] = p
      return p
    }

    function playUrl(url) {
      if (typeof url !== 'string' || url.trim().length === 0) return
      try {
        const el = document.createElement('audio')
        el.src = url.trim()
        el.volume = Math.max(0, Math.min(1, config.volume))
        el.play().catch(() => {})
      } catch (error) {
        // 浏览器不支持时忽略，交由合成音兜底
      }
    }

    // ===== Web Audio：合成音 + 采样播放 =====
    let audioCtx = null
    function getAudioCtx() {
      if (audioCtx === null) {
        const AC = window.AudioContext || window.webkitAudioContext
        if (AC === undefined) return null
        audioCtx = new AC()
      }
      return audioCtx
    }

    function noteAt(ac, freq, dur, vol, t) {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t)
      const peak = Math.max(0.02, Math.min(1, vol)) * 0.3
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.015)
      const holdEnd = t + Math.max(0.03, dur - 0.06)
      gain.gain.setValueAtTime(peak, holdEnd)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.06)
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.start(t)
      osc.stop(t + dur + 0.1)
    }

    function playTone(kind) {
      const s = config[kind]
      if (s === undefined || !s.enabled) return
      const ac = getAudioCtx()
      if (ac === null) return
      if (ac.state === 'suspended') ac.resume().catch(() => {})
      const t0 = ac.currentTime + 0.03
      for (let i = 0; i < s.count; i += 1) {
        const t = t0 + (i * (s.duration + s.gap)) / 1000
        noteAt(ac, s.freq, s.duration / 1000, config.volume, t)
      }
    }

    function playBuffer(ac, buf) {
      const src = ac.createBufferSource()
      const gain = ac.createGain()
      src.buffer = buf
      gain.gain.value = Math.max(0.05, Math.min(1, config.volume)) * 0.9
      src.connect(gain)
      gain.connect(ac.destination)
      src.start()
    }

    function playSample(kind) {
      const s = config[kind]
      if (s === undefined) return
      const name = s.sample
      const ac = getAudioCtx()
      if (ac === null) {
        playUrl(remoteUrl(name))
        return
      }
      if (ac.state === 'suspended') ac.resume().catch(() => {})
      ensureSampleBuffer(ac, name)
        .then((buf) => {
          if (buf === null) playUrl(remoteUrl(name))
          else playBuffer(ac, buf)
        })
        .catch(() => playUrl(remoteUrl(name)))
    }

    function play(kind) {
      const s = config[kind]
      if (s === undefined || !s.enabled) return
      if (s.source === 'yaru') playSample(kind)
      else playTone(kind)
    }

    // ===== 会话状态监听 =====
    // 暂停信号：快照 pending 出现等待项（approval / question 帧，即计划审核 / 提问选项）
    // 结束信号：running 由 true 变 false（一轮会话/回合结束）
    let sessionId = null
    let watcher = null // { session, dispose }
    let retryTimer = null
    let prev = null

    function check() {
      try {
        if (watcher === null) return
        const snap = watcher.session.getSnapshot()
        const running = snap.running === true
        const pendingCount = Array.isArray(snap.pending) ? snap.pending.length : 0
        if (prev !== null) {
          if (pendingCount > 0 && prev.pendingCount === 0) play('pause')
          if (prev.running && !running) play('end')
        }
        prev = { running, pendingCount }
      } catch (error) {
        console.log('dsh-session-sound: 状态检查失败', error)
      }
    }

    function attach() {
      if (sessionId === null) return false
      if (watcher !== null) {
        watcher.dispose()
        watcher = null
      }
      const binding = sessions.binding(sessionId)
      if (binding === undefined) return false
      watcher = {
        session: binding.session,
        dispose: binding.session.subscribe(check),
      }
      prev = null
      check() // 以当前状态为基准，避免激活瞬间误报
      return true
    }

    function stopRetry() {
      if (retryTimer !== null) {
        retryTimer()
        retryTimer = null
      }
    }

    function start(sid) {
      sessionId = sid
      stopRetry()
      if (attach()) return
      let tries = 0
      retryTimer = timer.interval(() => {
        tries += 1
        if (attach()) stopRetry()
        else if (tries > 40) {
          stopRetry()
          console.log('dsh-session-sound: 未能建立会话监听，已停止重试')
        }
      }, 500)
    }

    // 激活即监听当前会话；Run 卡片挂载后会以精确 sessionId 校正
    try {
      const listSnap = sessions.list.getSnapshot()
      if (listSnap !== undefined && listSnap.current !== undefined) start(listSnap.current)
    } catch (error) {
      // 列表快照不可用时等待 Run 卡片提供 sessionId
    }

    // 连接重建后重新挂接（会话绑定可能已刷新）
    ctx.on('connection/reset', () => {
      if (sessionId !== null) {
        prev = null
        attach()
      }
    })

    // 插件停止/更新时清理所有副作用
    ctx.effect(() => () => {
      stopRetry()
      if (watcher !== null) watcher.dispose()
    })

    // ===== 设置面板（Run 卡片 + 侧边栏设置页共用）=====
    styles.insert(`
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
    `)

    function Field({ label, value, min, max, step, onChange }) {
      return React.createElement(
        'label',
        { className: 'dsh-snd-field' },
        React.createElement('span', { className: 'dsh-snd-field-label' }, label),
        React.createElement('input', {
          type: 'number',
          className: 'dsh-snd-num',
          min: String(min),
          max: String(max),
          step: String(step),
          value: String(value),
          onChange: (e) => {
            const raw = e.target.value
            if (raw === '') return
            const n = Number(raw)
            if (!Number.isFinite(n)) return
            onChange(Math.max(min, Math.min(max, n)))
          },
        }),
      )
    }

    function sampleDisplayName(name) {
      const label = SAMPLE_LABELS[name]
      return label === undefined ? name : name + '（' + label + '）'
    }

    function SoundGroup({ title, kind, ui, samples, onChange }) {
      const s = ui[kind]
      const body = []
      if (s.source === 'yaru') {
        body.push(
          React.createElement(
            'div',
            { className: 'dsh-snd-source', key: 'source' },
            React.createElement('span', null, '音效'),
            React.createElement(
              'select',
              {
                className: 'dsh-snd-select',
                value: samples.includes(s.sample) ? s.sample : '',
                onChange: (e) => onChange({ sample: e.target.value }),
              },
              samples.map((name) =>
                React.createElement('option', { value: name, key: name }, sampleDisplayName(name))),
            ),
          ),
        )
      } else {
        body.push(
          React.createElement(
            'div',
            { className: 'dsh-snd-fields', key: 'fields' },
            React.createElement(Field, {
              label: '频率 Hz', value: s.freq, min: 100, max: 20000, step: 10,
              onChange: (v) => onChange({ freq: v }),
            }),
            React.createElement(Field, {
              label: '时长 ms', value: s.duration, min: 50, max: 5000, step: 10,
              onChange: (v) => onChange({ duration: v }),
            }),
            React.createElement(Field, {
              label: '次数', value: s.count, min: 1, max: 10, step: 1,
              onChange: (v) => onChange({ count: v }),
            }),
          ),
        )
      }
      return React.createElement(
        'div',
        { className: 'dsh-snd-group' + (s.enabled ? '' : ' dsh-snd-disabled') },
        React.createElement(
          'div',
          { className: 'dsh-snd-group-head' },
          React.createElement(
            'label',
            { className: 'dsh-snd-check' },
            React.createElement('input', {
              type: 'checkbox',
              checked: s.enabled,
              onChange: (e) => onChange({ enabled: e.target.checked }),
            }),
            React.createElement('span', null, title),
          ),
          React.createElement(
            'button',
            { type: 'button', className: 'dsh-snd-btn', onClick: () => play(kind) },
            '试听',
          ),
        ),
        React.createElement(
          'div',
          { className: 'dsh-snd-source' },
          React.createElement('span', null, '音源'),
          React.createElement(
            'select',
            {
              className: 'dsh-snd-select',
              value: s.source,
              onChange: (e) => onChange({ source: e.target.value }),
            },
            React.createElement('option', { value: 'yaru' }, 'Yaru 采样（默认）'),
            React.createElement('option', { value: 'tone' }, '合成音'),
          ),
        ),
        body,
      )
    }

    function SoundPanel(props) {
      const sid = props.sessionId
      const page = props.page === true
      const [ui, setUi] = React.useState(() => ({
        pause: { ...config.pause },
        end: { ...config.end },
        volume: Math.round(config.volume * 100),
      }))
      const [samples, setSamples] = React.useState(FALLBACK_SAMPLES)

      React.useEffect(() => {
        if (sid !== undefined) start(sid)
      }, [sid])

      // 从 Host 拉取可用音效清单；校验已保存的选中项是否仍有效
      React.useEffect(() => {
        let cancelled = false
        host.call('sounds')
          .then((res) => {
            if (cancelled) return
            if (res !== null && typeof res === 'object' && Array.isArray(res.names) && res.names.length > 0) {
              const names = res.names
              setSamples(names)
              let dirty = false
              for (const kind of ['pause', 'end']) {
                const s = config[kind]
                if (s !== undefined && s.source === 'yaru' && !names.includes(s.sample)) {
                  config[kind] = { ...s, sample: DEFAULTS[kind].sample }
                  dirty = true
                }
              }
              if (dirty) saveConfig()
            }
          })
          .catch(() => {})
        return () => { cancelled = true }
      }, [])

      function setKind(kind, patch) {
        const next = { ...ui, [kind]: { ...ui[kind], ...patch } }
        config[kind] = { ...next[kind] }
        setUi(next)
        saveConfig()
      }

      function setVolume(v) {
        const next = { ...ui, volume: v }
        config.volume = v / 100
        setUi(next)
        saveConfig()
      }

      const panel = React.createElement(
        'div',
        { className: 'dsh-snd-panel' },
        React.createElement('div', { className: 'dsh-snd-title' }, '会话提示音'),
        React.createElement(
          'div',
          { className: 'dsh-snd-desc' },
          '会话暂停（提问选项 / 计划审核等）播放暂停音，一轮会话结束时播放结束音；' +
            '每种行为可从 Ubuntu Yaru 声音包中挑选不同的音效。',
        ),
        React.createElement(SoundGroup, {
          title: '暂停提示音', kind: 'pause', ui, samples,
          onChange: (p) => setKind('pause', p),
        }),
        React.createElement(SoundGroup, {
          title: '结束提示音', kind: 'end', ui, samples,
          onChange: (p) => setKind('end', p),
        }),
        React.createElement(
          'div',
          { className: 'dsh-snd-vol' },
          React.createElement(
            'label',
            { className: 'dsh-snd-field' },
            React.createElement('span', { className: 'dsh-snd-field-label' }, '音量'),
            React.createElement('input', {
              type: 'range', min: '0', max: '100', step: '1',
              value: String(ui.volume),
              onChange: (e) => setVolume(Number(e.target.value)),
            }),
            React.createElement('span', { className: 'dsh-snd-vol-num' }, String(ui.volume) + '%'),
          ),
        ),
        React.createElement(
          'div',
          { className: 'dsh-snd-note' },
          '设置已自动保存到本浏览器；若未放行声音，请先点击一次任一「试听」按钮。' +
            '音效来自 Ubuntu Yaru 声音主题（CC-BY-SA 4.0 · github.com/ubuntu/yaru），' +
            '本地不可用时自动回退为在线源或合成音。',
        ),
      )

      if (page) {
        return React.createElement('div', { className: 'dsh-snd-page' }, panel)
      }
      return panel
    }

    // Run 卡片内面板
    slots.inject('tool.view.cordis', () => slots.register(
      { name: 'tool.view.cordis', key: 'self' },
      (props) => React.createElement(SoundPanel, { sessionId: props.sessionId }),
    ))

    // 侧边栏「设置」页
    slots.inject('settings.section', () => slots.register(
      { name: 'settings.section', id: 'session-sound', order: 25, label: '会话提示音' },
      () => React.createElement(SoundPanel, { page: true }),
    ))
  },
}
