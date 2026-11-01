import type { Area, Issue, Member, Msg, Team, View } from '../types'
import { dur, hhmm, initials, labelOf, line, shortName, stageTimes } from './model'
import { AREA_NAME, KIND_LABEL, esc, summary, svgStyle, svgView, titled } from './views'
import type { Spot, Theme } from './views'

// The whole pane as one picture, laid out like the Team Wire mockup: a header, the stage rail, the live scene,
// then the selected teammate's badge and the team chat (beside the scene when wide, below it when tall).

export type Filter = 'all' | 'handoff' | 'problem'
export type DashOptions = {
  width: number
  height: number
  selected: string
  filter: Filter
  isStill?: boolean
  phase?: number
  /** A step of the rail picked: the chat card lists that step's issues instead. */
  stage?: string
  /** An issue picked: the chat card follows it through its steps instead (wins over `stage`). */
  issue?: number
  /** The strip along the bottom for replaying the day; absent, no strip. */
  timeline?: Timeline
  /** Teammates with a fresh alert, ringed in red that blinks. */
  flash?: readonly string[]
  /** Where "Open in …" on an issue's card goes: GitLab, GitHub, or the browser for any other address. */
  issueSite?: string
  /** Drawn from a copy of the log (/team demo): badged, so it is never taken for the team. */
  isDemo?: boolean
  /** Filled with where each clickable thing was drawn, for matching clicks on the picture. */
  hits?: Hit[]
}
/** The log's span, how busy each slice of it was, and the moment replayed ('' for live). */
export type Timeline = { from: string; to: string; at: string; buckets: number[] }

/**
 * A clickable box in picture pixels: `who:<name>`, `jump:<name>`, `view:<view>`, `filter:<filter>`, `stage:<kind>`,
 * `issue:<n>`, `open:<n>` (the issue in GitLab), `time:<0..1>` (replay that far through the log), `live:`.
 */
export type Hit = { x: number; y: number; w: number; h: number; action: string }

const VIEW_TABS: [View, string][] = [['map', 'Map'], ['office', 'Office'], ['factory', 'Factory']]
const FILTER_TABS: [Filter, string][] = [['all', 'All'], ['handoff', 'Hand-offs'], ['problem', 'Problems']]

const PAD = 16
const RAIL_LABEL: Record<string, string> = {
  'api-spec': 'API spec', 'ui-spec': 'UI spec', 'security-spec': 'Threat', acceptance: 'Accept', 'attack-plan': 'Atk plan',
  build: 'Build', ui: 'UI', integrate: 'Integrate', review: 'Review', 'security-review': 'Sec rev', 'design-review': 'Design',
  merge: 'Merge', attack: 'Attack', fix: 'Fix',
}
// A project's own label, else the default line's short one, else the kind: "code-review" reads "Code review".
const railLabel = (k: string): string => labelOf(k) ?? RAIL_LABEL[k] ?? titled(k)
const KIND_VAR = { handoff: 'backend', problem: 'bad', approve: 'ok', merge: 'lead', note: 'muted' } as const
const STATUS_VAR = { working: 'ok', waiting: 'warn', free: 'idle' } as const
const v = (a: Area) => `var(--${a})`

// Approximate glyph widths for the system fonts Chrome draws with; used to cut text before it overflows.
const fit = (s: string, px: number, size: number, isMono = false): string => {
  const max = Math.floor(px / (size * (isMono ? 0.6 : 0.55)))
  const flat = s.replace(/\s+/g, ' ').trim()
  return flat.length > max ? flat.slice(0, Math.max(1, max - 1)) + '…' : flat
}

// A row of pill buttons ending at `right`, the active one filled; each records its hit.
const pills = (items: [string, string][], active: string, right: number, y: number, prefix: string, hits: Hit[], size = 11) => {
  const widths = items.map(([, label]) => label.length * size * 0.62 + 20)
  let x = right - widths.reduce((a, b) => a + b, 0) - 6 * (items.length - 1)
  let s = ''
  items.forEach(([key, label], i) => {
    const w = widths[i]!
    const h = size + 11
    const on = key === active
    s += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="${h / 2}" fill="${on ? 'var(--fg)' : 'var(--surface)'}" stroke="var(--line)"/>`
    s += `<text x="${(x + w / 2).toFixed(1)}" y="${y + h / 2 + size * 0.36}" text-anchor="middle" class="tab" style="font-size:${size}px;fill:${on ? 'var(--bg)' : 'var(--fg)'}">${esc(label)}</text>`
    hits.push({ x, y, w, h, action: `${prefix}:${key}` })
    x += w + 6
  })
  return s
}

const card = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="var(--surface)" stroke="var(--line)"/>`

const header = (team: Team, view: View, w: number, flash: readonly string[], replay: string, hits: Hit[], isDemo = false) => {
  let s = `<text x="${PAD}" y="${PAD + 18}" class="h1">Team Wire</text>`
  s += pills(VIEW_TABS, view, w - PAD, PAD, 'view', hits, 12)
  // Needs attention: a red button per flagged teammate, right of the summary; a fresh one blinks.
  const flagged = team.members.filter(m => m.isFlagged)
  let x = w - PAD
  const room = Math.max(0, w - 2 * PAD - 360)
  const shown: string[] = []
  for (const m of [...flagged].reverse()) {
    const label = `▲ ${shortName(m.name)}`
    const bw = label.length * 6.6 + 18
    if (w - PAD - (x - bw) > room) break
    x -= bw
    shown.unshift(`<g${flash.includes(m.name) ? ' class="blink"' : ''}><rect x="${x.toFixed(1)}" y="${PAD + 27}" width="${bw.toFixed(1)}" height="18" rx="9" fill="var(--bad)" fill-opacity=".18" stroke="var(--bad)"/><text x="${(x + bw / 2).toFixed(1)}" y="${PAD + 40}" text-anchor="middle" class="tab" style="font-size:10.5px;fill:var(--bad)">${esc(label)}</text></g>`)
    hits.push({ x, y: PAD + 27, w: bw, h: 18, action: `who:${m.name}` })
    x -= 6
  }
  const summaryW = (shown.length ? x : w - PAD) - PAD - 8
  // Replaying or a demo: say so loudly, so neither is read as the team's present.
  let bx = PAD + 128
  for (const [label, fill] of [
    [replay ? `REPLAY ${replay.slice(5, 10)} ${hhmm(replay)} UTC` : '', 'var(--warn)'],
    [isDemo ? 'DEMO · not the real log' : '', 'var(--backend)'],
  ] as const) {
    if (!label) continue
    const bw = label.length * 7 + 20
    s += `<rect x="${bx}" y="${PAD + 2}" width="${bw}" height="22" rx="11" fill="${fill}"/>`
    s += `<text x="${bx + 10}" y="${PAD + 17}" class="tab" style="font-size:11.5px;fill:var(--bg);font-weight:700">${esc(label)}</text>`
    bx += bw + 8
  }
  s += `<text x="${PAD}" y="${PAD + 38}" class="sub">${esc(fit(`${summary(team)} · ${replay ? 'as at' : 'updated'} ${hhmm(replay || team.lastTs)} UTC`, summaryW, 12))}</text>`
  return s + shown.join('')
}

// A wait this long is worth a look, and this long is where the line is stuck.
const SLOW_MS = 30 * 60 * 1000
const STUCK_MS = 2 * 60 * 60 * 1000
const waitVar = (msv: number) => (msv >= STUCK_MS ? 'bad' : msv >= SLOW_MS ? 'warn' : 'muted')
export const RAIL_H = 54

// One step per task kind: the bar fills with the share of issues past it; amber while any issue is in it. Beneath,
// what queues there: how many are ready and unstarted and the longest wait, or else the usual wait. The step where
// work has waited longest, past half an hour, is shaded: the bottleneck.
const rail = (team: Team, y: number, w: number, stage: string, hits: Hit[]) => {
  const LINE = line()
  const step = (w - 2 * PAD) / LINE.length
  const times = stageTimes(team)
  const worst = LINE.reduce<string>((a, k) => (times[k]!.oldestMs > (a ? times[a]!.oldestMs : SLOW_MS - 1) ? k : a), '')
  let s = ''
  LINE.forEach((k, i) => {
    const t = times[k]!
    const having = team.issues.filter(x => x.stages[k] !== undefined)
    const done = having.filter(x => x.stages[k] === 'done').length
    const running = having.filter(x => x.stages[k] === 'run').length
    const x = PAD + i * step
    const bw = step - 6
    hits.push({ x: x - 3, y: y - 6, w: step, h: RAIL_H, action: `stage:${k}` })
    if (k === worst) s += `<rect x="${(x - 4).toFixed(1)}" y="${y - 6}" width="${(bw + 8).toFixed(1)}" height="${RAIL_H}" rx="6" fill="var(--${waitVar(t.oldestMs)})" fill-opacity=".12"/>`
    if (k === stage) s += `<rect x="${(x - 4).toFixed(1)}" y="${y - 6}" width="${(bw + 8).toFixed(1)}" height="${RAIL_H}" rx="6" fill="var(--fg)" fill-opacity=".08" stroke="var(--fg)" stroke-opacity=".5"/>`
    s += `<rect x="${x.toFixed(1)}" y="${y}" width="${bw.toFixed(1)}" height="5" rx="2.5" fill="var(--line)"/>`
    if (having.length) s += `<rect x="${x.toFixed(1)}" y="${y}" width="${((bw * done) / having.length).toFixed(1)}" height="5" rx="2.5" fill="var(--ok)"/>`
    if (running) s += `<rect x="${x.toFixed(1)}" y="${y}" width="${bw.toFixed(1)}" height="5" rx="2.5" fill="var(--warn)" fill-opacity=".55" class="pulse"/>`
    s += `<text x="${x.toFixed(1)}" y="${y + 18}" class="rl">${esc(fit(railLabel(k), bw, 10, true))}</text>`
    s += `<text x="${x.toFixed(1)}" y="${y + 31}" class="rn">${running ? `<tspan style="fill:var(--warn)">▶${running}</tspan> ` : ''}${done}/${having.length}</text>`
    const queue = t.waiting
      ? `<tspan style="fill:var(--${waitVar(t.oldestMs)})">${t.waiting} ready ${dur(t.oldestMs)}</tspan>`
      : t.started ? `wait ~${dur(t.avgWaitMs)}` : ''
    if (queue) s += `<text x="${x.toFixed(1)}" y="${y + 43}" class="rn">${queue}</text>`
  })
  return s
}

const avatar = (m: Member | undefined, name: string, x: number, y: number, r: number) => {
  const area = m?.area ?? 'lead'
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${v(area)}"/><text x="${x}" y="${(y + r * 0.36).toFixed(1)}" class="ini" style="font-size:${Math.round(r * 0.9)}px" text-anchor="middle">${esc(initials(name))}</text>`
}

const badge = (team: Team, sel: string, x: number, y: number, w: number, h: number, hits: Hit[]) => {
  const m = team.members.find(n => n.name === sel) ?? team.members[0]
  if (!m) return ''
  const last = [...team.messages].reverse().find(x2 => x2.from === m.name || x2.to === m.name)
  const status = m.isFlagged ? 'needs attention' : m.status
  const sv = m.isFlagged ? 'bad' : STATUS_VAR[m.status]
  const inner = w - 2 * PAD
  let s = card(x, y, w, h)
  s += `<rect x="${x}" y="${y}" width="${w}" height="8" rx="4" fill="${v(m.area)}"/>`
  s += avatar(m, m.name, x + PAD + 22, y + 44, 22)
  s += `<text x="${x + PAD + 54}" y="${y + 40}" class="nm2">${esc(fit(m.name, inner - 60, 16))}</text>`
  s += `<text x="${x + PAD + 54}" y="${y + 58}" class="sm">${esc(AREA_NAME[m.area])}</text>`
  const pillW = status.length * 7 + 26
  s += `<g transform="translate(${x + w - PAD - pillW} ${y + 28})"><rect width="${pillW}" height="22" rx="11" fill="var(--bg)" stroke="var(--line)"/><circle cx="12" cy="11" r="4" fill="var(--${sv})"/><text x="21" y="15" class="pill">${esc(status)}</text></g>`
  const rows: [string, string][] = [
    ['Task', m.task ? m.task.replace(/^#\d+\s+/, `#${m.issue} `) : m.name === 'lead' ? 'running the team' : 'none'],
    ['Branch', m.name === 'lead' ? 'main' : m.issue !== undefined ? `team/${m.name}/${m.issue}` : '–'],
    ['Last said', last ? `${hhmm(last.ts)} ${last.text}` : 'nothing yet'],
  ]
  rows.forEach(([k, val], i) => {
    const ry = y + 88 + i * 20
    if (ry > y + h - 8) return
    s += `<text x="${x + PAD}" y="${ry}" class="k">${k}</text><text x="${x + PAD + 72}" y="${ry}" class="val">${esc(fit(val, inner - 72, 12))}</text>`
  })
  // Takes you to the teammate's own terminal in the team window.
  const bw = 112
  const bx = x + w - PAD - bw
  const by = y + 62
  s += `<rect x="${bx}" y="${by}" width="${bw}" height="22" rx="11" fill="var(--surface)" stroke="var(--${m.area === 'lead' ? 'lead' : m.area})"/>`
  s += `<text x="${bx + bw / 2}" y="${by + 15}" text-anchor="middle" class="tab" style="font-size:11px;fill:var(--fg)">Open pane ↗</text>`
  hits.push({ x, y, w, h, action: `who:${m.name}` })
  hits.push({ x: bx, y: by, w: bw, h: 22, action: `jump:${m.name}` })
  // The Task row opens the issue it names.
  if (m.issue !== undefined && m.name !== 'lead') hits.push({ x: x + PAD, y: y + 76, w: inner - 120, h: 18, action: `issue:${m.issue}` })
  return s
}

const chat = (team: Team, sel: string, filter: Filter, x: number, y: number, w: number, h: number, hits: Hit[]) => {
  const shown = team.messages
    .filter(m => filter === 'all' || (filter === 'handoff' ? m.kind === 'handoff' || m.kind === 'approve' : m.kind === 'problem'))
    .filter(m => sel === 'lead' || m.from === sel || m.to === sel)
    .reverse()
  let s = card(x, y, w, h)
  s += `<text x="${x + PAD}" y="${y + 26}" class="nm2" style="font-size:14px">Team chat${sel === 'lead' ? '' : ` <tspan class="sm" style="font-size:11px">· ${esc(shortName(sel))}</tspan>`}</text>`
  s += pills(FILTER_TABS, filter, x + w - PAD, y + 11, 'filter', hits, 10)
  s += `<line x1="${x}" x2="${x + w}" y1="${y + 40}" y2="${y + 40}" stroke="var(--line)"/>`
  const rowH = 40
  const room = Math.max(0, Math.floor((h - 52) / rowH))
  if (!shown.length) s += `<text x="${x + PAD}" y="${y + 66}" class="sm">Nothing here yet.</text>`
  shown.slice(0, room).forEach((m: Msg, i) => {
    const ry = y + 52 + i * rowH
    const from = team.members.find(n => n.name === m.from)
    s += avatar(from, m.from, x + PAD + 12, ry + 13, 12)
    const tx = x + PAD + 32
    const meta = `${shortName(m.from)} → ${m.to === 'lead' ? 'lead' : shortName(m.to)} · ${hhmm(m.ts)}`
    s += `<text x="${tx}" y="${ry + 10}" class="meta">${esc(meta)}</text>`
    const tagW = KIND_LABEL[m.kind].length * 6 + 14
    const tagX = tx + meta.length * 6.2 + 8
    if (tagX + tagW < x + w - PAD) s += `<g transform="translate(${tagX.toFixed(1)} ${ry})"><rect width="${tagW}" height="14" rx="7" fill="none" stroke="var(--${KIND_VAR[m.kind]})"/><text x="${tagW / 2}" y="10.5" class="tag" text-anchor="middle" style="fill:var(--${KIND_VAR[m.kind]})">${KIND_LABEL[m.kind]}</text></g>`
    s += `<text x="${tx}" y="${ry + 28}" class="msg"${m.kind === 'problem' ? ' style="fill:var(--bad)"' : ''}>${esc(fit(m.text, x + w - PAD - tx, 12.5))}</text>`
    hits.push({ x, y: ry - 4, w, h: rowH, action: `who:${m.from}` })
  })
  return s
}

const STAGE_VAR = { done: 'ok', run: 'warn', wait: 'idle' } as const

// The chat card's place, while a rail step is picked: that step's issues, running first, with who has each.
const stageCard = (team: Team, stage: string, x: number, y: number, w: number, h: number, hits: Hit[]) => {
  const order = { run: 0, wait: 1, done: 2 } as const
  const rows = team.issues
    .filter(i => i.stages[stage] !== undefined)
    .sort((a, b) => order[a.stages[stage]!] - order[b.stages[stage]!] || a.issue - b.issue)
  let s = card(x, y, w, h)
  s += `<text x="${x + PAD}" y="${y + 26}" class="nm2" style="font-size:14px">${esc(railLabel(stage))}</text>`
  const t = stageTimes(team)[stage]
  const stats = !t ? '' : [
    t.started ? `waits ~${dur(t.avgWaitMs)}` : '',
    t.finished ? `takes ~${dur(t.avgWorkMs)}` : '',
    t.finished ? `${t.finished} done` : '',
  ].filter(Boolean).join(' · ')
  s += `<text x="${x + w - PAD}" y="${y + 26}" class="sm" text-anchor="end">${esc(stats || 'click the step again to close')}</text>`
  s += `<line x1="${x}" x2="${x + w}" y1="${y + 40}" y2="${y + 40}" stroke="var(--line)"/>`
  hits.push({ x, y, w, h: 40, action: `stage:${stage}` })
  const rowH = 30
  // Room for the rows, and for the "and n more" line under them when they don't all fit.
  const fits = Math.floor((h - 52) / rowH)
  const room = Math.max(0, rows.length > fits ? Math.floor((h - 52 - 14) / rowH) : fits)
  if (!rows.length) s += `<text x="${x + PAD}" y="${y + 66}" class="sm">No issue has this step.</text>`
  rows.slice(0, room).forEach((i, n) => {
    const ry = y + 52 + n * rowH
    const st = i.stages[stage]!
    const who = team.members.find(m => m.issue === i.issue && m.kind === stage)
    s += `<circle cx="${x + PAD + 5}" cy="${ry + 10}" r="5" fill="var(--${STAGE_VAR[st]})"/>`
    s += `<text x="${x + PAD + 18}" y="${ry + 14}" class="val" style="font-weight:600">#${i.issue}</text>`
    // The dot gives the state; the words go to the title, the one thing a narrow card must show.
    const step = i.steps.find(x2 => x2.kind === stage && x2.state === st)
    const now = Date.parse(team.lastTs)
    const tail = i.isRework && st !== 'done' ? ' · rework' : ''
    // How long it has run, or waited since it was ready: its own column, so a long title never hides it.
    const age = st === 'run' && step?.startTs ? `▶ ${dur(now - Date.parse(step.startTs))}`
      : st === 'wait' && step?.readyTs ? `ready ${dur(now - Date.parse(step.readyTs))}` : ''
    const ageW = age ? age.length * 6.3 + 10 : 0
    const right = x + w - PAD - (who ? 110 : 0)
    if (age) {
      const waited = st === 'wait' ? now - Date.parse(step!.readyTs!) : 0
      s += `<text x="${right}" y="${ry + 14}" class="meta" text-anchor="end" style="fill:var(--${st === 'run' ? 'warn' : waitVar(waited)})">${esc(age)}</text>`
    }
    s += `<text x="${x + PAD + 62}" y="${ry + 14}" class="val">${esc(fit(i.title + tail, right - ageW - x - PAD - 62, 12))}</text>`
    hits.push({ x, y: ry - 4, w, h: rowH, action: `issue:${i.issue}` })
    if (who) {
      s += avatar(who, who.name, x + w - PAD - 10, ry + 10, 10)
      s += `<text x="${x + w - PAD - 26}" y="${ry + 14}" class="meta" text-anchor="end">${esc(shortName(who.name))}</text>`
      hits.push({ x: x + w - PAD - 110, y: ry - 4, w: 110, h: rowH, action: `who:${who.name}` })
    }
  })
  if (rows.length > room) s += `<text x="${x + PAD}" y="${y + h - 10}" class="sm">and ${rows.length - room} more</text>`
  return s
}

const when = (ts?: string) => (ts ? hhmm(ts) : '')

// The chat card's place, while an issue is picked: every step with who had it and when, then what was said about it.
const issueCard = (team: Team, issue: Issue, x: number, y: number, w: number, h: number, hits: Hit[], site = 'GitLab') => {
  let s = card(x, y, w, h)
  const gw = 120
  s += `<text x="${x + PAD}" y="${y + 26}" class="nm2" style="font-size:14px">#${issue.issue} <tspan class="sm" style="font-size:12px">${esc(fit(issue.title, w - 2 * PAD - gw - 50, 12))}</tspan></text>`
  s += `<rect x="${x + w - PAD - gw}" y="${y + 11}" width="${gw}" height="21" rx="10.5" fill="var(--surface)" stroke="var(--line)"/>`
  s += `<text x="${x + w - PAD - gw / 2}" y="${y + 25.5}" text-anchor="middle" class="tab" style="font-size:10.5px;fill:var(--fg)">${esc(`Open in ${site} ↗`)}</text>`
  s += `<line x1="${x}" x2="${x + w}" y1="${y + 40}" y2="${y + 40}" stroke="var(--line)"/>`
  hits.push({ x, y, w, h: 40, action: `issue:${issue.issue}` })
  hits.push({ x: x + w - PAD - gw, y: y + 11, w: gw, h: 21, action: `open:${issue.issue}` })
  const rowH = 24
  const said = team.messages.filter(m => new RegExp(`#${issue.issue}\\b`).test(m.text)).reverse()
  const stepRoom = Math.max(1, Math.floor((h - 72 - (said.length ? 80 : 0)) / rowH))
  const now = Date.parse(team.lastTs)
  const ms = (ts?: string) => (ts ? Date.parse(ts) : NaN)
  // Where it waited longest: a finished wait, or one still going.
  const waits = issue.steps
    .filter(st => st.readyTs && (st.startTs || st.state === 'wait'))
    .map(st => ({ kind: st.kind, ms: (st.startTs ? ms(st.startTs) : now) - ms(st.readyTs) }))
    .sort((a, b) => b.ms - a.ms)
  const open = issue.openTs ? `${issue.shipTs ? 'Shipped in' : 'Open'} ${dur((issue.shipTs ? ms(issue.shipTs) : now) - ms(issue.openTs))}` : ''
  const top = waits[0] && waits[0].ms >= 60000 ? waits[0] : undefined
  const longest = top ? `${open ? '· ' : ''}longest wait: ${railLabel(top.kind)} ${dur(top.ms)}` : ''
  if (open || longest) s += `<text x="${x + PAD}" y="${y + 58}" class="meta">${esc(open)}${top ? `<tspan dx="${open ? 6 : 0}" style="fill:var(--${waitVar(top.ms)})">${esc(longest)}</tspan>` : ''}</text>`
  let ry = y + 72
  issue.steps.slice(0, stepRoom).forEach(st => {
    s += `<circle cx="${x + PAD + 5}" cy="${ry + 8}" r="5" fill="var(--${STAGE_VAR[st.state]})"${st.state === 'run' ? ' class="pulse"' : ''}/>`
    s += `<text x="${x + PAD + 18}" y="${ry + 12}" class="val">${esc(railLabel(st.kind))}</text>`
    const took = st.startTs && st.doneTs ? ` · ${dur(ms(st.doneTs) - ms(st.startTs))}` : ''
    const time = st.state === 'done' ? `${when(st.startTs) || '…'} → ${when(st.doneTs)}${took}`
      : st.state === 'run' ? (st.startTs ? `since ${when(st.startTs)} · ${dur(now - ms(st.startTs))}` : 'running')
      : st.readyTs ? `ready ${dur(now - ms(st.readyTs))}` : 'blocked'
    s += `<text x="${x + PAD + 110}" y="${ry + 12}" class="meta">${esc(time)}</text>`
    if (st.owner) {
      const m = team.members.find(n => n.name === st.owner)
      s += avatar(m, st.owner, x + w - PAD - 9, ry + 8, 9)
      s += `<text x="${x + w - PAD - 24}" y="${ry + 12}" class="meta" text-anchor="end">${esc(shortName(st.owner))}</text>`
      hits.push({ x, y: ry - 4, w, h: rowH, action: `who:${st.owner}` })
    }
    ry += rowH
  })
  if (issue.steps.length > stepRoom) {
    s += `<text x="${x + PAD + 18}" y="${ry + 8}" class="sm">and ${issue.steps.length - stepRoom} more steps</text>`
    ry += 16
  }
  const sayRoom = Math.floor((y + h - ry - 30) / 18)
  if (said.length && sayRoom > 0) {
    s += `<text x="${x + PAD}" y="${ry + 18}" class="k">Said about it</text>`
    ry += 26
    said.slice(0, sayRoom).forEach(m => {
      s += `<text x="${x + PAD}" y="${ry + 10}" class="meta">${esc(fit(`${hhmm(m.ts)} ${shortName(m.from)}→${shortName(m.to)}`, 142, 10.5, true))}</text>`
      s += `<text x="${x + PAD + 150}" y="${ry + 10}" class="msg" style="font-size:11.5px${m.kind === 'problem' ? ';fill:var(--bad)' : ''}">${esc(fit(m.text, w - 2 * PAD - 150, 11.5))}</text>`
      hits.push({ x, y: ry - 4, w, h: 18, action: `who:${m.from}` })
      ry += 18
    })
  }
  return s
}

// The day as a strip: how busy each slice of the log was, where the replay stands, and the way back to live.
const TIMELINE_H = 30
const timelineStrip = (tl: Timeline, y: number, w: number, hits: Hit[]) => {
  const liveW = 96
  const x0 = PAD + 44
  const bw = w - x0 - PAD - liveW - 12
  const from = Date.parse(tl.from)
  const span = Math.max(1, Date.parse(tl.to) - from)
  const peak = Math.max(1, ...tl.buckets)
  let s = `<text x="${PAD}" y="${y + 19}" class="meta">${esc(hhmm(tl.from))}</text>`
  s += `<rect x="${x0}" y="${y + 4}" width="${bw}" height="22" rx="4" fill="var(--surface)" stroke="var(--line)"/>`
  const n = tl.buckets.length
  tl.buckets.forEach((c, i) => {
    if (!c) return
    const bh = Math.max(2, (c / peak) * 16)
    s += `<rect x="${(x0 + (i / n) * bw).toFixed(1)}" y="${(y + 23 - bh).toFixed(1)}" width="${Math.max(1, bw / n - 1).toFixed(1)}" height="${bh.toFixed(1)}" fill="var(--muted)" fill-opacity=".55"/>`
  })
  // Hours, so a time can be found by eye.
  for (let t = Math.ceil(from / 3_600_000) * 3_600_000; t < from + span; t += 3_600_000 * Math.max(1, Math.round(span / 3_600_000 / 12))) {
    const hx = x0 + ((t - from) / span) * bw
    s += `<line x1="${hx.toFixed(1)}" x2="${hx.toFixed(1)}" y1="${y + 4}" y2="${y + 8}" stroke="var(--muted)"/>`
  }
  const at = tl.at ? Math.min(1, Math.max(0, (Date.parse(tl.at) - from) / span)) : 1
  const mx = x0 + at * bw
  s += `<rect x="${x0}" y="${y + 4}" width="${(mx - x0).toFixed(1)}" height="22" rx="4" fill="var(--${tl.at ? 'warn' : 'ok'})" fill-opacity=".12"/>`
  s += `<line x1="${mx.toFixed(1)}" x2="${mx.toFixed(1)}" y1="${y + 1}" y2="${y + 29}" stroke="var(--${tl.at ? 'warn' : 'ok'})" stroke-width="2.5"/>`
  hits.push({ x: x0, y, w: bw, h: TIMELINE_H, action: 'time:' })
  const lx = w - PAD - liveW
  s += `<rect x="${lx}" y="${y + 4}" width="${liveW}" height="22" rx="11" fill="${tl.at ? 'var(--surface)' : 'var(--ok)'}" stroke="var(--${tl.at ? 'line' : 'ok'})"/>`
  s += `<text x="${lx + liveW / 2}" y="${y + 19}" text-anchor="middle" class="tab" style="font-size:11px;fill:${tl.at ? 'var(--fg)' : 'var(--bg)'}">${tl.at ? 'Back to live' : '● Live'}</text>`
  hits.push({ x: lx, y: y + 4, w: liveW, h: 22, action: 'live:' })
  return s
}

// The scene is the view's own SVG, nested and scaled into its box.
const scene = (team: Team, view: View, theme: Theme, sel: string, x: number, y: number, w: number, h: number, still: boolean, at: number | null, hits: Hit[], flash: readonly string[]) => {
  const spots: Spot[] = []
  const svg = svgView(team, view, theme, sel, still, at, spots, flash)
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)
  if (vb) {
    // The nested view is scaled to fit and centred ("meet"): the same sum places each teammate on the picture.
    const vw = Number(vb[1])
    const vh = Number(vb[2])
    const k = Math.min(w / vw, h / vh)
    const ox = x + (w - vw * k) / 2
    const oy = y + (h - vh * k) / 2
    for (const p of spots) hits.push({ x: ox + (p.x - p.r) * k, y: oy + (p.y - p.r) * k, w: 2 * p.r * k, h: 2 * p.r * k, action: p.action })
  }
  return svg.replace(
    /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="([^"]+)" width="\d+" height="\d+">/,
    `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="$1" preserveAspectRatio="xMidYMid meet">`,
  )
}

export const sceneAspect = (view: View): number => (view === 'map' ? 440 / 640 : view === 'office' ? 560 / 900 : 600 / 900)

export const dashboardSvg = (team: Team, view: View, theme: Theme, o: DashOptions): string => {
  const W = Math.max(480, Math.round(o.width))
  const fullH = Math.max(420, Math.round(o.height))
  // The timeline takes the bottom strip; the rest lays out in what is left.
  const H = fullH - (o.timeline ? TIMELINE_H + 6 : 0)
  const sel = team.members.some(m => m.name === o.selected) ? o.selected : 'lead'
  const stage = o.stage && line().includes(o.stage) ? o.stage : ''
  // Later boxes win a click, so the people in the scene are pushed after the boxes they stand in.
  const hits: Hit[] = []
  const top = PAD + 56
  const railH = RAIL_H
  const bodyY = top + railH
  const picked = o.issue === undefined ? undefined : team.issues.find(i => i.issue === o.issue)
  const side = (x: number, y: number, w: number, h: number) =>
    picked ? issueCard(team, picked, x, y, w, h, hits, o.issueSite)
      : stage ? stageCard(team, stage, x, y, w, h, hits) : chat(team, sel, o.filter, x, y, w, h, hits)
  const flash = o.flash ?? []
  let body = header(team, view, W, flash, o.timeline?.at ?? '', hits, o.isDemo) + rail(team, top, W, stage, hits)
  const isWide = W >= 1100 && W / H > 1.2
  if (isWide) {
    const sideW = 360
    const sw = W - 3 * PAD - sideW
    const sh = Math.min(H - bodyY - PAD, sw * sceneAspect(view))
    body += `<rect x="${PAD}" y="${bodyY}" width="${sw}" height="${H - bodyY - PAD}" rx="16" fill="var(--bg)" stroke="var(--line)"/>`
    body += scene(team, view, theme, sel, PAD, bodyY, sw, sh, o.isStill === true, o.phase ?? null, hits, flash)
    body += badge(team, sel, W - PAD - sideW, bodyY, sideW, 150, hits)
    body += side(W - PAD - sideW, bodyY + 150 + 12, sideW, H - bodyY - 150 - 12 - PAD)
  } else {
    const sw = W - 2 * PAD
    const sh = Math.min(sw * sceneAspect(view), (H - bodyY) * 0.55)
    body += `<rect x="${PAD}" y="${bodyY}" width="${sw}" height="${sh.toFixed(1)}" rx="16" fill="var(--bg)" stroke="var(--line)"/>`
    body += scene(team, view, theme, sel, PAD, bodyY, sw, sh, o.isStill === true, o.phase ?? null, hits, flash)
    const by = bodyY + sh + 12
    body += badge(team, sel, PAD, by, sw, 150, hits)
    const cy = by + 150 + 12
    if (H - cy - PAD > 80) body += side(PAD, cy, sw, H - cy - PAD)
  }
  const extra = `<style>
.h1{font:800 20px ui-sans-serif,system-ui,sans-serif;fill:var(--fg);letter-spacing:-.02em}
.sub{font:400 12px ui-sans-serif,system-ui,sans-serif;fill:var(--muted)}
.rl{font:500 10px ui-monospace,Menlo,monospace;fill:var(--fg)}
.rn{font:400 9.5px ui-monospace,Menlo,monospace;fill:var(--muted)}
.nm2{font:600 16px ui-sans-serif,system-ui,sans-serif;fill:var(--fg)}
.pill{font:500 11px ui-monospace,Menlo,monospace;fill:var(--fg)}
.k{font:400 12px ui-sans-serif,system-ui,sans-serif;fill:var(--muted)}
.val{font:400 12px ui-sans-serif,system-ui,sans-serif;fill:var(--fg)}
.meta{font:500 10.5px ui-monospace,Menlo,monospace;fill:var(--muted)}
.tag{font:500 9px ui-monospace,Menlo,monospace}
.msg{font:400 12.5px ui-sans-serif,system-ui,sans-serif;fill:var(--fg)}
.tab{font-family:ui-sans-serif,system-ui,sans-serif;font-weight:500}
</style>`
  if (o.timeline) body += timelineStrip(o.timeline, H, W, hits)
  // Scene people last: a click on someone standing inside a box picks them, not the box.
  const people = hits.filter(h => h.action.startsWith('who:') && h.w < 80)
  o.hits?.push(...hits.filter(h => !people.includes(h)), ...people)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${fullH}" width="${W}" height="${fullH}">${svgStyle(theme)}${extra}<rect width="${W}" height="${fullH}" fill="var(--bg)"/>${body}</svg>`
  return o.phase === undefined ? svg : freeze(svg, o.phase)
}

// A frame stops the CSS animations at one moment of their loop: rings turned, lights part-way through a pulse, the
// belt moved on.
const freeze = (svg: string, t: number): string =>
  svg
    .replace(/ class="spin"/g, ` transform="rotate(${Math.round(t * 360)})"`)
    .replace(/ class="pulse"/g, ` opacity="${(0.45 + 0.55 * Math.abs(Math.cos(t * Math.PI))).toFixed(2)}"`)
    .replace(/ class="belt"/g, ` stroke-dashoffset="${(-16 * t * 3).toFixed(1)}"`)
    .replace(/ class="blink"/g, ` opacity="${Math.round(t * 6) % 2 ? 0.15 : 1}"`)

// Every frame of the loop stacked top to bottom in one picture, so one Chrome run draws them all.
export const spriteSvg = (team: Team, view: View, theme: Theme, o: DashOptions, frames: number): string => {
  const W = Math.max(480, Math.round(o.width))
  const H = Math.max(420, Math.round(o.height))
  let body = ''
  for (let k = 0; k < frames; k++) {
    body += dashboardSvg(team, view, theme, { ...o, isStill: true, phase: k / frames, hits: k === 0 ? o.hits : undefined }).replace(
      /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="([^"]+)" width="\d+" height="\d+">/,
      `<svg x="0" y="${k * H}" width="${W}" height="${H}" viewBox="$1">`,
    )
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H * frames}" width="${W}" height="${H * frames}">${body}</svg>`
}

// rsvg-convert draws in a tenth of Chrome's time but knows no CSS variables: put each colour in place of its name.
export const flatSvg = (svg: string): string => {
  const block = /svg\{([^}]*)\}/.exec(svg)?.[1] ?? ''
  const vars = new Map([...block.matchAll(/--([\w-]+):([^;]+)/g)].map(m => [m[1]!, m[2]!.trim()]))
  return svg.replace(/var\(--([\w-]+)\)/g, (all, name: string) => vars.get(name) ?? all)
}
