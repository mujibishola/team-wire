import type { Area, Member, Msg, Team, View } from '../types'
import { hhmm, initials, labelOf, line, reworkOf, shortName } from './model'

/* ---------- shared ---------- */

export type Seg = { t: string; color?: string; dim?: boolean; bold?: boolean }
export type Line = Seg[]
export type Theme = 'light' | 'dark' | 'auto'

// Raw colours that read on both a light and a dark terminal background.
export const AREA_COLOR: Record<Area, string> = {
  lead: '#e8930c', backend: '#1fb3a1', ui: '#8f7cf5', qa: '#43b05c', sec: '#e5575c', rev: '#3a9fe0',
}
export const AREA_NAME: Record<Area, string> = {
  lead: 'Lead', backend: 'Backend', ui: 'Web & mobile', qa: 'QA', sec: 'Security', rev: 'Review',
}
export const KIND_LABEL = { handoff: 'hand-off', problem: 'problem', approve: 'approved', merge: 'merged', note: 'note' } as const
const KIND_KEY = { handoff: 'suggestion', problem: 'error', approve: 'success', merge: 'claude', note: 'subtle' } as const
export const kindColor = (k: Msg['kind']): string => KIND_KEY[k]

const stationOf = (kind?: string): string | undefined => (kind === reworkOf().kind ? reworkOf().to : kind)
// A project's own label, else the kind itself: "code-review" reads "Code review", "qa" "QA".
export const titled = (k: string) => (k.length <= 3 ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1).replace(/-/g, ' '))
export const stationName = (k: string): string => labelOf(k) ?? titled(k)
const abbr = (k: string): string => (labelOf(k) ?? k).replace(/[^a-z0-9]/gi, '').slice(0, 3).toLowerCase()

const glyph = (m: Member): Seg =>
  m.isFlagged ? { t: '▲', color: 'error' }
    : m.status === 'working' ? { t: '●', color: 'success' }
      : m.status === 'waiting' ? { t: '◷', color: 'warning' }
        : { t: '·', dim: true }

const taskShort = (m: Member): string => (m.issue !== undefined ? `#${m.issue} ${m.kind}` : m.name === 'lead' ? 'running the team' : 'free')
const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length))
const cut = (s: string, n: number) => (n <= 1 ? '' : s.length > n ? s.slice(0, n - 1) + '…' : s)

export const summary = (team: Team): string => {
  const w = team.members.filter(m => m.status === 'working').length
  const q = team.members.filter(m => m.status === 'waiting').length
  const f = team.members.filter(m => m.isFlagged).length
  const shipped = team.issues.filter(i => i.isShipped).length
  return `${w} working · ${q} waiting${f ? ` · ${f} need attention` : ''} · ${shipped}/${team.issues.length} issues merged`
}

export const messageLines = (team: Team, cols: number, rows: number): Line[] =>
  team.messages.slice(-rows).reverse().map(m => [
    { t: `${hhmm(m.ts)} `, dim: true },
    { t: shortName(m.from), color: AREA_COLOR[team.members.find(x => x.name === m.from)?.area ?? 'lead'] },
    { t: ` → ${m.to === 'lead' ? 'lead' : shortName(m.to)} `, dim: true },
    { t: `${KIND_LABEL[m.kind]} `, color: kindColor(m.kind) },
    { t: cut(m.text.replace(/\s+/g, ' '), Math.max(10, cols - 36)) },
  ])

/* ---------- terminal text ---------- */

const textMap = (team: Team, cols: number): Line[] => {
  const out: Line[] = [[{ t: 'Who talks to whom', bold: true }, { t: ' · messages per pair', dim: true }]]
  const pairs = [...team.pairs].sort((a, b) => b.n - a.n)
  const max = Math.max(1, ...pairs.map(p => p.n))
  const barW = Math.max(6, Math.min(24, cols - 42))
  for (const p of pairs.slice(0, 14)) {
    const filled = Math.max(1, Math.round((p.n / max) * barW))
    out.push([
      { t: pad(shortName(p.a), 12) + ' ⇄ ' },
      { t: pad(shortName(p.b), 12) + ' ' },
      { t: '█'.repeat(filled), color: AREA_COLOR[team.members.find(m => m.name === (p.a === 'lead' ? p.b : p.a))?.area ?? 'lead'] },
      { t: '░'.repeat(barW - filled) + ` ${p.n}`, dim: true },
    ])
  }
  if (!pairs.length) out.push([{ t: 'No messages yet.', dim: true }])
  const talking = new Set(team.pairs.flatMap(p => [p.a, p.b]))
  const quiet = team.members.filter(m => !talking.has(m.name)).map(m => shortName(m.name))
  out.push([], [{ t: 'Quiet: ', dim: true }, { t: quiet.join(', ') || 'nobody' }])
  return out
}

const textOffice = (team: Team, cols: number): Line[] => {
  const out: Line[] = []
  for (const area of Object.keys(AREA_NAME) as Area[]) {
    const ms = team.members.filter(m => m.area === area)
    if (!ms.length) continue
    const title = ` ${AREA_NAME[area]} `
    out.push([{ t: '──' + title + '─'.repeat(Math.max(2, Math.min(cols, 60) - title.length - 2)), color: AREA_COLOR[area] }])
    for (const m of ms) out.push([{ t: '  ' }, glyph(m), { t: ' ' + pad(shortName(m.name), 14) }, { t: cut(taskShort(m), cols - 20), dim: m.status === 'free' }])
  }
  return out
}

const textFactory = (team: Team, cols: number): Line[] => {
  const live = team.issues.filter(i => !i.isShipped && i.at !== undefined)
  const shipped = team.issues.filter(i => i.isShipped).length
  const queued = team.issues.filter(i => !i.isShipped && i.at === undefined).length
  const workers = (n: number) => team.members.filter(m => m.status === 'working' && m.issue === n).map(m => initials(m.name)).join(' ')
  const out: Line[] = []
  if (cols >= 64) {
    out.push([{ t: 'issue ', dim: true }, { t: line().map(k => pad(abbr(k), 4)).join(''), dim: true }])
    for (const i of live.slice(0, 16)) {
      const row: Line = [{ t: pad(`#${i.issue}`, 6), color: i.isRework ? 'error' : AREA_COLOR.lead }]
      for (const k of line()) {
        const s = i.stages[k]
        row.push(s === 'done' ? { t: '✓   ', color: 'success' } : s === 'run' ? { t: '▶   ', color: 'warning' } : s === 'wait' ? { t: '◷   ', dim: true } : { t: '    ' })
      }
      row.push({ t: workers(i.issue), dim: true })
      if (i.isRework) row.push({ t: ' rework', color: 'error' })
      out.push(row)
    }
  } else {
    for (const i of live.slice(0, 16)) {
      const done = Object.values(i.stages).filter(s => s === 'done').length
      out.push([{ t: pad(`#${i.issue}`, 5), color: i.isRework ? 'error' : AREA_COLOR.lead }, { t: `▶ ${stationName(i.at!)} ` }, { t: `${done}/${Object.keys(i.stages).length} ${workers(i.issue)}`, dim: true }])
    }
  }
  if (!live.length) out.push([{ t: 'Nothing on the line.', dim: true }])
  const breakRoom = team.members.filter(m => m.name !== 'lead' && m.status !== 'working').map(m => shortName(m.name))
  out.push([], [{ t: '🚚 ', dim: true }, { t: `${shipped} shipped`, color: 'success' }, { t: ` · ${queued} in the loading bay`, dim: true }])
  out.push([{ t: 'Break room: ', dim: true }, { t: cut(breakRoom.join(', ') || 'empty', cols - 12) }])
  return out
}

export const textView = (team: Team, view: View, cols: number): Line[] =>
  view === 'map' ? textMap(team, cols) : view === 'office' ? textOffice(team, cols) : textFactory(team, cols)

/* ---------- SVG (desktop, VS Code, mobile) ---------- */

const LIGHT = 'bg:#f7f8fa;surface:#ffffff;fg:#0f1420;muted:#606a7d;line:#e3e6ec;grid:#eceff3;belt:#c9ced8;belthi:#aab1be;on:#ffffff;lead:#e8890c;backend:#0d9f8f;ui:#7c5cf0;qa:#2f9e44;sec:#e5484d;rev:#0b8bd1;ok:#2f9e44;warn:#e8890c;bad:#e5484d;idle:#9aa3b3'
const DARK = 'bg:#0d1016;surface:#161a23;fg:#eef1f6;muted:#9aa3b5;line:#2a3140;grid:#161b25;belt:#2a3140;belthi:#3a4356;on:#0b0d12;lead:#ffa940;backend:#2fd3bf;ui:#a08bff;qa:#5cd36f;sec:#ff6b70;rev:#4cb8ff;ok:#5cd36f;warn:#ffa940;bad:#ff6b70;idle:#5f687a'
const vars = (p: string) => p.split(';').map(kv => { const [k, v] = kv.split(':'); return `--${k}:${v}` }).join(';')

export const svgStyle = (theme: Theme) => `<style>
svg{${vars(theme === 'dark' ? DARK : LIGHT)}}
${theme === 'auto' ? `@media (prefers-color-scheme:dark){svg{${vars(DARK)}}}` : ''}
text{font-family:ui-monospace,Menlo,monospace}
.lbl{font:600 11px ui-sans-serif,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}
.sm{font-size:9.5px;fill:var(--muted)}
.nm{font-size:10px;fill:var(--fg)}
.ini{font:700 11px ui-sans-serif,system-ui,sans-serif;fill:var(--on)}
.ml{font-size:9.5px;fill:var(--fg)}
.spin{animation:spin 3s linear infinite;transform-box:fill-box;transform-origin:center}
.pulse{animation:pulse 1s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.belt{animation:belt 1s linear infinite}
.blink{animation:blink 1s steps(2,jump-none) infinite}
@keyframes blink{50%{opacity:.15}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{50%{transform:scale(1.5);opacity:.4}}
@keyframes belt{to{stroke-dashoffset:-16}}
@media (prefers-reduced-motion:reduce){.spin,.pulse,.belt,.blink{animation:none}}
</style>`

export const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const v = (a: Area) => `var(--${a})`

// The teammate picked in the pane, ringed in whichever view draws them; set by svgView for one synchronous draw.
let selected = ''
// A still picture (the terminal's PNG) leaves out what only makes sense moving: the planes and dots in flight.
let isStill = false
// A frame of the terminal's animation: where in its loop (0 to 1) each moving thing is drawn, or null for none.
let phase: number | null = null
// Where this draw put each teammate, in the view's own coordinates: what a click on the picture is matched against.
/** What a click there does (`who:<name>`, `issue:<n>`) and the circle it covers. */
export type Spot = { action: string; x: number; y: number; r: number }
let spots: Spot[] | null = null
// Teammates with a fresh alert: a red ring blinks round them for a while.
let flashing = new Set<string>()

// The point and heading `t` of the way along a path of one line (`M L`) or one quadratic curve (`M Q`).
const along = (d: string, t: number): [number, number, number] => {
  const n = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)
  if (n.length >= 6) {
    const [x1, y1, cx, cy, x2, y2] = n as [number, number, number, number, number, number]
    const x = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t ** 2 * x2
    const y = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t ** 2 * y2
    const dx = 2 * (1 - t) * (cx - x1) + 2 * t * (x2 - cx)
    const dy = 2 * (1 - t) * (cy - y1) + 2 * t * (y2 - cy)
    return [x, y, (Math.atan2(dy, dx) * 180) / Math.PI]
  }
  const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = n
  return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI]
}

const person = (m: Member, x: number, y: number, opts: { big?: boolean; hat?: boolean; label?: string; isNameless?: boolean } = {}) => {
  const r = opts.big ? 17 : 13
  spots?.push({ action: `who:${m.name}`, x, y, r: r + 6 })
  const ring = m.isFlagged ? 'bad' : m.status === 'working' ? 'ok' : m.status === 'waiting' ? 'warn' : 'idle'
  const spin = m.status === 'working' ? ` stroke-dasharray="${((r + 4) * 1.2).toFixed(1)} ${((r + 4) * 0.37).toFixed(1)}" class="spin"` : ''
  let s = `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><title>${esc(m.name)}: ${esc(m.task ?? m.status)}</title>`
  if (m.name === selected) s += `<circle r="${r + 10}" fill="var(--fg)" fill-opacity=".08" stroke="var(--fg)" stroke-width="1.5" stroke-dasharray="3 3"/>`
  s += `<circle r="${r + 4}" fill="none" stroke="var(--${ring})" stroke-width="2.2"${spin}/>`
  s += `<circle r="${r}" fill="${v(m.area)}"/><text class="ini" y="4" text-anchor="middle">${esc(initials(m.name))}</text>`
  if (opts.hat) s += `<g transform="translate(0 ${-r + 2})"><path d="M-12 -8 A12 10 0 0 1 12 -8 Z" fill="var(--warn)"/><rect x="-14" y="-9" width="28" height="3" rx="1.5" fill="var(--warn)"/></g>`
  if (m.status === 'waiting' && !m.isFlagged) s += `<g transform="translate(${r + 2} ${-r - 2})"><circle r="6.5" fill="var(--surface)" stroke="var(--warn)" stroke-width="1.5"/><path d="M0 -3.5V0H3" stroke="var(--warn)" stroke-width="1.4" fill="none"/></g>`
  if (flashing.has(m.name)) s += `<circle r="${r + 13}" fill="none" stroke="var(--bad)" stroke-width="3" class="blink"/>`
  if (m.isFlagged) s += `<g transform="translate(${-r - 2} ${-r - 2})"><circle r="9" fill="var(--bad)" fill-opacity=".35" class="pulse"/><circle r="5" fill="var(--bad)"/></g>`
  if (!opts.isNameless) s += `<text class="nm" y="${r + 16}" text-anchor="middle">${esc(shortName(m.name))}</text>`
  if (opts.label) s += `<text class="sm" y="${r + 27}" text-anchor="middle">${esc(opts.label)}</text>`
  return s + '</g>'
}

const frame = (w: number, h: number, theme: Theme, body: string, pattern: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${svgStyle(theme)}<defs>${pattern}</defs><rect width="${w}" height="${h}" fill="var(--bg)"/><rect width="${w}" height="${h}" fill="url(#p)"/>${body}</svg>`

const isRecent = (ts: string, last: string, minutes: number) => Date.parse(last) - Date.parse(ts) < minutes * 60_000

// A dot (or a plane) that keeps flying along a path while its pair is talking.
const flier = (path: string, color: string, shape: 'dot' | 'plane', dur = 2.2) => {
  if (phase !== null) {
    const [x, y, a] = along(path, phase)
    const body = shape === 'dot'
      ? `<circle r="5" fill="${color}"/><circle r="10" fill="${color}" fill-opacity=".2"/>`
      : `<path d="M-9,-6 L11,0 L-9,6 L-4,0 Z" fill="var(--surface)" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>`
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})${shape === 'plane' ? ` rotate(${a.toFixed(0)})` : ''}">${body}</g>`
  }
  if (isStill) return ''
  const body = shape === 'dot'
    ? `<circle r="5" fill="${color}"/><circle r="10" fill="${color}" fill-opacity=".2"/>`
    : `<path d="M-9,-6 L11,0 L-9,6 L-4,0 Z" fill="var(--surface)" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>`
  return `<g>${body}<animateMotion dur="${dur}s" repeatCount="indefinite" rotate="${shape === 'plane' ? 'auto' : '0'}" path="${path}"/></g>`
}

const svgMap = (team: Team, theme: Theme) => {
  const W = 640, H = 440, cx = 320, cy = 220
  const pos = new Map<string, [number, number]>()
  const others = team.members.filter(m => m.name !== 'lead')
  pos.set('lead', [cx, cy])
  others.forEach((m, i) => {
    const a = -Math.PI / 2 + (i / Math.max(1, others.length)) * Math.PI * 2
    pos.set(m.name, [cx + 250 * Math.cos(a), cy + 160 * Math.sin(a)])
  })
  const path = (a: string, b: string) => {
    const [x1, y1] = pos.get(a)!, [x2, y2] = pos.get(b)!
    if (a === 'lead' || b === 'lead') return { d: `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 }
    const qx = (x1 + x2) / 2 + (cx - (x1 + x2) / 2) * 0.5, qy = (y1 + y2) / 2 + (cy - (y1 + y2) / 2) * 0.5
    return { d: `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${qx.toFixed(1)} ${qy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`, mx: 0.25 * x1 + 0.5 * qx + 0.25 * x2, my: 0.25 * y1 + 0.5 * qy + 0.25 * y2 }
  }
  let s = ''
  for (const r of [90, 160, 230]) s += `<ellipse cx="${cx}" cy="${cy}" rx="${r * 1.1}" ry="${r * 0.7}" fill="none" stroke="var(--grid)"/>`
  const max = Math.max(1, ...team.pairs.map(p => p.n))
  const talking = new Set(team.pairs.flatMap(p => [p.a, p.b]))
  for (const m of others) if (!talking.has(m.name)) s += `<path d="${path('lead', m.name).d}" stroke="var(--line)" stroke-dasharray="2 5" fill="none"/>`
  for (const p of team.pairs) {
    if (!pos.has(p.a) || !pos.has(p.b)) continue
    const { d, mx, my } = path(p.a, p.b)
    const area = team.members.find(m => m.name === (p.a === 'lead' ? p.b : p.a))?.area ?? 'lead'
    s += `<path d="${d}" fill="none" stroke="${v(area)}" stroke-opacity=".45" stroke-width="${(1.5 + (p.n / max) * 6).toFixed(1)}" stroke-linecap="round"/>`
    if (isRecent(p.lastTs, team.lastTs, 10)) s += flier(d, v(area), 'dot')
    if (p.n < max * 0.2) continue
    s += `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="10" fill="var(--surface)" stroke="${v(area)}"/><text class="sm" x="${mx.toFixed(1)}" y="${(my + 3).toFixed(1)}" text-anchor="middle" style="fill:var(--fg)">${p.n}</text>`
  }
  for (const m of team.members) { const [x, y] = pos.get(m.name)!; s += person(m, x, y, { big: m.name === 'lead' }) }
  return frame(W, H, theme, s, `<radialGradient id="p" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="var(--surface)"/><stop offset="1" stop-color="var(--bg)"/></radialGradient>`)
}

const svgOffice = (team: Team, theme: Theme) => {
  const W = 900, H = 560, RW = 274, RH = 255
  const rooms: [Area, number, number][] = [['backend', 20, 20], ['lead', 313, 20], ['ui', 606, 20], ['qa', 20, 290], ['sec', 313, 290], ['rev', 606, 290]]
  const pos = new Map<string, [number, number]>()
  let s = ''
  for (const [area, rx, ry] of rooms) {
    s += `<rect x="${rx}" y="${ry}" width="${RW}" height="${RH}" rx="18" fill="${v(area)}" fill-opacity=".06" stroke="${v(area)}" stroke-opacity=".35"/>`
    s += `<text class="lbl" x="${rx + 16}" y="${ry + 24}" fill="${v(area)}">${esc(AREA_NAME[area])}</text>`
    const ms = team.members.filter(m => m.area === area).slice(0, 6)
    ms.forEach((m, i) => {
      const cols = Math.min(3, ms.length)
      const x = rx + RW / 2 + ((i % 3) - (cols - 1) / 2) * 88
      const y = ry + 62 + Math.floor(i / 3) * 100
      const on = m.status === 'working'
      s += `<rect x="${x - 36}" y="${y - 14}" width="72" height="28" rx="8" fill="var(--surface)" stroke="var(--line)"/>`
      s += `<rect x="${x - 14}" y="${y - 10}" width="28" height="16" rx="3" fill="${on ? v(m.area) : 'var(--line)'}"${on ? ' class="pulse"' : ''} fill-opacity="${on ? 0.8 : 1}"/>`
      pos.set(m.name, [x, y + 38])
      s += person(m, x, y + 38, { big: m.name === 'lead', label: m.issue !== undefined ? `#${m.issue} ${m.kind}` : m.name === 'lead' ? '' : 'free' })
    })
  }
  // The latest messages keep flying as paper planes; the newest shows its words.
  const recent = team.messages.filter(m => isRecent(m.ts, team.lastTs, 5) && pos.has(m.from) && pos.has(m.to) && m.from !== m.to).slice(-3)
  for (const m of recent) {
    const [x1, y1] = pos.get(m.from)!, [x2, y2] = pos.get(m.to)!
    const d = `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${((x1 + x2) / 2).toFixed(1)} ${(Math.min(y1, y2) - 90).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`
    s += flier(d, v(team.members.find(x => x.name === m.from)?.area ?? 'lead'), 'plane', 2.6)
  }
  const last = team.messages[team.messages.length - 1]
  if (last && pos.has(last.to)) {
    const [x, y] = pos.get(last.to)!
    const txt = cut(last.text.replace(/\s+/g, ' '), 40), w = txt.length * 6 + 24
    const bx = Math.max(8, Math.min(W - w - 8, x - w / 2)), by = Math.max(6, y - 64)
    s += `<g><rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${w.toFixed(1)}" height="24" rx="12" fill="var(--surface)" stroke="var(--${last.kind === 'problem' ? 'bad' : last.kind === 'approve' ? 'ok' : 'backend'})" stroke-width="1.5"/><text class="ml" x="${(bx + 12).toFixed(1)}" y="${(by + 16).toFixed(1)}">${esc(txt)}</text></g>`
  }
  return frame(W, H, theme, s, `<pattern id="p" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="var(--grid)"/></pattern>`)
}

const B1 = 170, B2 = 500
// Where each step's station stands: the first half along line 1 left to right, the rest along line 2 right to left.
const stations = (): Record<string, [number, number]> => {
  const steps = line()
  const top = Math.ceil(steps.length / 2)
  const out: Record<string, [number, number]> = {}
  steps.forEach((k, i) => {
    const onTop = i < top
    const n = onTop ? top : steps.length - top
    const j = onTop ? i : i - top
    const t = n === 1 ? 0.5 : j / (n - 1)
    out[k] = onTop ? [Math.round(80 + t * 720), B1] : [Math.round(815 - t * 550), B2]
  })
  return out
}

const crate = (x: number, y: number, label: string, color: string) => {
  spots?.push({ action: `issue:${label.replace('#', '')}`, x, y, r: 16 })
  return `<g transform="translate(${x} ${y})"><rect x="-16" y="-11" width="32" height="22" rx="4" fill="var(--surface)" stroke="${color}" stroke-width="2"/><text class="sm" y="3.5" text-anchor="middle" style="fill:var(--fg)">${esc(label)}</text></g>`
}

const svgFactory = (team: Team, theme: Theme) => {
  const W = 900, H = 600
  let s = ''
  const at0 = stations()
  const belt = `M30 ${B1}H850Q872 ${B1} 872 ${B1 + 22}V${B2 - 22}Q872 ${B2} 850 ${B2}H150`
  s += `<path d="${belt}" fill="none" stroke="var(--belt)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>`
  s += `<path d="${belt}" fill="none" stroke="var(--belthi)" stroke-width="2" stroke-dasharray="6 10" class="belt"/>`

  const running = new Set(team.issues.flatMap(i => Object.entries(i.stages).filter(([, st]) => st === 'run').map(([k]) => stationOf(k)!)))
  for (const [k, [x, y]] of Object.entries(at0)) {
    const on = running.has(k)
    s += `<rect x="${x - 44}" y="${y - 58}" width="88" height="42" rx="10" fill="var(--surface)" stroke="var(--line)"/><text class="ml" x="${x}" y="${y - 32}" text-anchor="middle">${esc(stationName(k))}</text>`
    s += `<circle cx="${x + 33}" cy="${y - 49}" r="4" fill="var(--${on ? 'ok' : 'line'})"${on ? ' class="pulse"' : ''}/>`
    if (on) s += `<g transform="translate(${x - 33} ${y - 47})"><circle r="5.5" fill="none" stroke="var(--muted)" stroke-width="3" stroke-dasharray="3 2.2" class="spin"/></g>`
  }

  // Middle band: break room, control room, loading bay.
  s += `<rect x="30" y="285" width="300" height="112" rx="16" fill="var(--surface)" stroke="var(--line)"/><text class="lbl" x="44" y="306" fill="var(--muted)">Break room</text>`
  s += `<rect x="350" y="285" width="180" height="112" rx="16" fill="var(--surface)" stroke="var(--lead)" stroke-opacity=".6"/><text class="lbl" x="364" y="306" fill="var(--lead)">Control room</text>`
  s += `<rect x="550" y="285" width="190" height="112" rx="16" fill="var(--surface)" stroke="var(--line)"/><text class="lbl" x="564" y="306" fill="var(--muted)">Loading bay</text>`
  const queued = team.issues.filter(i => !i.isShipped && i.at === undefined)
  queued.slice(0, 4).forEach((i, k) => (s += crate(584 + (k % 4) * 40, 345, `#${i.issue}`, 'var(--idle)')))
  if (queued.length) s += `<text class="sm" x="564" y="385">${queued.length} waiting to start</text>`
  else s += `<text class="sm" x="564" y="345">empty</text>`

  // Dock and truck.
  const shipped = team.issues.filter(i => i.isShipped)
  s += `<rect x="24" y="${B2 - 36}" width="104" height="72" rx="12" fill="var(--surface)" stroke="var(--line)"/>`
  s += `<g><rect x="38" y="${B2 - 20}" width="46" height="30" rx="5" fill="var(--fg)" fill-opacity=".85"/><rect x="84" y="${B2 - 10}" width="18" height="20" rx="4" fill="var(--fg)" fill-opacity=".7"/><circle cx="52" cy="${B2 + 14}" r="5" fill="var(--muted)"/><circle cx="92" cy="${B2 + 14}" r="5" fill="var(--muted)"/></g>`
  s += `<text class="sm" x="76" y="${B2 + 52}" text-anchor="middle">${shipped.length} shipped</text>`

  // Crates at their stations.
  const at = new Map<string, typeof team.issues>()
  for (const i of team.issues) if (!i.isShipped && i.at && at0[i.at]) at.set(i.at, [...(at.get(i.at) ?? []), i])
  for (const [k, list] of at) {
    const [x, y] = at0[k]!, cap = 3
    list.slice(0, cap).forEach((i, n) => (s += crate(x, y + (n === 0 ? 0 : 14 + n * 24), `#${i.issue}`, i.isRework ? 'var(--bad)' : i.isActive ? 'var(--lead)' : 'var(--idle)')))
    if (list.length > cap) s += `<text class="sm" x="${x + 22}" y="${y + 14 + cap * 24}">+${list.length - cap}</text>`
  }

  // People: at the station of the task they're on, else the control or break room.
  const byStation = new Map<string, Member[]>()
  const resting: Member[] = []
  for (const m of team.members) {
    if (m.name === 'lead') continue
    const st = stationOf(m.kind)
    if (m.status === 'working' && st && at0[st]) byStation.set(st, [...(byStation.get(st) ?? []), m])
    else resting.push(m)
  }
  // Crowded spots show initials only; the name is in each avatar's tooltip.
  for (const [k, ms] of byStation) {
    const [x, y] = at0[k]!
    ms.slice(0, 3).forEach((m, i) => {
      s += person(m, x + (i - (Math.min(3, ms.length) - 1) / 2) * 38, y - 84, { hat: true, isNameless: true })
    })
    if (ms.length > 3) s += `<text class="sm" x="${x + 58}" y="${y - 80}">+${ms.length - 3}</text>`
  }
  // Twelve seats: whoever needs attention sits first, so their ring is never the one left out.
  resting.sort((a, b) => Number(b.isFlagged || flashing.has(b.name)) - Number(a.isFlagged || flashing.has(a.name)))
  resting.slice(0, 12).forEach((m, k) => (s += person(m, 60 + (k % 6) * 46, 334 + Math.floor(k / 6) * 40, { hat: true, isNameless: true })))
  if (resting.length > 12) s += `<text class="sm" x="300" y="392">+${resting.length - 12}</text>`
  const lead = team.members.find(m => m.name === 'lead')
  if (lead) s += person(lead, 440, 352, { big: true })

  return frame(W, H, theme, s, `<pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="var(--grid)"/></pattern>`)
}

export const svgView = (team: Team, view: View, theme: Theme, sel = '', still = false, at: number | null = null, out?: Spot[], flash: readonly string[] = []): string => {
  selected = sel
  flashing = new Set(flash)
  isStill = still
  phase = at
  spots = out ?? null
  try {
    return view === 'map' ? svgMap(team, theme) : view === 'office' ? svgOffice(team, theme) : svgFactory(team, theme)
  } finally {
    selected = ''
    isStill = false
    phase = null
    spots = null
    flashing = new Set()
  }
}

export const altText = (team: Team, view: View): string =>
  `Team ${view}: ${summary(team)}. ` +
  team.members.filter(m => m.status === 'working').map(m => `${m.name} on ${taskShort(m)}`).join('; ')
