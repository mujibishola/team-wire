import type { Alert, Area, Issue, Member, Msg, MsgKind, Pair, StageState, StageTime, Team } from '../types'

// The default roles, in the order the views seat them; numbered extras
// (gateway-engineer-2) take their role's area.
export const ROLES: readonly (readonly [string, Area])[] = [
  ['lead', 'lead'],
  ['platform-engineer', 'backend'],
  ['gateway-engineer', 'backend'],
  ['accounts-engineer', 'backend'],
  ['web-engineer', 'ui'],
  ['mobile-engineer', 'ui'],
  ['qa-engineer', 'qa'],
  ['security-engineer', 'sec'],
  ['security-tester', 'sec'],
  ['reviewer', 'rev'],
  ['design-reviewer', 'rev'],
]

// The default line, a spec-first and security-reviewed process: its task kinds in the order an issue moves through
// them. A project's .claude/team-wire.json can name its own.
export const DEFAULT_LINE: readonly string[] = [
  'api-spec', 'ui-spec', 'security-spec', 'acceptance', 'attack-plan',
  'build', 'ui', 'integrate', 'review', 'security-review', 'design-review',
  'merge', 'attack',
]

/** A project's .claude/team-wire.json, as read; every field is optional. */
export type SettingsFile = {
  steps?: (string | { kind: string; label?: string })[]
  rework?: { kind?: string; to?: string }
  shipStep?: string
  titleStep?: string
  words?: Partial<Record<'problem' | 'handoff' | 'approve' | 'merge', string[]>>
  issueUrl?: string
  roles?: Record<string, Area>
}
type Settings = {
  steps: readonly string[]
  labels: Record<string, string>
  rework: { kind: string; to: string }
  shipStep: string
  titleStep: string
  words: Partial<Record<MsgKind, RegExp>>
  issueUrl: string
  roles: Record<string, Area>
}
const AREAS: readonly Area[] = ['lead', 'backend', 'ui', 'qa', 'sec', 'rev']
const KIND_RE = /^[a-z][a-z0-9-]*$/
const DEFAULTS: Settings = {
  steps: DEFAULT_LINE, labels: {}, rework: { kind: 'fix', to: 'build' }, shipStep: 'merge', titleStep: 'build', words: {}, issueUrl: '', roles: {},
}
let cfg: Settings = DEFAULTS

export const line = (): readonly string[] => cfg.steps
export const isDefaultLine = (): boolean => cfg.steps === DEFAULT_LINE
export const labelOf = (kind: string): string | undefined => cfg.labels[kind]
export const issueUrlTemplate = (): string => cfg.issueUrl
export const reworkOf = (): { kind: string; to: string } => cfg.rework

const escapeRe = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Takes a project's settings, or undefined for none: what it can use replaces the defaults, and each problem is
 * returned in words, its field left at the default.
 */
export const configure = (raw: unknown): string[] => {
  const problems: string[] = []
  const f = (raw && typeof raw === 'object' ? raw : {}) as SettingsFile
  const next: Settings = { ...DEFAULTS, labels: {}, words: {}, roles: {} }
  if (f.steps !== undefined) {
    const steps: string[] = []
    for (const st of Array.isArray(f.steps) ? f.steps : []) {
      const kind = typeof st === 'string' ? st : st?.kind
      if (typeof kind !== 'string' || !KIND_RE.test(kind)) problems.push(`steps: "${String(kind)}" is not a task kind (lowercase letters, digits and dashes)`)
      else if (!steps.includes(kind)) {
        steps.push(kind)
        if (typeof st === 'object' && typeof st.label === 'string' && st.label.trim()) next.labels[kind] = st.label.trim()
      }
    }
    if (steps.length) next.steps = steps
    else problems.push('steps: needs at least one task kind')
  }
  const has = (k: string) => next.steps.includes(k)
  const custom = next.steps !== DEFAULT_LINE
  // With its own steps a project's other step names default to its own: the last step ships, the first names.
  if (custom) {
    next.shipStep = has('merge') ? 'merge' : next.steps[next.steps.length - 1]!
    next.titleStep = has('build') ? 'build' : next.steps[0]!
    next.rework = { kind: 'fix', to: has('build') ? 'build' : next.steps[0]! }
  }
  for (const key of ['shipStep', 'titleStep'] as const) {
    const v = f[key]
    if (v === undefined) continue
    if (typeof v === 'string' && has(v)) next[key] = v
    else problems.push(`${key}: "${String(v)}" is not one of the steps`)
  }
  if (f.rework !== undefined) {
    const kind = f.rework?.kind ?? next.rework.kind
    const to = f.rework?.to ?? next.rework.to
    if (typeof kind !== 'string' || !KIND_RE.test(kind)) problems.push(`rework.kind: "${String(kind)}" is not a task kind`)
    else if (typeof to !== 'string' || !has(to)) problems.push(`rework.to: "${String(to)}" is not one of the steps`)
    else next.rework = { kind, to }
  }
  for (const [kind, list] of Object.entries(f.words ?? {})) {
    if (!['problem', 'handoff', 'approve', 'merge'].includes(kind)) problems.push(`words: "${kind}" is not problem, handoff, approve or merge`)
    else if (!Array.isArray(list) || !list.every(w => typeof w === 'string' && w.trim())) problems.push(`words.${kind}: needs a list of words`)
    else next.words[kind as MsgKind] = new RegExp(`(^|[^A-Z0-9])(${list.map(w => escapeRe(w.trim().toUpperCase())).join('|')})(?![A-Z0-9])`)
  }
  if (f.issueUrl !== undefined) {
    if (typeof f.issueUrl === 'string' && /^https?:\/\/\S+\{n\}/.test(f.issueUrl)) next.issueUrl = f.issueUrl
    else problems.push('issueUrl: needs an http(s) address with {n} where the issue number goes')
  }
  for (const [name, area] of Object.entries(f.roles ?? {})) {
    if (AREAS.includes(area)) next.roles[name] = area
    else problems.push(`roles.${name}: "${String(area)}" is not one of ${AREAS.slice(0, -1).join(', ')} or ${AREAS[AREAS.length - 1]}`)
  }
  cfg = next
  return problems
}
const FLAG_MS = 60 * 60 * 1000
const MAX_MSGS = 80

export const roleOf = (name: string): string => name.replace(/-\d+$/, '')
// Any team's names count, not only the roles above: a teammate is whatever name owns a task or sends or receives a
// message, but for addresses that are no one (a broadcast) and agent types that are subagents, not teammates.
const NOT_TEAMMATES = new Set(['*', 'all', 'everyone', 'user', 'system', 'general-purpose', 'explore', 'plan', 'claude', 'fork'])
const isMember = (name: string): boolean =>
  ROLES.some(([r]) => r === roleOf(name)) || cfg.roles[name] !== undefined || cfg.roles[roleOf(name)] !== undefined || (/^[a-z][a-z0-9_-]{0,40}$/.test(name) && !NOT_TEAMMATES.has(name))
// A name the roles don't know takes its area from what it says it does.
const AREA_WORDS: readonly (readonly [RegExp, Area])[] = [
  [/lead|manager|coordinator|orchestrat/, 'lead'],
  [/secur|pentest|attack|threat|red-?team|audit/, 'sec'],
  [/review|critic|approver/, 'rev'],
  [/qa|test|quality|verif/, 'qa'],
  [/web|ui|ux|front|mobile|ios|android|flutter|react|design|css/, 'ui'],
]
export const areaOf = (name: string): Area =>
  cfg.roles[name] ?? cfg.roles[roleOf(name)] ?? ROLES.find(([r]) => r === roleOf(name))?.[1] ?? AREA_WORDS.find(([re]) => re.test(roleOf(name)))?.[1] ?? 'backend'
// The lead logs as `lead` but is addressed as `team-lead`.
const norm = (name: string): string => (name === 'team-lead' || name === 'main' ? 'lead' : name)

type Task = {
  id: string
  issue?: number
  kind?: string
  owner?: string
  subject: string
  status: string
  blockedBy: string[]
  seq: number
  createdTs?: string
  startTs?: string
  doneTs?: string
}

export const parseSubject = (s: string): { issue?: number; kind?: string; owner?: string } => {
  const m = /^#(\d+)\s+([a-z-]+)\s+([a-z0-9-]+):/.exec(s)
  return m ? { issue: Number(m[1]), kind: m[2], owner: m[3] } : {}
}

export const classify = (text: string): MsgKind => {
  const head = text.trimStart().slice(0, 80).toUpperCase()
  // A project's own words replace the defaults for their kind; the order of the kinds stays.
  const own = cfg.words
  if (Object.keys(own).length) {
    for (const kind of ['problem', 'merge', 'approve', 'handoff'] as const) {
      const re = own[kind]
      if (re ? re.test(head) : DEFAULT_WORDS[kind](head)) return kind
    }
    return 'note'
  }
  if (/^(OFF-TRACK|STUCK|BLOCKED|FINDINGS?\b|CHANGES\b|INSECURE|REJECTED|NOT READY|FAIL)/.test(head)) return 'problem'
  if (/\b[1-9]\d* (FINDINGS?|HOLES?)\b/.test(head)) return 'problem'
  if (/\bMERGED\b/.test(head)) return 'merge'
  if (/\bAPPROVED\b|^PASS(ED)?\b/.test(head)) return 'approve'
  if (/^[A-Z -]*READY\b|^ATTACK PLAN\b/.test(head)) return 'handoff'
  return 'note'
}

const DEFAULT_WORDS: Record<'problem' | 'merge' | 'approve' | 'handoff', (head: string) => boolean> = {
  problem: h => /^(OFF-TRACK|STUCK|BLOCKED|FINDINGS?\b|CHANGES\b|INSECURE|REJECTED|NOT READY|FAIL)/.test(h) || /\b[1-9]\d* (FINDINGS?|HOLES?)\b/.test(h),
  merge: h => /\bMERGED\b/.test(h),
  approve: h => /\bAPPROVED\b|^PASS(ED)?\b/.test(h),
  handoff: h => /^[A-Z -]*READY\b|^ATTACK PLAN\b/.test(h),
}

const ms = (ts: string): number => {
  const t = Date.parse(ts)
  return Number.isNaN(t) ? 0 : t
}

// `until`: read the log only up to that moment, for replaying the day.
export const parse = (text: string, until = ''): Team => {
  const tasks = new Map<string, Task>()
  const messages: Msg[] = []
  const pairs = new Map<string, Pair>()
  const alerts: Alert[] = []
  const flags = new Map<string, string>()
  const names = new Set<string>(['lead'])
  let lastTs = ''
  let seq = 0

  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    let e: any
    try {
      e = JSON.parse(line)
    } catch {
      continue
    }
    if (until && typeof e.ts === 'string' && e.ts > until) continue
    seq++
    if (typeof e.ts === 'string') lastTs = e.ts
    const agent = norm(String(e.agent ?? 'lead'))
    const input = e.input ?? {}

    if (e.event === 'OffTrack') {
      alerts.push({ ts: e.ts, agent, kind: String(e.kind ?? ''), detail: String(e.detail ?? '') })
      if (isMember(agent)) flags.set(agent, e.ts)
      continue
    }
    if (e.tool === 'TaskCreate') {
      const id = e.response?.task?.id
      if (id === undefined) continue
      const subject = String(input.subject ?? '')
      tasks.set(String(id), { id: String(id), subject, ...parseSubject(subject), status: 'pending', blockedBy: [], seq, ...(e.ts ? { createdTs: e.ts } : {}) })
      continue
    }
    if (e.tool === 'TaskUpdate') {
      const t = tasks.get(String(input.taskId))
      if (!t) continue
      t.seq = seq
      if (typeof input.subject === 'string') Object.assign(t, { subject: input.subject }, parseSubject(input.subject))
      if (typeof input.owner === 'string') t.owner = input.owner
      if (input.status === 'deleted') tasks.delete(t.id)
      else if (typeof input.status === 'string') t.status = input.status
      if (input.status === 'in_progress' && !t.startTs) t.startTs = e.ts
      if (input.status === 'completed') t.doneTs = e.ts
      if (Array.isArray(input.addBlockedBy)) t.blockedBy.push(...input.addBlockedBy.map(String))
      continue
    }
    if (e.event === 'TaskCompleted' && e.outcome === 'completed') {
      const id = String(e.task_id)
      const t = tasks.get(id)
      if (t) {
        t.status = 'completed'
        t.doneTs = e.ts
        t.seq = seq
      } else {
        const subject = String(e.task_subject ?? '')
        tasks.set(id, { id, subject, ...parseSubject(subject), status: 'completed', blockedBy: [], seq, doneTs: e.ts })
      }
      continue
    }
    if (e.tool === 'SendMessage' && typeof input.message === 'string') {
      const to = norm(String(input.to ?? ''))
      const kind = classify(input.message)
      messages.push({ ts: e.ts, from: agent, to, kind, text: input.message })
      if (messages.length > MAX_MSGS) messages.shift()
      for (const n of [agent, to]) if (isMember(n)) names.add(n)
      if (to !== agent && isMember(to)) {
        const [a, b] = agent < to ? [agent, to] : [to, agent]
        const k = `${a}|${b}`
        const p = pairs.get(k) ?? { a, b, n: 0, lastTs: e.ts }
        p.n++
        p.lastTs = e.ts
        pairs.set(k, p)
      }
      // A problem flags whoever must act on it: the sender of an OFF-TRACK or
      // STUCK about themselves, otherwise the recipient of findings. Their next
      // hand-off or approval clears it.
      if (kind === 'problem') {
        const self = /^\s*(OFF-TRACK|STUCK|BLOCKED)/i.test(input.message)
        const who = self ? agent : to
        if (isMember(who) && who !== 'lead') flags.set(who, e.ts)
      } else if (kind === 'handoff' || kind === 'approve') {
        flags.delete(agent)
      }
    }
  }

  for (const t of tasks.values()) if (t.owner && isMember(norm(t.owner))) names.add(norm(t.owner))
  // A team built on these roles shows each of them from the start, in the break room until they get work; any other
  // team shows only the names its log has.
  const isOurs = [...names].some(n => n !== 'lead' && ROLES.some(([r]) => r === roleOf(n)))
  if (isOurs) for (const [r] of ROLES) names.add(r)
  const done = (id: string) => tasks.get(id)?.status === 'completed' || !tasks.has(id)
  const open = [...tasks.values()].filter(t => t.status !== 'completed')
  const now = ms(lastTs)
  // Ready once created and every blocker has finished; a blocker the log never showed counts as long finished.
  const readyOf = (t: Task): string | undefined => {
    let at = t.createdTs
    for (const b of t.blockedBy) {
      const bt = tasks.get(b)
      if (!bt) continue
      if (bt.status !== 'completed') return undefined
      if (bt.doneTs && (!at || bt.doneTs > at)) at = bt.doneTs
    }
    return at
  }

  // The known roles in their order, then any other names alphabetically.
  const order = (n: string) => {
    const i = ROLES.findIndex(([r]) => r === roleOf(n))
    return (i < 0 ? ROLES.length : i) * 100 + Number(/-(\d+)$/.exec(n)?.[1] ?? 0)
  }
  const members: Member[] = [...names].sort((a, b) => order(a) - order(b) || a.localeCompare(b)).map(name => {
    const mine = open.filter(t => t.owner !== undefined && norm(t.owner) === name).sort((a, b) => b.seq - a.seq)
    const running = mine.find(t => t.status === 'in_progress')
    const waiting = mine.find(t => t.status === 'pending')
    const pick = running ?? waiting
    const flaggedAt = flags.get(name)
    const status = name === 'lead' ? (open.length ? 'working' : 'free') : running ? 'working' : waiting ? 'waiting' : 'free'
    const m: Member = { name, area: areaOf(name), status, isFlagged: flaggedAt !== undefined && now - ms(flaggedAt) < FLAG_MS }
    if (pick && name !== 'lead') {
      m.issue = pick.issue
      m.kind = pick.kind
      m.task = pick.subject
    }
    return m
  })

  const LINE = cfg.steps
  const { kind: reworkKind, to: reworkTo } = cfg.rework
  const kinds = new Set<string>([...LINE, reworkKind])
  const usesShipStep = [...tasks.values()].some(t => t.kind === cfg.shipStep)
  const byIssue = new Map<number, Task[]>()
  for (const t of tasks.values()) {
    if (t.issue === undefined || !t.kind || !kinds.has(t.kind)) continue
    byIssue.set(t.issue, [...(byIssue.get(t.issue) ?? []), t])
  }
  const issues: Issue[] = [...byIssue.entries()].sort((a, b) => a[0] - b[0]).map(([issue, list]) => {
    const stages: Record<string, StageState> = {}
    for (const kind of new Set(list.map(t => t.kind!))) {
      const ofKind = list.filter(t => t.kind === kind)
      stages[kind] = ofKind.some(t => t.status === 'in_progress')
        ? 'run'
        : ofKind.every(t => t.status === 'completed') ? 'done' : 'wait'
    }
    const isRework = stages[reworkKind] === 'run'
    const at = isRework
      ? reworkTo
      : LINE.find(k => stages[k] === 'run') ?? LINE.find(k => stages[k] === 'wait' && list.some(t => t.kind === k && t.blockedBy.every(done)))
    const stepOrder = (k: string) => (k === reworkKind ? LINE.indexOf(reworkTo) + 0.5 : LINE.indexOf(k))
    const steps = list
      .map(t => ({
        kind: t.kind!,
        ...(t.owner ? { owner: norm(t.owner) } : {}),
        state: (t.status === 'completed' ? 'done' : t.status === 'in_progress' ? 'run' : 'wait') as StageState,
        ...((r => (r ? { readyTs: r } : {}))(readyOf(t))),
        ...(t.startTs ? { startTs: t.startTs } : {}),
        ...(t.doneTs ? { doneTs: t.doneTs } : {}),
      }))
      .sort((a, b) => stepOrder(a.kind) - stepOrder(b.kind) || (a.startTs ?? a.doneTs ?? '~').localeCompare(b.startTs ?? b.doneTs ?? '~'))
    // Subjects run "#16 build web-engineer: The sign-in screens"; the build's title is the issue's.
    const titled = list.find(t => t.kind === cfg.titleStep) ?? list[0]!
    const title = titled.subject.replace(/^#\d+\s+[a-z-]+\s+[a-z0-9-]+:\s*/, '')
    const created = list.map(t => t.createdTs).filter((x): x is string => !!x).sort()
    // Shipped by its ship step; for a team that never makes tasks of that step, by every task of the issue being done.
    // A team that does use it creates an issue's tasks as it goes, so all done so far only means waiting for the next.
    const allDone = list.every(t => t.status === 'completed')
    const isShipped = stages[cfg.shipStep] === 'done' || (!usesShipStep && allDone)
    const lastDone = list.map(t => t.doneTs ?? '').sort().pop()
    const merged = list.find(t => t.kind === cfg.shipStep && t.status === 'completed')?.doneTs ?? (isShipped ? lastDone : undefined)
    return {
      issue,
      title,
      steps,
      ...(created[0] ? { openTs: created[0] } : {}),
      ...(isShipped && merged ? { shipTs: merged } : {}),
      stages,
      at,
      isRework,
      isShipped,
      isActive: list.some(t => t.status === 'in_progress'),
    }
  })

  return { members, issues, messages, pairs: [...pairs.values()], alerts: alerts.slice(-10), lastTs }
}

// Per step of the line, at the moment the team stands at (its last event): what queues there now, and how long a
// step has waited and worked on average. A wait runs from ready to started, so it counts time no one picked it up.
export const stageTimes = (team: Team): Record<string, StageTime> => {
  const now = ms(team.lastTs)
  const out: Record<string, StageTime> = {}
  for (const k of cfg.steps) {
    let waiting = 0, oldestMs = 0, waitSum = 0, started = 0, workSum = 0, finished = 0
    for (const i of team.issues) for (const st of i.steps) {
      if (st.kind !== k || !st.readyTs) continue
      const ready = ms(st.readyTs)
      if (st.startTs) {
        waitSum += Math.max(0, ms(st.startTs) - ready)
        started++
        if (st.doneTs) {
          workSum += Math.max(0, ms(st.doneTs) - ms(st.startTs))
          finished++
        }
      } else if (st.state === 'wait') {
        waiting++
        oldestMs = Math.max(oldestMs, now - ready)
      }
    }
    out[k] = { waiting, oldestMs, avgWaitMs: started ? waitSum / started : 0, avgWorkMs: finished ? workSum / finished : 0, started, finished }
  }
  return out
}

/** 45m, 1h40, 2d3h: short enough for a rail step. */
export const dur = (msv: number): string => {
  if (msv < 60000) return `${Math.max(0, Math.round(msv / 1000))}s`
  const m = Math.round(msv / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h${String(m % 60).padStart(2, '0')}`
  return `${Math.floor(h / 24)}d${h % 24}h`
}

export const shortName = (name: string): string =>
  name === 'lead' ? 'lead' : name.replace('-engineer', '').replace('security', 'sec').replace('design-reviewer', 'design-rev').replace('-tester', '-test')

export const initials = (name: string): string => {
  const n = /-(\d+)$/.exec(name)?.[1] ?? ''
  const base = roleOf(name)
  const map: Record<string, string> = { lead: 'L', 'platform-engineer': 'P', 'gateway-engineer': 'G', 'accounts-engineer': 'A', 'web-engineer': 'W', 'mobile-engineer': 'M', 'qa-engineer': 'Q', 'security-engineer': 'S', 'security-tester': 'T', reviewer: 'R', 'design-reviewer': 'D' }
  // Another team's name: the first letters of its first two words (backend-dev BD, tester T).
  const own = base.split(/[-_]/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('')
  return (map[base] ?? (own || '?')) + n
}

export const hhmm = (ts: string): string => (ts.length >= 16 ? ts.slice(11, 16) : '')
