import { expect, test } from 'claude-code/testing'

import { areaOf, classify, configure, dur, initials, line, parse, stageTimes } from '../hooks/model'
import { deliveredMessages, inboxMessages, messageEvent, taskEvents } from '../hooks/recorder'
import { dashboardSvg, flatSvg } from '../hooks/dashboard'
import type { Hit } from '../hooks/dashboard'
import { svgView, textView } from '../hooks/views'

const log = [
  { ts: '2026-10-31T10:00:00Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#12 build backend-engineer: login form' }, response: { task: { id: '1' } } },
  { ts: '2026-10-31T10:00:01Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#12 ui web-engineer: login screen' }, response: { task: { id: '2' } } },
  { ts: '2026-10-31T10:00:02Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#12 review reviewer: login form' }, response: { task: { id: '3' } } },
  { ts: '2026-10-31T10:00:03Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskUpdate', input: { taskId: '3', addBlockedBy: ['1', '2'] } },
  { ts: '2026-10-31T10:01:00Z', event: 'PostToolUse', agent: 'backend-engineer', tool: 'TaskUpdate', input: { taskId: '1', status: 'in_progress' } },
  { ts: '2026-10-31T10:02:00Z', event: 'TaskCompleted', agent: 'web-engineer', task_id: '2', task_subject: '#12 ui web-engineer: login screen', outcome: 'completed' },
  { ts: '2026-10-31T10:03:00Z', event: 'PostToolUse', agent: 'web-engineer', tool: 'SendMessage', input: { to: 'team-lead', message: 'OFF-TRACK web-engineer #12: reworking the shared table' } },
  { ts: '2026-10-31T10:04:00Z', event: 'PostToolUse', agent: 'lead', tool: 'SendMessage', input: { to: 'web-engineer', message: 'Leave the table.' } },
].map(e => JSON.stringify(e)).join('\n') + '\nnot json\n'

test('the log becomes who works on what, and where each issue is', () => {
  const team = parse(log)
  const by = (n: string) => team.members.find(m => m.name === n)!

  expect(by('backend-engineer').status).toBe('working')
  expect(by('backend-engineer').issue).toBe(12)
  expect(by('web-engineer').status).toBe('free')
  expect(by('web-engineer').isFlagged).toBe(true)
  expect(by('reviewer').status).toBe('waiting')

  const issue = team.issues.find(i => i.issue === 12)!
  expect(issue.stages).toEqual({ build: 'run', ui: 'done', review: 'wait' })
  expect(issue.at).toBe('build')
  expect(issue.isShipped).toBe(false)

  // `team-lead` is the lead's address: one pair, two messages.
  expect(team.pairs).toEqual([{ a: 'lead', b: 'web-engineer', n: 2, lastTs: '2026-10-31T10:04:00Z' }])
})

test('message kinds follow how a message starts, and a project can say it exactly with patterns', () => {
  expect(classify('API READY #12: docs/api/12.yaml')).toBe('handoff')
  expect(classify('DONE #12: the parser is in')).toBe('handoff')
  expect(classify('BLOCKED on #12: no fixtures')).toBe('problem')
  expect(classify('Failed: 3 tests')).toBe('problem')
  expect(classify('LGTM, ship it')).toBe('approve')
  expect(classify('#12 review approved')).toBe('approve')
  expect(classify('#12 merged to main at 5e01b7c')).toBe('merge')
  expect(classify('Thanks, carry on')).toBe('note')
  try {
    // "2 findings" is a problem and "0 holes" isn't: a pattern says what a word can't.
    expect(configure({ words: { problem: ['/^(OFF-TRACK|FINDINGS?\\b)/', '/\\b[1-9]\\d* (FINDINGS?|HOLES?)\\b/'], handoff: ['/^[A-Z -]*READY\\b|^ATTACK PLAN\\b/'] } })).toEqual([])
    expect(classify('#12 review: 2 findings')).toBe('problem')
    expect(classify('#12 attack: 0 holes')).toBe('note')
    expect(classify('ATTACK PLAN #12: docs/x.md')).toBe('handoff')
    expect(classify('BLOCKED on #12')).toBe('note')
    expect(classify('#12 merged')).toBe('merge')
    expect(configure({ words: { problem: ['/(unclosed/'] } })).toEqual(['words.problem: /(unclosed/ is not a valid pattern'])
  } finally {
    configure(undefined)
  }
})

test('a fix task puts the crate back at build as rework', () => {
  const rework = log + '\n' + [
    { ts: '2026-10-31T10:05:00Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#12 fix backend-engineer: review findings' }, response: { task: { id: '4' } } },
    { ts: '2026-10-31T10:05:01Z', event: 'PostToolUse', agent: 'backend-engineer', tool: 'TaskUpdate', input: { taskId: '4', status: 'in_progress' } },
  ].map(e => JSON.stringify(e)).join('\n')
  const issue = parse(rework).issues.find(i => i.issue === 12)!
  expect(issue.isRework).toBe(true)
  expect(issue.at).toBe('build')
})

test('every view draws as text and as SVG', () => {
  const team = parse(log)
  for (const view of ['map', 'office', 'factory'] as const) {
    expect(textView(team, view, 80).length).toBeGreaterThan(1)
    const svg = svgView(team, view, 'auto')
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.length).toBeLessThan(131072)
    // Unescaped ampersands break the SVG on the desktop.
    expect(/&(?!amp;|lt;|gt;|quot;|#39;)/.test(svg)).toBe(false)
  }
})

const PANE = {
  plugin: 'team-wire',
  component: 'Pane',
  requestId: 'team-wire',
  props: { title: 'Team', isFocused: false, bodyColumns: 90, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

test('the pane draws text with view buttons in the terminal and a picture elsewhere', async ($, on) => {
  const team = parse(log)
  on('state.get', (_, e: any) => ({
    value: { value: e.key === 'team' ? { shape: 'team-2', value: team } : { shape: 'view-1', value: 'office' }, version: 1 },
  }))
  on('config.list', () => ({ value: [] }))

  const term = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await term.find({ type: 'Text', text: /Backend/ })).toBeDefined()
  expect(await term.find({ key: 'view-factory' })).toBeDefined()
  await term.unmount()

  const desk = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await desk.find({ type: 'Svg' })).toBeDefined()
  await desk.unmount()
})

test('/team off hides the summary line until /team turns it back on', async ($, on) => {
  const team = parse(log)
  const state = new Map<string, unknown>([['team', { shape: 'team-2', value: team }]])
  let version = 1
  on('state.get', (_, e: any) => ({ value: state.has(e.key) ? { value: state.get(e.key), version } : { value: undefined, version: 0 } }))
  on('state.set', (_, e: any) => {
    state.set(e.key, e.value)
    return { value: { isSet: true, version: ++version } }
  })
  on('clock.now', () => ({ value: Date.parse('2026-10-31T10:10:00Z') }))
  on('store.set', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  on('config.list', () => ({ value: [] }))
  on('command.run', () => ({ text: '' }))
  // Stands for the engine's own band, drawn when the mod passes.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  const TYPED = { origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } } as const
  const BAND = { plugin: 'team-wire', component: 'AbovePrompt', requestId: 'band', props: { bodyColumns: 100 }, surface: 'terminal' } as const

  const before = await $.ui.mount(BAND as any)
  expect(await before.find({ type: 'Text', text: /working/ })).toBeDefined()
  await before.unmount()

  const off = await $.command.run({ command: 'team', args: 'off', ...TYPED })
  expect(JSON.stringify(off)).toContain('Team Wire is off')
  const hidden = await $.ui.mount(BAND as any)
  expect(await hidden.find({ type: 'Text', text: /working/ })).toBeUndefined()
  expect(await hidden.find({ type: 'Text', text: /engine/ })).toBeDefined()
  await hidden.unmount()

  await $.command.run({ command: 'team', args: '', ...TYPED })
  const back = await $.ui.mount(BAND as any)
  expect(await back.find({ type: 'Text', text: /working/ })).toBeDefined()
  await back.unmount()
})

test('the dashboard fills the box it is given and follows the chosen teammate', () => {
  const team = parse(log)
  for (const [width, height] of [[720, 1000], [1500, 820]] as const) {
    const svg = dashboardSvg(team, 'office', 'dark', { width, height, selected: 'web-engineer', filter: 'all', isStill: true })
    expect(svg).toContain(`viewBox="0 0 ${width} ${height}"`)
    expect(/&(?!amp;|lt;|gt;|quot;|#39;)/.test(svg)).toBe(false)
    // The badge names the chosen teammate; the chat keeps to their messages.
    expect(svg).toContain('>web-engineer<')
    expect(svg).toContain('OFF-TRACK web-engineer')
    // A still picture carries nothing that only makes sense in motion.
    expect(svg).not.toContain('animateMotion')
  }
  const problems = dashboardSvg(team, 'map', 'dark', { width: 720, height: 1000, selected: 'lead', filter: 'problem' })
  expect(problems).toContain('OFF-TRACK web-engineer')
  // The lead's badge quotes their last message; with only problems shown, the chat no longer does.
  const all = dashboardSvg(team, 'map', 'dark', { width: 720, height: 1000, selected: 'lead', filter: 'all' })
  expect(all.split('Leave the table.').length - 1).toBe(2)
  expect(problems.split('Leave the table.').length - 1).toBe(1)
})

test('a click on the picture finds the teammate, tab, filter or step drawn there', () => {
  const team = parse(log)
  const at = (hits: Hit[], action: string) => hits.find(h => h.action === action)
  const centre = (h: Hit) => [h.x + h.w / 2, h.y + h.h / 2] as const
  // What readInput does with a click: the last box under the point.
  const under = (hits: Hit[], [x, y]: readonly [number, number]) =>
    [...hits].reverse().find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h)?.action

  for (const view of ['map', 'office', 'factory'] as const) {
    for (const [width, height] of [[1368, 1020], [720, 1000]] as const) {
      const hits: Hit[] = []
      dashboardSvg(team, view, 'dark', { width, height, selected: 'lead', filter: 'all', hits })
      for (const a of ['view:map', 'view:office', 'view:factory', 'filter:problem', 'stage:build', 'jump:lead']) {
        expect(under(hits, centre(at(hits, a)!))).toBe(a)
      }
      // Someone standing in the scene is picked over the room they stand in, and is drawn inside the picture.
      const who = hits.filter(h => h.action === 'who:backend-engineer' && h.w < 80)
      expect(who.length).toBe(1)
      expect(under(hits, centre(who[0]!))).toBe('who:backend-engineer')
      expect(who[0]!.x).toBeGreaterThan(0)
      expect(who[0]!.x + who[0]!.w).toBeLessThan(width)
    }
  }
})

test('a picked step lists its issues in place of the chat', () => {
  const team = parse(log)
  const hits: Hit[] = []
  const svg = dashboardSvg(team, 'factory', 'dark', { width: 1368, height: 1020, selected: 'lead', filter: 'all', stage: 'build', hits })
  expect(svg).toContain('#12')
  expect(svg).toContain('running')
  expect(svg).not.toContain('Team chat')
  expect(hits.some(h => h.action === 'who:backend-engineer' && h.w > 80)).toBe(true)
})

test('the picture for rsvg-convert carries colours, not CSS variables', () => {
  const svg = flatSvg(dashboardSvg(parse(log), 'office', 'dark', { width: 1368, height: 1020, selected: 'lead', filter: 'all', isStill: true }))
  expect(svg).not.toMatch(/fill="var\(/)
  expect(svg).not.toMatch(/stroke="var\(/)
})

test('a flagged teammate gets a needs-attention button, and a fresh alert a blinking ring', () => {
  const team = parse(log)
  const hits: Hit[] = []
  const quiet = dashboardSvg(team, 'office', 'dark', { width: 1368, height: 1020, selected: 'lead', filter: 'all', hits })
  expect(quiet).toContain('▲ web')
  expect(quiet).not.toContain('class="blink"')
  const button = hits.find(h => h.action === 'who:web-engineer' && h.y < 72)
  expect(button).toBeDefined()

  const live = dashboardSvg(team, 'office', 'dark', { width: 1368, height: 1020, selected: 'lead', filter: 'all', flash: ['web-engineer'] })
  expect(live).toContain('class="blink"')
  // Frames freeze the blink alternately on and off, so the loop flashes in the terminal.
  const frame = (k: number) => dashboardSvg(team, 'office', 'dark', { width: 1368, height: 1020, selected: 'lead', filter: 'all', flash: ['web-engineer'], phase: k / 6 })
  expect(frame(0)).toContain('stroke="var(--bad)" stroke-width="3" opacity="1"')
  expect(frame(1)).toContain('stroke="var(--bad)" stroke-width="3" opacity="0.15"')
})

test('an issue keeps its title and each step with who had it and when', () => {
  const i = parse(log).issues.find(x => x.issue === 12)!
  expect(i.title).toBe('login form')
  expect(i.steps.map(s => [s.kind, s.state])).toEqual([['build', 'run'], ['ui', 'done'], ['review', 'wait']])
  expect(i.steps[0]!.startTs).toBe('2026-10-31T10:01:00Z')
  expect(i.steps[1]!.doneTs).toBe('2026-10-31T10:02:00Z')
})

test('replaying reads the log only up to that moment', () => {
  const then = parse(log, '2026-10-31T10:00:30Z')
  expect(then.issues.find(x => x.issue === 12)!.stages).toEqual({ build: 'wait', ui: 'wait', review: 'wait' })
  expect(then.members.find(m => m.name === 'web-engineer')!.isFlagged).toBe(false)
  expect(then.lastTs).toBe('2026-10-31T10:00:03Z')
})

test('a picked issue shows its steps and a GitLab button, and the strip replays and returns to live', () => {
  const team = parse(log)
  const hits: Hit[] = []
  const timeline = { from: '2026-10-31T10:00:00Z', to: '2026-10-31T10:04:00Z', at: '2026-10-31T10:02:00Z', buckets: [3, 0, 2, 1] }
  const svg = dashboardSvg(team, 'factory', 'dark', { width: 1368, height: 1020, selected: 'lead', filter: 'all', issue: 12, timeline, hits })
  expect(svg).toContain('#12')
  expect(svg).toContain('since 10:01')
  expect(svg).toContain('Open in GitLab')
  expect(svg).toContain('REPLAY')
  expect(svg).toContain('Back to live')
  expect(svg).not.toContain('Team chat')
  for (const a of ['open:12', 'time:', 'live:']) expect(hits.some(h => h.action === a)).toBe(true)
  // The strip sits below everything else, inside the picture.
  const strip = hits.find(h => h.action === 'time:')!
  expect(strip.y + strip.h).toBeLessThanOrEqual(1020)
  expect(hits.filter(h => h.action !== 'time:' && h.action !== 'live:').every(h => h.y + h.h <= strip.y + 2)).toBe(true)
  // A crate on the factory line opens its issue.
  const crates: Hit[] = []
  dashboardSvg(team, 'factory', 'dark', { width: 1368, height: 1020, selected: 'lead', filter: 'all', hits: crates })
  expect(crates.some(h => h.action === 'issue:12')).toBe(true)
})

test('a demo is badged, beside a replay, so neither passes for the live team', () => {
  const team = parse(log)
  const base = { width: 1200, height: 700, selected: 'lead', filter: 'all' as const }
  expect(dashboardSvg(team, 'factory', 'dark', base)).not.toContain('DEMO')
  const both = dashboardSvg(team, 'factory', 'dark', { ...base, isDemo: true, timeline: { from: '2026-10-31T10:00:00Z', to: '2026-10-31T10:04:00Z', at: '2026-10-31T10:02:00Z', buckets: [1, 2] } })
  expect(both).toContain('DEMO · not the real log')
  expect(both).toContain('REPLAY 10-31 10:02 UTC')
})

test('each step knows how long work queued there, and the longest queue is shaded on the rail', () => {
  const later = [
    { ts: '2026-10-31T10:30:00Z', event: 'PostToolUse', agent: 'backend-engineer', tool: 'TaskUpdate', input: { taskId: '1', status: 'completed' } },
    { ts: '2026-10-31T11:10:00Z', event: 'PostToolUse', agent: 'lead', tool: 'SendMessage', input: { to: 'reviewer', message: 'Review #12 when free.' } },
  ].map(e => JSON.stringify(e)).join('\n')
  const team = parse(`${log}${later}\n`)
  const times = stageTimes(team)
  // Build was ready at creation (10:00) and started at 10:01, then took 29 minutes.
  expect(times.build).toMatchObject({ started: 1, avgWaitMs: 60_000, finished: 1, avgWorkMs: 29 * 60_000, waiting: 0 })
  // Review became ready when its last blocker finished, 10:30, and nobody has started it by 11:10.
  expect(times.review).toMatchObject({ waiting: 1, oldestMs: 40 * 60_000, started: 0 })
  expect(dur(40_000)).toBe('40s')
  expect(dur(40 * 60_000)).toBe('40m')
  expect(dur(100 * 60_000)).toBe('1h40')
  expect(dur(50 * 3_600_000)).toBe('2d2h')

  const base = { width: 1200, height: 700, selected: 'lead', filter: 'all' as const }
  const svg = dashboardSvg(team, 'factory', 'dark', base)
  expect(svg).toContain('1 ready 40m')
  // The bottleneck's shading: amber past half an hour.
  expect(svg).toMatch(/fill="var\(--warn\)" fill-opacity="\.12"/)
  const card = dashboardSvg(team, 'factory', 'dark', { ...base, issue: 12 })
  expect(card).toContain('Open 1h10')
  expect(card).toContain('longest wait: Review 40m')
  expect(card).toContain('10:01 → 10:30 · 29m')
  const list = dashboardSvg(team, 'factory', 'dark', { ...base, stage: 'review' })
  expect(list).toContain('>ready 40m<')
})

test('another team\'s names count, with areas from what they say, and none of the default roles appear', () => {
  const other = [
    { ts: '2026-10-31T09:00:00Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: 'Write the parser' }, response: { task: { id: '1' } } },
    { ts: '2026-10-31T09:00:05Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskUpdate', input: { taskId: '1', owner: 'backend-dev' } },
    { ts: '2026-10-31T09:01:00Z', event: 'PostToolUse', agent: 'backend-dev', tool: 'TaskUpdate', input: { taskId: '1', status: 'in_progress' } },
    { ts: '2026-10-31T09:02:00Z', event: 'PostToolUse', agent: 'lead', tool: 'SendMessage', input: { to: 'tester', message: 'Test the parser when it lands.' } },
    { ts: '2026-10-31T09:03:00Z', event: 'PostToolUse', agent: 'lead', tool: 'SendMessage', input: { to: '*', message: 'Stand-up in 5.' } },
    { ts: '2026-10-31T09:04:00Z', event: 'PostToolUse', agent: 'ux-designer', tool: 'SendMessage', input: { to: 'team-lead', message: 'Mock-ups are in.' } },
  ].map(e => JSON.stringify(e)).join('\n')
  const team = parse(other)
  expect(team.members.map(m => m.name)).toEqual(['lead', 'backend-dev', 'tester', 'ux-designer'])
  expect(team.members.find(m => m.name === 'backend-dev')).toMatchObject({ status: 'working', area: 'backend', task: 'Write the parser' })
  expect([areaOf('tester'), areaOf('ux-designer'), areaOf('security-auditor'), areaOf('code-reviewer')]).toEqual(['qa', 'ui', 'sec', 'rev'])
  expect([initials('backend-dev'), initials('tester'), initials('backend-dev-2'), initials('web-engineer')]).toEqual(['BD', 'T', 'BD2', 'W'])
  // Everything draws, though no task follows the "#n kind owner:" subjects.
  expect(dashboardSvg(team, 'factory', 'dark', { width: 1200, height: 700, selected: 'lead', filter: 'all' })).toContain('backend-dev')
})

test('the recorder turns the team\'s task files and messages into log lines the views read, and a shutdown keeps them', () => {
  const first = taskEvents('t1', {}, [
    { id: '1', subject: '#7 build backend-dev: the parser', status: 'in_progress', owner: 'backend-dev' },
    { id: '2', subject: '#7 review reviewer-bot: the parser', status: 'pending', blockedBy: ['1'] },
    { id: '3', subject: 'Tidy the README', status: 'pending' },
  ], '2026-10-31T09:00:00Z')
  const second = taskEvents('t1', first.tasks, [
    { id: '1', subject: '#7 build backend-dev: the parser', status: 'completed', owner: 'backend-dev' },
    { id: '2', subject: '#7 review reviewer-bot: the parser', status: 'pending', blockedBy: ['1'], owner: 'reviewer-bot' },
  ], '2026-10-31T09:30:00Z')
  // One task gone among others was deleted.
  expect(second.lines).toContainEqual({ ts: '2026-10-31T09:30:00Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskUpdate', input: { taskId: 't1/3', status: 'deleted' } })
  // Every task gone at once is the team shut down: nothing is deleted, and the next team starts afresh.
  const over = taskEvents('t1', second.tasks, [], '2026-10-31T09:40:00Z')
  expect(over).toEqual({ lines: [], tasks: {} })
  // A second team numbers its tasks from 1 again, without touching the first's.
  const next = taskEvents('t2', {}, [{ id: '1', subject: '#8 build backend-dev: the printer', status: 'completed', owner: 'backend-dev' }], '2026-10-31T10:00:00Z')
  expect(next.lines.map((l: any) => l.response?.task?.id ?? l.input?.taskId ?? l.task_id)).toEqual(['t2/1', 't2/1', 't2/1'])

  // A message seen in an inbox and again in the lead's conversation is logged once.
  const inbox = inboxMessages({
    'reviewer-bot': [
      { from: 'team-lead', text: 'Review #7 next.', timestamp: '2026-10-31T09:31:10.120Z' },
      { from: 'team-lead', text: '{"type":"task_assignment","taskId":"2"}', timestamp: '2026-10-31T09:31:11.000Z' },
    ],
    'team-lead': [{ from: 'reviewer-bot', text: 'BLOCKED on #7: no fixtures', timestamp: '2026-10-31T09:32:00.000Z' }],
  })
  let seen: [string, number][] = []
  const lines: object[] = []
  for (const m of inbox) {
    const r = messageEvent(m, seen)
    seen = r.seen
    if (r.line) lines.push(r.line)
  }
  const delivered = deliveredMessages('<teammate-message teammate_id="reviewer-bot" color="green" summary="x">\nBLOCKED on #7: no fixtures\n</teammate-message>\n<teammate-message teammate_id="backend-dev">\n{"type":"idle_notification"}\n</teammate-message>')
  expect(delivered).toEqual([{ from: 'reviewer-bot', text: 'BLOCKED on #7: no fixtures' }])
  expect(messageEvent({ ...delivered[0]!, to: 'lead', ms: Date.parse('2026-10-31T09:32:01Z') }, seen).line).toBeUndefined()
  expect(lines).toEqual([
    { ts: '2026-10-31T09:31:10Z', event: 'PostToolUse', agent: 'lead', tool: 'SendMessage', input: { to: 'reviewer-bot', message: 'Review #7 next.' } },
    { ts: '2026-10-31T09:32:00Z', event: 'PostToolUse', agent: 'reviewer-bot', tool: 'SendMessage', input: { to: 'lead', message: 'BLOCKED on #7: no fixtures' } },
  ])

  const team = parse([...first.lines, ...second.lines, ...over.lines, ...lines].map(l => JSON.stringify(l)).join('\n'))
  expect(team.members.map(m => m.name)).toEqual(['lead', 'backend-dev', 'reviewer-bot'])
  const issue = team.issues.find(i => i.issue === 7)!
  expect(issue.stages).toEqual({ build: 'done', review: 'wait' })
  expect(issue.steps.find(s => s.kind === 'build')).toMatchObject({ startTs: '2026-10-31T09:00:00Z', doneTs: '2026-10-31T09:30:00Z' })
  expect(issue.steps.find(s => s.kind === 'review')).toMatchObject({ owner: 'reviewer-bot', readyTs: '2026-10-31T09:30:00Z' })
  expect(team.members.find(m => m.name === 'reviewer-bot')!.isFlagged).toBe(true)
})

test('a project\'s settings name its own steps, words and roles, and their problems are told', () => {
  try {
    const problems = configure({
      steps: ['spec', { kind: 'code', label: 'Coding' }, 'code-review', 'ship', 'Bad Kind'],
      rework: { kind: 'redo', to: 'code' },
      words: { problem: ['blocked', 'help'], approve: ['lgtm'], nonsense: ['x'] },
      issueUrl: 'no-number-here',
      roles: { 'pm-bot': 'lead', dev: 'wizard' },
    })
    expect(problems).toEqual([
      'steps: "Bad Kind" is not a task kind (lowercase letters, digits and dashes)',
      'words: "nonsense" is not problem, handoff, approve or merge',
      'issueUrl: needs an http(s) address with {n} where the issue number goes',
      'roles.dev: "wizard" is not one of lead, backend, ui, qa, sec or rev',
    ])
    expect(line()).toEqual(['spec', 'code', 'code-review', 'ship'])
    // Own words replace a kind's defaults, as whole words anywhere near the start; other kinds keep theirs.
    expect(classify('Need help with the schema')).toBe('problem')
    expect(classify('helpful note')).toBe('note')
    expect(classify('LGTM, ship it')).toBe('approve')
    expect(classify('READY #3 code: done')).toBe('handoff')
    expect(classify('OFF-TRACK dev #3')).toBe('note')
    expect(areaOf('pm-bot')).toBe('lead')

    const log3 = [
      { ts: '2026-10-31T09:00:00Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#3 code dev: Login form' }, response: { task: { id: '1' } } },
      { ts: '2026-10-31T09:00:01Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#3 ship pm-bot: Login form' }, response: { task: { id: '2' } } },
      { ts: '2026-10-31T09:00:02Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#3 redo dev: Login form fixes' }, response: { task: { id: '3' } } },
      { ts: '2026-10-31T09:05:00Z', event: 'PostToolUse', agent: 'dev', tool: 'TaskUpdate', input: { taskId: '3', status: 'in_progress', owner: 'dev' } },
      { ts: '2026-10-31T09:06:00Z', event: 'PostToolUse', agent: 'dev', tool: 'TaskUpdate', input: { taskId: '1', status: 'completed' } },
    ].map(e => JSON.stringify(e)).join('\n')
    const team = parse(log3)
    const issue = team.issues.find(i => i.issue === 3)!
    // The redo task sends #3 back to code, as rework; the title comes from the first step, there being no build.
    expect(issue).toMatchObject({ isRework: true, at: 'code', title: 'Login form', isShipped: false })
    expect(issue.steps.map(s => s.kind)).toEqual(['code', 'redo', 'ship'])

    const svg = dashboardSvg(team, 'factory', 'dark', { width: 1200, height: 700, selected: 'lead', filter: 'all', issue: 3, issueSite: 'GitHub' })
    expect(svg).toContain('>Coding<')
    expect(svg).toContain('Code review')
    expect(svg).toContain('Open in GitHub')
    expect(svg).not.toContain('API spec')
  } finally {
    configure(undefined)
  }
  expect(line()).toEqual(['plan', 'build', 'ui', 'test', 'review', 'merge'])
  expect(classify('OFF-TRACK dev #3')).toBe('problem')
})

test('for a team that never uses the ship step, an issue is shipped once all of its tasks are done', () => {
  const done = [
    { ts: '2026-10-31T09:00:00Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#2 build dev: Multiply' }, response: { task: { id: '1' } } },
    { ts: '2026-10-31T09:01:00Z', event: 'TaskCompleted', agent: 'dev', task_id: '1', task_subject: '#2 build dev: Multiply', outcome: 'completed' },
    { ts: '2026-10-31T09:02:00Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#3 build dev: Divide' }, response: { task: { id: '2' } } },
    { ts: '2026-10-31T09:02:00Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#3 merge lead: Divide' }, response: { task: { id: '3' } } },
    { ts: '2026-10-31T09:03:00Z', event: 'TaskCompleted', agent: 'dev', task_id: '2', task_subject: '#3 build dev: Divide', outcome: 'completed' },
  ].map(e => JSON.stringify(e)).join('\n')
  const noShip = parse(done.split('\n').slice(0, 2).join('\n'))
  expect(noShip.issues.find(i => i.issue === 2)).toMatchObject({ isShipped: true, shipTs: '2026-10-31T09:01:00Z' })
  // A team that does merge creates an issue's tasks as it goes: #2, all done so far, waits for its next ones.
  const team = parse(done)
  expect(team.issues.find(i => i.issue === 2)!.isShipped).toBe(false)
  expect(team.issues.find(i => i.issue === 3)!.isShipped).toBe(false)
})
