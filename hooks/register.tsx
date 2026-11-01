import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Picture, Team, View } from '../types'
import { dashboardSvg, flatSvg, spriteSvg } from './dashboard'
import type { Filter, Hit, Timeline } from './dashboard'
import { DEFAULT_LINE, configure, dur, initials, issueUrlTemplate, labelOf, line, parse, reworkOf, shortName, stageTimes } from './model'
import { deliveredMessages, inboxMessages, messageEvent, taskEvents } from './recorder'
import type { InboxMessage, Recorded, TaskFile } from './recorder'
import { AREA_COLOR, altText, messageLines, summary, textView } from './views'
import type { Line, Theme } from './views'

const PANE = 'team-wire'
const VIEWS: readonly View[] = ['map', 'office', 'factory']
const LABEL: Record<View, string> = { map: 'Map', office: 'Office', factory: 'Factory' }
const FILTERS: readonly Filter[] = ['all', 'handoff', 'problem']
const FILTER_LABEL: Record<Filter, string> = { all: 'All', handoff: 'Hand-offs', problem: 'Problems' }
const POLL_MS = 3000
// fs.read refuses files over 4 MiB; past this the log is read by its tail.
const READ_LIMIT = 3.5 * 1024 * 1024
const TAIL_LINES = '20000'
// The band shows only while the team has logged something this recently.
const BAND_FRESH_MS = 2 * 60 * 60 * 1000
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const MAGICKS = ['/opt/homebrew/bin/magick', '/usr/local/bin/magick', '/usr/bin/magick']
// Draws a frame in about 0.3 s where Chrome takes 4 to 5, so a click answers at once; Chrome stays as the fallback.
const RSVGS = ['/opt/homebrew/bin/rsvg-convert', '/usr/local/bin/rsvg-convert', '/usr/bin/rsvg-convert']
// A fresh alert's ring blinks this long round whoever must act on it.
const FLASH_MS = 2 * 60 * 1000
// Replay steps: [ and ] move ten minutes, { and } an hour. The strip shows the log's span in this many slices.
const STEP_MS = 10 * 60 * 1000
const BIG_STEP_MS = 60 * 60 * 1000
const BUCKETS = 120
// How often clicks and keys from the screen are picked up.
const INPUT_MS = 120
// The terminal's animation: a loop of frames swapped into the picture in place. Each frame is a whole PNG sent
// through tmux to the terminal, so few and small: drawn at 1x, about 150 KB each.
const FRAMES = 6
const FRAME_MS = 500
// A terminal cell in pixels, near enough for iTerm2's default font: sizes the picture to the pane's box of cells.
const CELL_W = 8
const CELL_H = 17
// Rows the controls above the picture take.
const CONTROL_ROWS = 3
// The dock's widest: Claude Code caps a docked pane at 45% of the terminal, so this asks for all of that.
const PANE_COLUMNS = 255
// The Team screen (bin/screen.py in a tmux pane) refreshes screen.json about twice a second; older than this, it
// has closed and the pictures come back into the pane.
const SCREEN_FRESH_MS = 5000
// The share of the tmux window `/team screen` gives the screen, leaving the rest to Claude.
const SCREEN_SHARE = '70%'

// Change a tag when that value's fields change: it declines what an earlier
// version stored, which outlives a reload.
const team = atom({ plugin: 'team-wire', key: 'team' } as const, null, { shape: 'team-2' })
const view = atom({ plugin: 'team-wire', key: 'view' } as const, 'factory', { shape: 'view-1' })
// `/team off` hides the pane and the summary line, across sessions, until `/team` again.
const isOff = atom({ plugin: 'team-wire', key: 'isOff' } as const, false, { shape: 'off-1' })
// The terminal shows no SVG, so the pane is drawn to a PNG by headless Chrome and shown as a picture;
// `/team text` keeps to the text version (a terminal without pictures, or tmux without passthrough).
const picture = atom({ plugin: 'team-wire', key: 'picture' } as const, null, { shape: 'picture-3' })
const isText = atom({ plugin: 'team-wire', key: 'isText' } as const, false, { shape: 'text-1' })
// Who the badge shows and the chat follows; which messages the chat shows.
const selected = atom({ plugin: 'team-wire', key: 'selected' } as const, 'lead', { shape: 'selected-1' })
const filter = atom({ plugin: 'team-wire', key: 'filter' } as const, 'all', { shape: 'filter-1' })
// `/team still` shows one picture; `/team live` (the default) plays the frames.
const isStill = atom({ plugin: 'team-wire', key: 'isStill' } as const, false, { shape: 'still-1' })
const screen = atom({ plugin: 'team-wire', key: 'screen' } as const, null, { shape: 'screen-2' })
const stage = atom({ plugin: 'team-wire', key: 'stage' } as const, '', { shape: 'stage-1' })
const issuePick = atom({ plugin: 'team-wire', key: 'issue' } as const, 0, { shape: 'issue-1' })
const replayAt = atom({ plugin: 'team-wire', key: 'replayAt' } as const, '', { shape: 'replay-1' })

// Set at session start: where pictures are drawn (the main checkout's .team/wire) and with what.
let wireDir = ''
let chrome = ''
let magick = ''
let rsvg = ''
// What the picture on the screen has where, in its pixels, and its size: a click is matched against it.
let hits: Hit[] = []
let hitSize = { width: 0, height: 0 }
// How far into input.jsonl the screen's clicks and keys have been handled.
let inputAt = 0
// The newest problem message already announced; teammates whose ring blinks, until when; whether alerts sound.
let alertedTs = ''
const flashUntil = new Map<string, number>()
let isSound = true
// The log as last read, for replaying it; its span and how busy each slice was; the replayed team, by moment.
let logText = ''
let timeline: Timeline = { from: '', to: '', at: '', buckets: [] }
let replayed = { at: '', team: null as Team | null }
// The team's log, and the copy /team demo reads instead so alerts can be tried without writing to the real one.
// Where announcements had got to in the real log when the demo began: what arrived meanwhile is announced on return.
let logPath = ''
let isDemo = false
let realAlertedTs = ''
let logSeen = ''
// A project with no team log of its own gets one recorded from Claude Code's team files by the lead's session
// (hooks/recorder.ts): the team it leads, once found, what the last look saw, and each task file's last change.
let isRecording = false
let home = ''
let sessionId = ''
let recTeam = ''
let recorded: Recorded = { tasks: {}, seen: [] }
const taskSeen = new Map<string, { mtimeMs: number; file: TaskFile }>()
// The project's settings (.claude/team-wire.json): where, as last read, what was wrong with it, and a count of the
// times it changed, which the picture's key carries so a change redraws it.
let settingsPath = ''
let settingsSig = ''
let settingsProblems: string[] = []
let settingsVersion = 0
// The project's GitLab page, for "Open in GitLab".
let projectUrl = ''
// The frames of the current loop (base64 PNGs), the one on show, and the Image's size in cells, which a swap names.
let frames: string[] = []
let frameAt = 0
let imageBox = { cols: 0, rows: 0 }
// The pane's body in cells, as last drawn; the next picture is drawn to fit it.
let box = { cols: 0, rows: 0 }
let isPainting = false
let isStale = false

// The screen's bottom line: what the last click or key did, so an action is acknowledged before its picture lands.
const say = ($: EngineInterface, text: string) =>
  wireDir ? $.fs.write(`${wireDir}/status.txt`, `${text}\n`).catch(() => undefined) : undefined

const isView = (x: unknown): x is View => typeof x === 'string' && (VIEWS as readonly string[]).includes(x)

// Teammates work in .worktrees/<name>; the log lives in the main checkout.
const rootOf = async ($: EngineInterface, cwd: string): Promise<string> => {
  const git = await $.process
    .run(['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd })
    .catch(() => undefined)
  const common = git?.exitCode === 0 ? git.stdout.trim() : ''
  return common ? common.replace(/\/\.git$/, '') : cwd.replace(/\/\.worktrees\/.*$/, '')
}

const themeOf = async ($: EngineInterface): Promise<Theme> => {
  const row = (await $.config.list().catch(() => [])).find(r => r.key === 'theme')
  const value = String(row?.value ?? '')
  return value.startsWith('light') ? 'light' : value.startsWith('dark') ? 'dark' : 'auto'
}

const pictureSize = (cols: number, rows: number) => ({
  width: Math.max(480, cols * CELL_W),
  height: Math.max(420, Math.max(1, rows - CONTROL_ROWS) * CELL_H),
})

const run = ($: EngineInterface, argv: string[]) => $.process.run(argv).then(r => r.exitCode === 0).catch(() => false)

// One SVG to a PNG with rsvg-convert, written whole and then swapped in, so no reader sees half a file.
const rsvgTo = async ($: EngineInterface, svg: string, name: string, zoom = 1) => {
  await $.fs.write(`${wireDir}/${name}.svg`, flatSvg(svg))
  return (await run($, [rsvg, '-z', String(zoom), '-o', `${wireDir}/${name}.tmp.png`, `${wireDir}/${name}.svg`]))
    && run($, ['mv', '-f', `${wireDir}/${name}.tmp.png`, `${wireDir}/${name}.png`])
}

const png = async ($: EngineInterface, name: string) => (await $.fs.read(`${wireDir}/${name}.png`, { as: 'bytes' })).base64

// Headless Chrome writes the shot in about a second, then hangs ~15 s tearing down and exits 2. Its "bytes
// written" line is taken as done; leaving the loop kills it.
const chromeTo = async ($: EngineInterface, svg: string, width: number, height: number, scale: number) => {
  await $.fs.write(`${wireDir}/view.svg`, svg)
  const shot = $.process.spawn({
    argv: [
      chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', `--force-device-scale-factor=${scale}`,
      `--user-data-dir=${wireDir}/chrome`, `--window-size=${width},${height}`,
      `--screenshot=${wireDir}/next.png`, `file://${wireDir}/view.svg`,
    ],
  })
  for await (const chunk of shot) if (/bytes written to file/.test(chunk.text)) return true
  return false
}

// Draws the picture while Claude's pane shows it or the screen runs. One drawing at a time; a change meanwhile
// draws again once it ends. With rsvg-convert the first frame shows as soon as it is drawn and the rest of the loop
// follows; a click meanwhile drops the rest and starts over.
const paint = async ($: EngineInterface): Promise<void> => {
  if ((!rsvg && !chrome) || !wireDir) return
  if (isPainting) {
    isStale = true
    return
  }
  isPainting = true
  try {
    do {
      isStale = false
      const live = await read($, team)
      if (!live || (await read($, isOff)) || (await read($, isText))) return
      const at = await read($, replayAt)
      const t = at ? teamAt(at) : live
      // The screen, while it runs, gets the picture at its own size, whether or not Claude's pane is open.
      const scr = await read($, screen)
      if (!scr && (!box.cols || !(await $.ui.panes()).some(p => p.id === PANE))) return
      const v = await read($, view)
      const sel = await read($, selected)
      const f = await read($, filter)
      const st = await read($, stage)
      const isLive = (rsvg !== '' || magick !== '') && !(await read($, isStill))
      const theme = await themeOf($)
      // Headless renderers read as light; a terminal with no theme set is most often dark.
      const drawn = theme === 'auto' ? 'dark' : theme
      // The screen shows the picture one row short of its pane, stretched to its cells, with no controls above.
      const { width, height } = scr
        ? { width: Math.max(480, Math.round(scr.cols * scr.cellW)), height: Math.max(420, Math.round((scr.rows - 1) * scr.cellH)) }
        : pictureSize(box.cols, box.rows)
      const flash = at ? [] : await flashing($)
      const iss = await read($, issuePick)
      const key = [settingsVersion, isDemo ? 'demo' : 'real', v, sel, f, st, iss, at, flash.join(','), drawn, width, height, isLive ? 'live' : 'still', t.lastTs, live.lastTs, t.messages.length].join('|')
      if ((await read($, picture))?.key === key && (!isLive || frames.length)) continue
      // The replay strip is the screen's: Claude's pane is too small to steer it.
      const opts = {
        width, height, selected: sel, filter: f, stage: st, flash, isStill: true, isDemo, issueSite: issueSite(),
        ...(iss ? { issue: iss } : {}),
        ...(scr && timeline.from ? { timeline: { ...timeline, at } } : {}),
      }
      const drawnHits: Hit[] = []
      const done = async (n: number, list: string[]) => {
        frames = list
        hits = drawnHits
        hitSize = { width, height }
        // Written last, so the screen reads only finished frames: their count (0 for the one view.png) and the key.
        await $.fs.write(`${wireDir}/ready.txt`, `${n} ${key}${n === 1 && isLive ? '|first' : ''}\n`)
        const next: Picture = { key: n === 1 && isLive ? `${key}|first` : key, view: v, width, height }
        await update($, picture, () => next)
      }
      if (rsvg) {
        if (!isLive) {
          if (!(await rsvgTo($, dashboardSvg(t, v, drawn, { ...opts, hits: drawnHits }), 'view', 2))) return
          await done(0, [])
          continue
        }
        if (!(await rsvgTo($, dashboardSvg(t, v, drawn, { ...opts, phase: 0, hits: drawnHits }), 'frame-0'))) return
        await run($, ['cp', '-f', `${wireDir}/frame-0.png`, `${wireDir}/view.png`])
        const first = await png($, 'frame-0')
        await done(1, [first])
        if (isStale) continue
        const rest = await Promise.all(
          Array.from({ length: FRAMES - 1 }, (_, i) =>
            rsvgTo($, dashboardSvg(t, v, drawn, { ...opts, phase: (i + 1) / FRAMES }), `frame-${i + 1}`)),
        )
        if (isStale || rest.some(ok => !ok)) continue
        const list = [first]
        for (let k = 1; k < FRAMES; k++) list.push(await png($, `frame-${k}`))
        await done(FRAMES, list)
        continue
      }
      // Chrome: every frame stacked in one shot, cut apart by ImageMagick.
      const svg = isLive ? spriteSvg(t, v, drawn, { ...opts, hits: drawnHits }, FRAMES) : dashboardSvg(t, v, drawn, { ...opts, hits: drawnHits })
      if (!(await chromeTo($, svg, width, isLive ? height * FRAMES : height, isLive ? 1 : 2))) return
      if (isLive) {
        if (!(await run($, [magick, `${wireDir}/next.png`, '-crop', `${width}x${height}`, '+repage', `${wireDir}/frame-%d.png`]))) return
        const list: string[] = []
        for (let k = 0; k < FRAMES; k++) list.push(await png($, `frame-${k}`))
        if (!(await run($, ['cp', '-f', `${wireDir}/frame-0.png`, `${wireDir}/view.png`]))) return
        await done(FRAMES, list)
      } else {
        if (!(await run($, ['mv', '-f', `${wireDir}/next.png`, `${wireDir}/view.png`]))) return
        await done(0, [])
      }
    } while (isStale)
  } catch {
    // A renderer missing or slow: the picture stays as it was.
  } finally {
    isPainting = false
  }
}

// Notices the screen opening, resizing or closing. Open, Claude's pane shrinks to its controls; closed, it gets its
// width back and the pictures return to it.
const watchScreen = async ($: EngineInterface): Promise<void> => {
  const raw = await $.fs.read(`${wireDir}/screen.json`).catch(() => '')
  let now: { cols: number; rows: number; cellW: number; cellH: number } | null = null
  try {
    const s = raw ? JSON.parse(raw) : null
    if (s && (await $.clock.now()) - s.ts * 1000 < SCREEN_FRESH_MS) {
      // tmux passes on the terminal's cell size in device pixels where it knows it; else iTerm2's default font. On a
      // Retina screen that is twice the points the layout's font sizes are in, so it is halved: drawn at full
      // resolution the text comes out half size and every frame four times the bytes.
      const scale = s.cellH > 2 * CELL_H - 4 ? 2 : 1
      now = { cols: s.cols, rows: s.rows, cellW: s.cellW ? s.cellW / scale : CELL_W, cellH: s.cellH ? s.cellH / scale : CELL_H }
    }
  } catch {
    // Caught mid-write: the next tick reads it whole.
    return
  }
  const was = await read($, screen)
  if (was?.cols === now?.cols && was?.rows === now?.rows && was?.cellW === now?.cellW && was?.cellH === now?.cellH) return
  await update($, screen, () => now)
  if (!was !== !now && (await $.ui.panes()).some(p => p.id === PANE)) await openPane($)
}

const openPane = async ($: EngineInterface) =>
  (await read($, screen))
    ? $.ui.open({ id: PANE, title: 'Team', columns: 60, rows: CONTROL_ROWS + 1 })
    : $.ui.open({ id: PANE, title: 'Team', columns: PANE_COLUMNS })

// Opens the screen beside the Claude pane this session runs in.
const openScreen = async ($: EngineInterface): Promise<string> => {
  if (await read($, screen)) return 'The Team screen is already open.'
  const script = `${$.plugin.root}/bin/screen.py`
  const ok = await run($, ['sh', '-c', 'test -n "$TMUX_PANE" && exec tmux split-window -h -d -l "$1" -t "$TMUX_PANE" python3 "$2" "$3"', 'sh', SCREEN_SHARE, script, wireDir])
  if (!ok) return 'The Team screen needs Claude running inside tmux.'
  return 'Team screen opened on the right: click a teammate, a tab or a step; double-click someone to go to their terminal; q closes it.'
}

// The teammate's tmux pane, from the newest team config that has them (the lead's is the team window's first).
const paneOf = async ($: EngineInterface, name: string): Promise<string> => {
  if (name === 'lead') {
    const r = await $.process.run(['tmux', 'list-panes', '-a', '-F', '#{window_name} #{pane_index} #{pane_id}']).catch(() => undefined)
    return r?.stdout.split('\n').find(l => l.startsWith('team 1 '))?.split(' ')[2] ?? ''
  }
  const r = await $.process
    .run(['sh', '-c', 'ls -t "$HOME"/.claude/teams/*/config.json 2>/dev/null | while read -r f; do jq -r --arg n "$1" \'.members[] | select(.name == $n and .backendType == "tmux") | .tmuxPaneId\' "$f"; done | head -1', 'sh', name])
    .catch(() => undefined)
  return r?.stdout.trim() ?? ''
}

const jump = async ($: EngineInterface, name: string) => {
  const id = await paneOf($, name)
  const ok = /^%\d+$/.test(id)
    && (await run($, ['tmux', 'select-window', '-t', id]))
    && (await run($, ['tmux', 'select-pane', '-t', id]))
  const text = ok ? `${shortName(name)}'s terminal` : `No open terminal for ${shortName(name)}`
  await say($, text)
  await $.ui.toast(`Team: ${text}`)
}

const cycle = async ($: EngineInterface, step: number) => {
  const names = ((await read($, team))?.members ?? []).map(m => m.name)
  if (!names.length) return
  const cur = names.indexOf(await read($, selected))
  const next = names[(cur + step + names.length) % names.length]!
  await update($, selected, () => next)
  await say($, `${shortName(next)} · Enter goes to their terminal`)
  void paint($)
}

const act = async ($: EngineInterface, action: string, isDouble: boolean) => {
  const [kind, arg = ''] = [action.slice(0, action.indexOf(':')), action.slice(action.indexOf(':') + 1)]
  if (kind === 'jump' || (kind === 'who' && isDouble)) return jump($, arg)
  if (kind === 'who') return choose($, arg)
  if (kind === 'view' && isView(arg)) return setView($, arg)
  if (kind === 'filter' && (FILTERS as readonly string[]).includes(arg)) return setFilter($, arg as Filter)
  if (kind === 'stage') {
    const now = await update($, stage, cur => (cur === arg ? '' : arg))
    await update($, issuePick, () => 0)
    await say($, now ? `${arg}: its issues, in place of the chat` : 'The chat again')
    void paint($)
  }
  if (kind === 'issue' && Number(arg) > 0) return pickIssue($, Number(arg))
  if (kind === 'open' && Number(arg) > 0) return openIssue($, Number(arg))
  if (kind === 'live') return replayTo($, null)
  if (kind === 'time') {
    const from = Date.parse(timeline.from)
    return replayTo($, from + Number(arg) * (Date.parse(timeline.to) - from))
  }
}

const REPLAY_KEYS: Record<string, number> = { '[': -STEP_MS, ']': STEP_MS, '{': -BIG_STEP_MS, '}': BIG_STEP_MS }

const KEY_ACTION: Record<string, string> = {
  m: 'view:map', o: 'view:office', f: 'view:factory', a: 'filter:all', h: 'filter:handoff', p: 'filter:problem',
}

// Clicks and keys the screen appended to input.jsonl since the last look.
const readInput = async ($: EngineInterface) => {
  const path = `${wireDir}/input.jsonl`
  const st = await $.fs.stat(path).catch(() => undefined)
  if (!st) return
  // The screen empties the file when it starts.
  if (st.size < inputAt) inputAt = 0
  if (st.size === inputAt) return
  const text = await $.fs.read(path).catch(() => '')
  const fresh = text.slice(inputAt)
  const whole = fresh.lastIndexOf('\n') + 1
  inputAt += whole
  for (const line of fresh.slice(0, whole).split('\n')) {
    if (!line) continue
    let e: { fx?: number; fy?: number; double?: boolean; key?: string }
    try {
      e = JSON.parse(line)
    } catch {
      continue
    }
    if (e.key) {
      if (KEY_ACTION[e.key]) await act($, KEY_ACTION[e.key]!, false)
      else if (e.key === 'left' || e.key === 'right') await cycle($, e.key === 'left' ? -1 : 1)
      else if (e.key === 'enter') await jump($, await read($, selected))
      else if (e.key === 'esc') {
        await update($, selected, () => 'lead')
        await update($, stage, () => '')
        await update($, issuePick, () => 0)
        await say($, 'Everyone')
        void paint($)
      } else if (e.key in REPLAY_KEYS) await replayStep($, REPLAY_KEYS[e.key]!)
      else if (e.key === 'live') await replayTo($, null)
      continue
    }
    if (e.fx === undefined || e.fy === undefined) continue
    const x = e.fx * hitSize.width
    const y = e.fy * hitSize.height
    // The last box drawn under the point wins: people are recorded after the rooms and cards they stand in.
    const hit = [...hits].reverse().find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h)
    // The replay strip takes where along it the click fell.
    const action = hit?.action === 'time:' ? `time:${Math.min(1, Math.max(0, (x - hit.x) / hit.w))}` : hit?.action
    if (action) await act($, action, e.double === true)
    else await say($, 'Nothing to click there')
  }
}

// Announces what went wrong since the last look: a toast per problem message (OFF-TRACK, STUCK, BLOCKED, CHANGES,
// FINDINGS...), one sound, and a blinking ring round whoever the model flags for it. The first look only takes note,
// so starting a session doesn't replay the day's alerts.
const announce = async ($: EngineInterface, t: Team) => {
  const fresh = alertedTs ? t.messages.filter(m => m.kind === 'problem' && m.ts > alertedTs) : []
  const wasFlagged = new Set((await read($, team))?.members.filter(m => m.isFlagged).map(m => m.name) ?? [])
  alertedTs = t.messages.reduce((a, m) => (m.ts > a ? m.ts : a), alertedTs || t.lastTs)
  if (!fresh.length) return
  const now = await $.clock.now()
  for (const m of t.members) if (m.isFlagged && (!wasFlagged.has(m.name) || fresh.some(x => x.from === m.name || x.to === m.name))) flashUntil.set(m.name, now + FLASH_MS)
  for (const m of fresh.slice(-3)) {
    const text = m.text.replace(/\s+/g, ' ')
    $.ui.toast(`▲ ${shortName(m.from)} → ${shortName(m.to)}: ${text.length > 90 ? `${text.slice(0, 89)}…` : text}`, { timeoutMs: 10_000 })
  }
  if (fresh.length > 3) $.ui.toast(`▲ and ${fresh.length - 3} more problems`, { timeoutMs: 10_000 })
  if (isSound) void $.audio.play({ asset: 'sounds/alert.wav' }).catch(() => undefined)
}

// The log's span and how many events fell in each slice of it, for the replay strip.
const activity = (text: string): Timeline => {
  const times = [...text.matchAll(/"ts":"([^"]+)"/g)].map(m => Date.parse(m[1]!)).filter(n => !Number.isNaN(n))
  if (!times.length) return { from: '', to: '', at: '', buckets: [] }
  const from = Math.min(...times.slice(0, 50))
  const to = Math.max(...times.slice(-50))
  const span = Math.max(1, to - from)
  const buckets = new Array<number>(BUCKETS).fill(0)
  for (const t of times) buckets[Math.min(BUCKETS - 1, Math.floor(((t - from) / span) * BUCKETS))]!++
  return { from: new Date(from).toISOString(), to: new Date(to).toISOString(), at: '', buckets }
}

// The team as it stood at a moment: the log read up to then. Kept for the moment on show, as each step re-reads.
const teamAt = (at: string): Team => {
  if (replayed.at !== at || !replayed.team) replayed = { at, team: parse(logText, at) }
  return replayed.team!
}

// Moves the replay to a moment, held inside the log's span; past its end is live again.
const replayTo = async ($: EngineInterface, ms: number | null) => {
  const from = Date.parse(timeline.from)
  const to = Date.parse(timeline.to)
  const at = ms === null || Number.isNaN(from) || ms >= to ? '' : new Date(Math.max(from, ms)).toISOString()
  await update($, replayAt, () => at)
  await say($, at ? `Replaying ${at.slice(5, 10)} ${at.slice(11, 16)} UTC · [ ] { } step · l live` : 'Live')
  void paint($)
}

const replayStep = async ($: EngineInterface, by: number) => {
  const cur = await read($, replayAt)
  await replayTo($, (cur ? Date.parse(cur) : Date.parse(timeline.to)) + by)
}

const pickIssue = async ($: EngineInterface, n: number) => {
  const now = await update($, issuePick, cur => (cur === n ? 0 : n))
  const title = (await read($, team))?.issues.find(i => i.issue === n)?.title ?? ''
  await say($, now ? `#${n} ${title} · Esc closes` : 'The chat again')
  void paint($)
}

// An issue's address: the project's own template, else its git remote's, GitHub's or GitLab's way.
const issueUrl = (n: number): string => {
  const own = issueUrlTemplate()
  if (own) return own.replace('{n}', String(n))
  if (!projectUrl) return ''
  return /^https?:\/\/github\.com\//.test(projectUrl) ? `${projectUrl}/issues/${n}` : `${projectUrl}/-/issues/${n}`
}
const issueSite = (): string => {
  const url = issueUrl(1)
  return /github\.com/.test(url) ? 'GitHub' : /gitlab/.test(url) ? 'GitLab' : 'browser'
}

const openIssue = async ($: EngineInterface, n: number) => {
  const url = issueUrl(n)
  // macOS opens a link with `open`, Linux with `xdg-open`.
  const ok = url !== '' && ((await run($, ['open', url])) || (await run($, ['xdg-open', url])))
  const text = ok ? `Opened #${n} in ${issueSite()}` : `No issue address for #${n}: set issueUrl in .claude/team-wire.json`
  await say($, text)
  $.ui.toast(`Team: ${text}`)
}

const RECORD_MS = 2000
const INBOX_MS = 500

// The team this session leads: its config names this session as the lead's.
const findTeam = async ($: EngineInterface): Promise<string> => {
  const dirs = await $.fs.list(`${home}/.claude/teams`).catch(() => [])
  for (const d of dirs) {
    if (d.kind !== 'dir') continue
    const cfg = await $.fs.read(`${home}/.claude/teams/${d.name}/config.json`).then(t => JSON.parse(t)).catch(() => null)
    if (cfg?.leadSessionId === sessionId) return d.name
  }
  return ''
}

const appendLines = async ($: EngineInterface, path: string, lines: object[]) => {
  for (let i = 0; i < lines.length; i += 100) {
    const chunk = lines.slice(i, i + 100).map(l => JSON.stringify(l)).join('\n') + '\n'
    await $.process.run(['sh', '-c', 'mkdir -p "$(dirname "$2")" && printf "%s" "$1" >> "$2"', 'sh', chunk, path])
  }
}

// Finds the team this session leads, picking up where an earlier load of the mod left off with it.
const ensureTeam = async ($: EngineInterface): Promise<boolean> => {
  if (recTeam) return true
  recTeam = await findTeam($)
  if (!recTeam) return false
  const saved = await $.fs.read(`${wireDir}/recorded-state.json`).then(t => JSON.parse(t)).catch(() => null)
  recorded = saved?.team === recTeam ? { tasks: saved.tasks ?? {}, seen: Array.isArray(saved.seen) ? saved.seen : [] } : { tasks: {}, seen: [] }
  return true
}

const saveRecorded = ($: EngineInterface) => $.fs.write(`${wireDir}/recorded-state.json`, JSON.stringify({ team: recTeam, ...recorded }))

// Logs the messages not logged already, however they were seen.
const noteMessages = async ($: EngineInterface, list: { from: string; to: string; text: string; ms: number }[]) => {
  const lines: object[] = []
  for (const m of list) {
    const r = messageEvent(m, recorded.seen)
    recorded.seen = r.seen
    if (r.line) lines.push(r.line)
  }
  if (!lines.length) return
  await appendLines($, logPath, lines)
  await saveRecorded($)
  await pollNow()
}

// One look at the task files: what changed since the last is appended to the recorded log.
const recordTasks = async ($: EngineInterface) => {
  if (!(await ensureTeam($))) return
  const tasksDir = `${home}/.claude/tasks/${recTeam}`
  const files: TaskFile[] = []
  for (const e of await $.fs.list(tasksDir).catch(() => [])) {
    if (e.kind !== 'file' || !/^\d+\.json$/.test(e.name)) continue
    const had = taskSeen.get(e.name)
    if (had && had.mtimeMs === e.mtimeMs) {
      files.push(had.file)
      continue
    }
    const file = await $.fs.read(`${tasksDir}/${e.name}`).then(t => JSON.parse(t) as TaskFile).catch(() => null)
    // Caught mid-write: the last version stands until the next look.
    if (!file) {
      if (had) files.push(had.file)
      continue
    }
    taskSeen.set(e.name, { mtimeMs: e.mtimeMs, file })
    files.push(file)
  }
  const ts = new Date(await $.clock.now()).toISOString().replace(/\.\d+Z$/, 'Z')
  const t = taskEvents(recTeam, recorded.tasks, files, ts)
  const isOver = !files.length && Object.keys(recorded.tasks).length > 0
  recorded.tasks = t.tasks
  if (t.lines.length) await appendLines($, logPath, t.lines)
  if (t.lines.length || isOver) await saveRecorded($)
  // The team shut down: the next one this session makes is looked for afresh.
  if (isOver) {
    recTeam = ''
    taskSeen.clear()
  }
}

// Inboxes empty once read, so they're looked at more often than the tasks.
const recordInboxes = async ($: EngineInterface) => {
  if (!recTeam) return
  const inboxes: Record<string, InboxMessage[]> = {}
  const inboxDir = `${home}/.claude/teams/${recTeam}/inboxes`
  for (const e of await $.fs.list(inboxDir).catch(() => [])) {
    if (e.kind !== 'file' || !e.name.endsWith('.json') || e.size < 3) continue
    const list = await $.fs.read(`${inboxDir}/${e.name}`).then(t => JSON.parse(t)).catch(() => null)
    if (Array.isArray(list) && list.length) inboxes[e.name.slice(0, -5)] = list
  }
  const fresh = inboxMessages(inboxes)
  if (fresh.length) await noteMessages($, fresh)
}

// A project that doesn't ignore .team would show the mod's files as untracked: they get their own .gitignore.
const ignoreTeamDir = async ($: EngineInterface, root: string) => {
  const ignored = await run($, ['git', '-C', root, 'check-ignore', '-q', '.team/wire/x'])
  if (!ignored && !(await $.fs.exists(`${root}/.team/.gitignore`).catch(() => true))) {
    await $.process.run(['sh', '-c', 'mkdir -p "$1" && printf "*\\n" > "$1/.gitignore"', 'sh', `${root}/.team`]).catch(() => undefined)
  }
}

const noLog = () => isRecording
  ? 'Nothing recorded yet: Team Wire records the team this session leads once it creates one.'
  : 'No team log yet (.team/log/events.jsonl). It appears once a team runs here.'

// Reads the project's settings when the file appears, changes or goes; a change re-reads the log under them.
const loadSettings = async ($: EngineInterface): Promise<boolean> => {
  const st = await $.fs.stat(settingsPath).catch(() => undefined)
  const sig = st ? `${st.size}:${st.mtimeMs}` : 'none'
  if (sig === settingsSig) return false
  settingsSig = sig
  let raw: unknown
  let problems: string[] = []
  if (st) {
    try {
      raw = JSON.parse(await $.fs.read(settingsPath))
    } catch (err) {
      problems = [`not valid JSON (${String((err as Error)?.message ?? err).slice(0, 80)}), so the defaults stand`]
    }
  }
  problems = [...problems, ...configure(raw)]
  settingsProblems = problems
  settingsVersion++
  logSeen = ''
  if (problems.length) $.ui.toast(`Team Wire: .claude/team-wire.json: ${problems[0]}${problems.length > 1 ? ` (and ${problems.length - 1} more: /team config)` : ''}`, { timeoutMs: 10_000 })
  return true
}

// /team config: the settings in force and where they come from; `init` writes them to a file to edit.
const STARTER_LABELS: Record<string, string> = {
  'api-spec': 'API spec', 'ui-spec': 'UI spec', 'security-spec': 'Threat model', acceptance: 'Acceptance', 'attack-plan': 'Attack plan',
  build: 'Build', ui: 'UI', integrate: 'Integrate', review: 'Review', 'security-review': 'Security review',
  'design-review': 'Design review', merge: 'Merge', attack: 'Attack',
}
const configCommand = async ($: EngineInterface, arg: string): Promise<string> => {
  const rel = '.claude/team-wire.json'
  if (arg === 'init') {
    if (await $.fs.exists(settingsPath).catch(() => false)) return `${rel} already exists; edit it, and Team Wire picks the change up within a few seconds.`
    const starter = {
      steps: line().map(k => ({ kind: k, label: labelOf(k) ?? STARTER_LABELS[k] ?? k })),
      rework: reworkOf(),
      shipStep: line().includes('merge') ? 'merge' : line()[line().length - 1],
      titleStep: line().includes('build') ? 'build' : line()[0],
      words: {},
      issueUrl: issueUrlTemplate() || (issueUrl(0) ? issueUrl(0).replace(/0$/, '{n}') : ''),
      roles: {},
    }
    if (!starter.issueUrl) delete (starter as { issueUrl?: string }).issueUrl
    const ok = await run($, ['sh', '-c', 'mkdir -p "$(dirname "$1")" && printf "%s\\n" "$2" > "$1"', 'sh', settingsPath, JSON.stringify(starter, null, 2)])
    return ok
      ? `Wrote ${rel} with the settings in force. Edit it: steps (the task kinds, in order, each with a label), rework, shipStep, titleStep, words (problem, handoff, approve, merge: lists of words that mark a message), issueUrl (with {n}) and roles (name: lead, backend, ui, qa, sec or rev). Changes apply within a few seconds.`
      : `Couldn't write ${rel}.`
  }
  const found = settingsSig !== 'none'
  const steps = line().map(k => labelOf(k) ? `${k} (${labelOf(k)})` : k).join(' → ')
  const lines = [
    found ? `Settings from ${rel}.` : `No ${rel}: the defaults are in force. /team config init writes them there to edit.`,
    ...settingsProblems.map(p => `Problem: ${p}`),
    `Steps: ${steps}${line() === DEFAULT_LINE ? ' (default)' : ''}`,
    `Rework: a ${reworkOf().kind} task sends an issue back to ${reworkOf().to}.`,
    `Issue links: ${issueUrl(1) ? issueUrl(1).replace(/1$/, '<n>') : 'none (set issueUrl)'}`,
  ]
  return lines.join('\n')
}

const demoLog = () => `${wireDir}/demo/events.jsonl`
let pollNow: () => Promise<void> = async () => undefined

// A made-up problem from a working teammate, appended to the demo's copy of the log only.
const demoAlert = async ($: EngineInterface) => {
  const members = (await read($, team))?.members ?? []
  const who = members.find(m => m.status === 'working' && m.name !== 'lead') ?? members.find(m => m.name !== 'lead')
  const name = who?.name ?? 'web-engineer'
  const ts = new Date(await $.clock.now()).toISOString().replace(/\.\d+Z$/, 'Z')
  const message = `OFF-TRACK ${name} #${who?.issue ?? 0}: a Team Wire demo alert, not a real problem`
  const line = JSON.stringify({ ts, event: 'PostToolUse', agent: name, tool: 'SendMessage', input: { to: 'team-lead', message } })
  await $.process.run(['sh', '-c', 'printf "%s\\n" "$1" >> "$2"', 'sh', line, demoLog()])
  await pollNow()
}

// /team demo: the mod switches to a copy of the log and, a moment later, an alert arrives in it.
const demo = async ($: EngineInterface, isOn: boolean): Promise<string> => {
  if (!isOn) {
    if (!isDemo) return 'No demo is running.'
    isDemo = false
    alertedTs = realAlertedTs
    await say($, 'Back to the real log')
    await pollNow()
    return 'Demo over: back to the real log. The demo copy stays in .team/wire/demo until the next demo.'
  }
  if (isDemo) {
    $.clock.after(1500, () => void demoAlert($))
    return 'Another demo alert is on its way.'
  }
  const ok = await run($, ['sh', '-c', 'mkdir -p "$(dirname "$2")" && cp -f "$1" "$2"', 'sh', logPath, demoLog()])
  if (!ok) return 'No team log to copy yet (.team/log/events.jsonl).'
  realAlertedTs = alertedTs
  isDemo = true
  await say($, 'Demo: a copy of the log · an alert arrives in 3 s')
  await pollNow()
  $.clock.after(3000, () => void demoAlert($))
  return 'Demo on: Team Wire reads a copy of the log (badged DEMO); in 3 s a made-up alert lands in that copy, with its toast, sound and blinking ring. /team demo sends another, /team demo off ends it.'
}

// /team times: each step of the line as numbers, for the retro: where issues queued and how long the work took.
const timesTable = (t: Team): string => {
  const times = stageTimes(t)
  const LINE = line()
  const rows = LINE.filter(k => times[k]!.started || times[k]!.waiting).map(k => {
    const x = times[k]!
    return [k, String(x.started), x.started ? dur(x.avgWaitMs) : '–', String(x.finished), x.finished ? dur(x.avgWorkMs) : '–', x.waiting ? `${x.waiting}, oldest ${dur(x.oldestMs)}` : '–']
  })
  if (!rows.length) return 'No step has started yet.'
  const head = ['step', 'started', 'avg wait', 'finished', 'avg work', 'ready now']
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map(r => r[i]!.length)))
  const row = (r: string[]) => r.map((c, i) => c.padEnd(widths[i]!)).join('  ').trimEnd()
  const worst = LINE.reduce((a, k) => (times[k]!.oldestMs > (times[a]?.oldestMs ?? 0) ? k : a), '')
  const note = worst && times[worst]!.oldestMs > 0 ? `\nLongest queue now: ${worst}, ${dur(times[worst]!.oldestMs)}.` : ''
  return `Times per step, as at ${t.lastTs.slice(11, 16)} UTC (a wait runs from ready to started):\n\n${[row(head), ...rows.map(row)].join('\n')}${note}`
}

const flashing = async ($: EngineInterface): Promise<string[]> => {
  const now = await $.clock.now()
  for (const [name, until] of flashUntil) if (until <= now) flashUntil.delete(name)
  return [...flashUntil.keys()].sort()
}

const setView = async ($: EngineInterface, x: View) => {
  await update($, view, () => x)
  await $.store.set('view', x)
  await say($, `${LABEL[x]} view`)
  void paint($)
}

const choose = async ($: EngineInterface, name: string) => {
  // Pressing the chosen teammate again goes back to everyone (the lead).
  const now = await update($, selected, cur => (cur === name ? 'lead' : name))
  await say($, now === 'lead' ? 'Everyone' : `${shortName(now)} · double-click or Enter for their terminal`)
  void paint($)
}

const setFilter = async ($: EngineInterface, f: Filter) => {
  await update($, filter, () => f)
  await say($, `Chat: ${FILTER_LABEL[f]}`)
  void paint($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await $.command.register({
      name: 'team',
      description: 'Show the agent team as a map, an office or a factory; /team off hides it',
      argumentHint: '[map|office|factory|screen|live|still|text|pictures|sound on|sound off|demo|demo off|times|config|config init|off]',
    })
    const saved = await $.store.get('view').catch(() => undefined)
    if (isView(saved)) await update($, view, () => saved)
    if ((await $.store.get('off').catch(() => undefined)) === true) await update($, isOff, () => true)
    if ((await $.store.get('text').catch(() => undefined)) === true) await update($, isText, () => true)
    if ((await $.store.get('still').catch(() => undefined)) === true) await update($, isStill, () => true)
    isSound = (await $.store.get('sound').catch(() => undefined)) !== false

    const root = await rootOf($, e.cwd)
    logPath = `${root}/.team/log/events.jsonl`
    wireDir = `${root}/.team/wire`
    const inGit = await run($, ['git', '-C', root, 'rev-parse', '--git-dir'])
    if (inGit) await ignoreTeamDir($, root)
    // No team log of the project's own: record one, if this session leads a team (checked on each look).
    if (!(await $.fs.exists(logPath).catch(() => false))) {
      logPath = `${wireDir}/recorded.jsonl`
      isRecording = true
      home = (await $.process.run(['sh', '-c', 'printf %s "$HOME"']).catch(() => undefined))?.stdout ?? ''
      sessionId = await $.session.id().catch(() => '')
      if (home && sessionId) {
        $.clock.every(RECORD_MS, () => void recordTasks($).catch(() => undefined))
        $.clock.every(INBOX_MS, () => void recordInboxes($).catch(() => undefined))
      }
    }
    chrome = (await $.fs.exists(CHROME).catch(() => false)) ? CHROME : ''
    for (const m of MAGICKS) if (!magick && (await $.fs.exists(m).catch(() => false))) magick = m
    for (const r of RSVGS) if (!rsvg && (await $.fs.exists(r).catch(() => false))) rsvg = r
    // git@gitlab.com:group/project.git or https://user:token@gitlab.com/group/project.git, without the credentials.
    const remote = await $.process.run(['git', '-C', root, 'remote', 'get-url', 'origin']).catch(() => undefined)
    const url = remote?.exitCode === 0 ? remote.stdout.trim() : ''
    projectUrl = url
      .replace(/^git@([^:]+):/, 'https://$1/')
      .replace(/^(https?:\/\/)[^@/]+@/, '$1')
      .replace(/\.git$/, '')
    // Clicks from before this load were meant for the picture then on show: skip them.
    inputAt = (await $.fs.stat(`${wireDir}/input.jsonl`).catch(() => undefined))?.size ?? 0
    $.clock.every(INPUT_MS, () => void readInput($).catch(() => undefined))
    // Plays the loop: each tick swaps the next frame into the picture without redrawing the pane.
    $.clock.every(FRAME_MS, () => {
      if (frames.length < 2 || !imageBox.cols) return
      frameAt = (frameAt + 1) % frames.length
      const png = frames[frameAt]
      if (png) void $.ui.blit({ requestId: PANE, key: 'view', source: { png }, columns: imageBox.cols, rows: imageBox.rows }).catch(() => undefined)
    })
    settingsPath = `${root}/.claude/team-wire.json`
    await loadSettings($)
    const poll = async () => {
      await loadSettings($).catch(() => false)
      try {
        const path = isDemo ? demoLog() : logPath
        const st = await $.fs.stat(path)
        const sig = `${path}:${st.size}:${st.mtimeMs}`
        if (sig !== logSeen) {
          logSeen = sig
          const text = st.size < READ_LIMIT
            ? await $.fs.read(path)
            : (await $.process.run(['tail', '-n', TAIL_LINES, path])).stdout
          const parsed = parse(text)
          logText = text
          timeline = activity(text)
          replayed = { at: '', team: null }
          await announce($, parsed)
          await update($, team, () => parsed)
        }
      } catch {
        // No log yet (no team has run here): try again next tick.
      }
      await watchScreen($)
      // Also catches a resized pane, whose size only a draw learns.
      void paint($)
    }
    pollNow = poll
    await poll()
    $.clock.every(POLL_MS, () => void poll())

    return started
  })

  // While recording: teammates' messages as they reach the lead's conversation.
  on('session.append', async ($, e, next) => {
    const result = await next(e)
    if (isRecording && recTeam && e.message.type === 'user' && e.agentId === undefined) {
      const content = e.message.content
      const text = typeof content === 'string' ? content
        : Array.isArray(content) ? content.map(b => (b && typeof b === 'object' && 'text' in b && typeof b.text === 'string' ? b.text : '')).join('\n') : ''
      const got = text.includes('<teammate-message') ? deliveredMessages(text) : []
      if (got.length) {
        const ms = await $.clock.now()
        void noteMessages($, got.map(m => ({ ...m, to: 'lead', ms }))).catch(() => undefined)
      }
    }
    return result
  })

  // While recording: the lead's own messages, once sent.
  on('tool.call', { tool: 'SendMessage' }, async ($, e, next) => {
    const result = await next(e)
    if (isRecording && recTeam && e.agentId === undefined && !('deny' in result) && typeof e.to === 'string' && typeof e.message === 'string') {
      void noteMessages($, [{ from: 'lead', to: e.to, text: e.message, ms: await $.clock.now() }]).catch(() => undefined)
    }
    return result
  })

  on('command.run', { command: 'team' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'off') {
      await update($, isOff, () => true)
      await $.store.set('off', true)
      await $.ui.close({ id: PANE })
      return { text: 'Team Wire is off: the pane and the summary line are hidden. /team turns it back on.' }
    }
    if (arg === 'config' || arg === 'config init') return { text: await configCommand($, arg === 'config init' ? 'init' : '') }
    if (arg === 'times') {
      const t = await read($, team)
      return { text: t ? timesTable(t) : noLog() }
    }
    if (arg === 'demo' || arg === 'demo off') return { text: await demo($, arg === 'demo') }
    if (arg === 'sound on' || arg === 'sound off' || arg === 'sound') {
      isSound = arg === 'sound' ? !isSound : arg === 'sound on'
      await $.store.set('sound', isSound)
      if (isSound) void $.audio.play({ asset: 'sounds/alert.wav' }).catch(() => undefined)
      return { text: `Team alerts ${isSound ? 'sound' : 'are silent'}. Toasts and the blinking ring stay either way.` }
    }
    let note = ''
    if (arg === 'screen') {
      note = ` ${await openScreen($)}`
    } else if (arg === 'text' || arg === 'pictures') {
      await update($, isText, () => arg === 'text')
      await $.store.set('text', arg === 'text')
    } else if (arg === 'live' || arg === 'still') {
      await update($, isStill, () => arg === 'still')
      await $.store.set('still', arg === 'still')
      if (arg === 'still') frames = []
    } else if (arg && !isView(arg)) {
      return { text: `Unknown option "${arg}". Use /team map, /team office, /team factory, /team screen, /team live, /team still, /team text, /team pictures, /team sound on|off, /team demo [off], /team times, /team config [init] or /team off.` }
    }
    await update($, isOff, () => false)
    await $.store.set('off', false)
    if (isView(arg)) await setView($, arg)
    const current = isView(arg) ? arg : await read($, view)
    const { isPlaced } = await openPane($)
    void paint($)
    const t = await read($, team)
    const state = t ? summary(t) : noLog().replace(/^N/, 'n').replace(/\.$/, '')
    return { text: `Team pane: ${LABEL[current]} view${isPlaced ? '' : ' (it opens once the window is wide enough)'}. ${state}.${note}` }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const t = await read($, team)
    const v = await read($, view)
    const sel = await read($, selected)
    const f = await read($, filter)
    const cols = e.props.bodyColumns
    const rows = e.props.scroll.bodyRows
    box = { cols, rows }

    const draw = (lines: Line[], T: (p: any) => any) =>
      lines.map(line => (
        <T>
          {line.length ? line.map(s => <T {...(s.color ? { color: s.color } : {})} {...(s.dim ? { dimColor: true } : {})} {...(s.bold ? { bold: true } : {})}>{s.t}</T>) : ' '}
        </T>
      ))

    // The same controls on every surface: views and the chat filter, then a chip per teammate.
    const controls = (Box: (p: any) => any, Text: (p: any) => any, Button: (p: any) => any) => (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={1}>
          {VIEWS.map(x => <Button key={`view-${x}`} hotkey={x[0]} {...(x === v ? { variant: 'primary' as const } : {})} onPress={() => setView($, x)}>{LABEL[x]}</Button>)}
          <Text dimColor>│</Text>
          {FILTERS.map(x => <Button key={`filter-${x}`} {...(x === f ? { variant: 'primary' as const } : {})} onPress={() => setFilter($, x)}>{FILTER_LABEL[x]}</Button>)}
        </Box>
        <Box flexDirection="row" gap={1} flexWrap="wrap">
          {(t?.members ?? []).map(m => (
            <Button key={`who-${m.name}`} plain onPress={() => choose($, m.name)}>
              {/* A flagged teammate's chip turns red with a ▲: the same width, so the row never reflows. */}
              <Text color={m.isFlagged ? 'error' : AREA_COLOR[m.area]} {...(m.name === sel ? { inverse: true, bold: true } : {})}>{`${m.isFlagged ? '▲' : ' '}${initials(m.name)} `}</Text>
            </Button>
          ))}
          <Text dimColor>{sel === 'lead' ? ' everyone' : ` ${shortName(sel)}`}</Text>
        </Box>
      </Box>
    )

    if (e.surface === 'terminal') {
      const { Box, Text, Button, Image } = $.ui.resolve(e)
      if (!t) return <Box flexDirection="column">{controls(Box, Text, Button)}<Text dimColor>{noLog()}</Text></Box>
      const usePicture = (rsvg !== '' || chrome !== '') && !(await read($, isText))
      if (usePicture && (await read($, screen))) {
        // The picture plays in the screen; here, only what steers it.
        imageBox = { cols: 0, rows: 0 }
        return (
          <Box flexDirection="column">
            {controls(Box, Text, Button)}
            <Text dimColor>{isDemo ? 'DEMO · ' : ''}{summary(t)} · showing in the Team screen →</Text>
          </Box>
        )
      }
      // Shows the last picture while the next is drawn: it is scaled to the pane until then.
      const pic = usePicture ? await read($, picture) : null
      const png = !pic ? '' : frames[frameAt % Math.max(1, frames.length)]
        ?? (await $.fs.read(`${wireDir}/view.png`, { as: 'bytes' }).then(b => b.base64).catch(() => ''))
      if (png) {
        imageBox = { cols: Math.min(255, cols), rows: Math.min(255, Math.max(4, rows - CONTROL_ROWS)) }
        return (
          <Box flexDirection="column">
            {controls(Box, Text, Button)}
            <Image key="view" source={{ png }} columns={imageBox.cols} rows={imageBox.rows} alt={altText(t, v)} />
          </Box>
        )
      }
      const body = textView(t, v, cols)
      const room = Math.max(3, rows - body.length - 6)
      return (
        <Box flexDirection="column">
          {controls(Box, Text, Button)}
          <Text dimColor>{summary(t)}{usePicture ? ' · drawing the picture…' : ''}</Text>
          <Box flexDirection="column" marginTop={1}>{draw(body, Text)}</Box>
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Latest messages</Text>
            {draw(messageLines(t, cols, room), Text)}
          </Box>
        </Box>
      )
    }

    const { Box, Text, Button, Svg } = $.ui.resolve(e)
    if (!t) return <Box flexDirection="column">{controls(Box, Text, Button)}<Text dimColor>{noLog()}</Text></Box>
    const { width, height } = pictureSize(cols, rows)
    return (
      <Box flexDirection="column" gap={1}>
        {controls(Box, Text, Button)}
        <Svg source={dashboardSvg(t, v, await themeOf($), { width, height, selected: sel, filter: f })} alt={altText(t, v)} isInteractive />
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const t = await read($, team)
    if (await read($, isOff)) return next(e)
    if (!t || (await $.clock.now()) - Date.parse(t.lastTs) > BAND_FRESH_MS) return next(e)
    const { Text } = $.ui.resolve(e)
    const flagged = t.members.filter(m => m.isFlagged).map(m => m.name)
    return (
      <Text>
        <Text bold>Team</Text>
        {isDemo ? <Text color="warning"> · DEMO</Text> : ''}
        <Text dimColor> · {summary(t)}</Text>
        {flagged.length ? <Text color="error"> · ▲ {flagged.join(', ')}</Text> : ''}
        <Text dimColor> · /team</Text>
      </Text>
    )
  })
}
