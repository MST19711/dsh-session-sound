/**
 * dsh-session-sound — Host half
 *
 * 会话暂停 / 结束提示音插件 v1.0.1（https://github.com/deepseek-ai/deepseek-harness 生态）。
 *
 * 职责：
 *  - 维护 Ubuntu Yaru 声音包本地目录（assets/），经 Package 私有 RPC 提供：
 *      'sounds' —— 可用音效名列表
 *      'sample' —— 指定音效的 base64 数据（文件缺失时返回 null，Client 回退 CDN/合成音）
 *
 * 依赖：ctx.fs（读取音效文件）、btoa（编码）。
 *
 * License: MIT（代码部分）；assets/*.oga 为 CC-BY-SA-4.0，见 LICENSE.md。
 */
return {
  apply(ctx) {
    const fs = ctx.get('fs')
    if (fs === undefined) return

    // ===== 音效目录 =====
    // 指向本发布包内的 assets/ 目录；请按实际安装位置修改。
    // 目录缺失时 Client 会自动回退到 CDN 在线源 / 内置合成音。
    const ASSET_DIR = '/home/CX_Li/DSH/releases/dsh-session-sound/assets'

    const NAMES = [
      'audio-volume-change', 'battery-low', 'bell', 'complete', 'desktop-login',
      'desktop-logoff', 'device-added', 'device-removed', 'dialog-error',
      'dialog-question', 'dialog-warning', 'message-new-email', 'message-new-instant',
      'trash-empty', 'warty-startup',
    ]
    const MIME = 'audio/ogg'

    const cache = {} // name -> { data, mime, label } | null

    harness.handle('sounds', () => ({ names: NAMES.slice() }))

    harness.handle('sample', async (args) => {
      const name = (args !== null && typeof args === 'object' && typeof args.name === 'string') ? args.name : ''
      if (!NAMES.includes(name)) return null
      if (cache[name] !== undefined) return cache[name]
      try {
        const target = await fs.resolve(ASSET_DIR + '/' + name + '.oga')
        const bytes = await fs.readBytes(target, undefined, 1500000)
        if (bytes === undefined || bytes.length === 0) {
          cache[name] = null
          return null
        }
        // 分块转字符串再 base64，避免大数组展开栈溢出
        let bin = ''
        const CHUNK = 8192
        for (let i = 0; i < bytes.length; i += CHUNK) {
          bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
        }
        const data = btoa(bin)
        cache[name] = { data, mime: MIME, label: name }
        return cache[name]
      } catch (error) {
        console.log('dsh-session-sound: 采样音效不可用', ASSET_DIR, name, error)
        cache[name] = null
        return null
      }
    })
  },
}
