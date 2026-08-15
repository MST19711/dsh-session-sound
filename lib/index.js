/**
 * dsh-session-sound — Host half（静态包 v1.1.0）
 *
 * 在 DSH Web 服务器上注册 /dsh-session-sound/assets 前缀路由，从本包内的
 * assets/ 目录按需伺服 Ubuntu Yaru 音效（audio/ogg）。客户端同源 fetch 播放。
 *
 * 无硬编码路径：assets 目录通过 import.meta.url 相对本模块解析；
 * 文件名白名单（NAMES）防止路径穿越。
 *
 * License: MIT（代码）；assets/*.oga 为 CC-BY-SA-4.0（见 assets/NOTICE.md）。
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS_DIR = path.join(PACKAGE_ROOT, 'assets')

const ROUTE = '/dsh-session-sound/assets'
const MIME = 'audio/ogg'

const NAMES = [
  'audio-volume-change', 'battery-low', 'bell', 'complete', 'desktop-login',
  'desktop-logoff', 'device-added', 'device-removed', 'dialog-error',
  'dialog-question', 'dialog-warning', 'message-new-email', 'message-new-instant',
  'trash-empty', 'warty-startup',
]

export function apply(ctx) {
  const webServer = ctx.get('webServer')
  if (webServer === undefined) return

  webServer.register({
    kind: 'prefix',
    path: ROUTE,
    handler(req, res) {
      try {
        const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://local').pathname)
        const name = path.basename(pathname)
        const base = name.endsWith('.oga') ? name.slice(0, -4) : name
        if (!NAMES.includes(base)) {
          res.statusCode = 404
          res.end('not found')
          return
        }
        const file = path.join(ASSETS_DIR, base + '.oga')
        if (!existsSync(file)) {
          res.statusCode = 404
          res.end('not found')
          return
        }
        const data = readFileSync(file)
        res.statusCode = 200
        res.setHeader('Content-Type', MIME)
        res.setHeader('Content-Length', String(data.length))
        res.setHeader('Cache-Control', 'public, max-age=3600')
        res.end(data)
      } catch (error) {
        res.statusCode = 500
        res.end('internal error')
      }
    },
  })
}

export const inject = ['webServer']

export default { apply, inject }
