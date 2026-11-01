// For a project with no team log of its own: the lead's session turns what it can see of its team into log lines.
// Tasks: Claude Code keeps each as ~/.claude/tasks/<team>/<id>.json (its state now); comparing one look with the
// last gives tasks created, claimed, started and finished, timed to within one look. Messages: those to the lead
// arrive in its own conversation and its own go out through SendMessage, so both are caught as they happen; those
// between two teammates are only seen in the recipient's inbox (~/.claude/teams/<team>/inboxes/<name>.json), which
// empties once read, so a quick reader can beat the look. A team shut down takes its task files with it: that is
// the team ending, not its tasks being deleted, and the log keeps them as they last stood.

export type TaskFile = { id: string; subject?: string; status?: string; owner?: string; blockedBy?: string[] }
export type InboxMessage = { from?: string; text?: string; timestamp?: string }
export type TaskState = { subject: string; status: string; owner: string; blockedBy: string[] }
/** The tasks as last seen, by their logged id, and the messages logged lately with when, to log each once. */
export type Recorded = { tasks: Record<string, TaskState>; seen: [string, number][] }

// A message arriving two ways (the inbox and the lead's conversation) is the same one this close together.
const SAME_MS = 10 * 60 * 1000

// Structured notes the engine sends between agents (idle, assignment, shutdown): not what teammates said.
const isProtocol = (text: string) => /^\s*\{\s*"type"\s*:/.test(text)
const who = (name: string) => (name === 'team-lead' ? 'lead' : name)
const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z')

/**
 * The lines for what changed in the tasks between the last look and this one. Ids are logged as `<team>/<id>`:
 * each team numbers its tasks from 1.
 */
export const taskEvents = (team: string, before: Record<string, TaskState>, now: TaskFile[], ts: string): { lines: object[]; tasks: Record<string, TaskState> } => {
  const lines: object[] = []
  const tasks: Record<string, TaskState> = {}
  const idOf = (id: string) => `${team}/${id}`
  for (const f of now) {
    const id = idOf(String(f.id))
    const cur: TaskState = { subject: f.subject ?? '', status: f.status ?? 'pending', owner: f.owner ?? '', blockedBy: (f.blockedBy ?? []).map(b => idOf(String(b))) }
    tasks[id] = cur
    const was = before[id]
    const by = cur.owner || 'lead'
    if (!was) lines.push({ ts, event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: cur.subject }, response: { task: { id } } })
    else if (was.subject !== cur.subject) lines.push({ ts, event: 'PostToolUse', agent: by, tool: 'TaskUpdate', input: { taskId: id, subject: cur.subject } })
    const added = cur.blockedBy.filter(b => !was?.blockedBy.includes(b))
    if (added.length) lines.push({ ts, event: 'PostToolUse', agent: 'lead', tool: 'TaskUpdate', input: { taskId: id, addBlockedBy: added } })
    if (cur.owner && cur.owner !== was?.owner) lines.push({ ts, event: 'PostToolUse', agent: by, tool: 'TaskUpdate', input: { taskId: id, owner: cur.owner } })
    // A task finished without ever being marked in progress has no start: none is made up.
    if (cur.status !== (was?.status ?? 'pending')) {
      if (cur.status === 'completed') lines.push({ ts, event: 'TaskCompleted', agent: by, task_id: id, task_subject: cur.subject, outcome: 'completed' })
      else lines.push({ ts, event: 'PostToolUse', agent: by, tool: 'TaskUpdate', input: { taskId: id, status: cur.status } })
    }
  }
  // Every task gone at once is the team shut down: they stay as they were. One gone among others was deleted.
  const gone = Object.keys(before).filter(id => !tasks[id])
  if (now.length) for (const id of gone) lines.push({ ts, event: 'PostToolUse', agent: 'lead', tool: 'TaskUpdate', input: { taskId: id, status: 'deleted' } })
  return { lines, tasks: now.length ? tasks : {} }
}

/** One message as a log line, unless the same was logged lately; `seen` comes back pruned and with it added. */
export const messageEvent = (m: { from: string; to: string; text: string; ms: number }, seen: readonly [string, number][]): { line?: object; seen: [string, number][] } => {
  const kept = seen.filter(([, at]) => Math.abs(m.ms - at) < SAME_MS)
  const text = m.text.trim()
  const from = who(m.from)
  const to = who(m.to)
  const key = `${from}|${to}|${text}`
  if (!text || isProtocol(text) || kept.some(([k]) => k === key)) return { seen: kept }
  return { line: { ts: iso(m.ms), event: 'PostToolUse', agent: from, tool: 'SendMessage', input: { to, message: text } }, seen: [...kept, [key, m.ms]] }
}

/** The messages waiting in each teammate's inbox, keyed by the inbox's owner. */
export const inboxMessages = (inboxes: Record<string, InboxMessage[]>): { from: string; to: string; text: string; ms: number }[] =>
  Object.entries(inboxes)
    .flatMap(([to, list]) => list.map(m => ({ from: m.from ?? '', to, text: m.text ?? '', ms: Date.parse(m.timestamp ?? '') })))
    .filter(m => m.from && m.text && !Number.isNaN(m.ms))
    .sort((a, b) => a.ms - b.ms)

/** Teammates' messages as they appear in the lead's conversation: `<teammate-message teammate_id="x">text</…>`. */
export const deliveredMessages = (content: string): { from: string; text: string }[] =>
  [...content.matchAll(/<teammate-message teammate_id="([^"]+)"[^>]*>([\s\S]*?)<\/teammate-message>/g)]
    .map(m => ({ from: m[1]!, text: m[2]!.trim() }))
    .filter(m => m.from !== 'team-lead' && m.text && !isProtocol(m.text))
