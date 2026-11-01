export type View = 'map' | 'office' | 'factory'
export type Area = 'lead' | 'backend' | 'ui' | 'qa' | 'sec' | 'rev'
export type MemberStatus = 'working' | 'waiting' | 'free'
export type StageState = 'done' | 'run' | 'wait'
export type MsgKind = 'handoff' | 'problem' | 'approve' | 'merge' | 'note'

export type Member = {
  name: string
  area: Area
  status: MemberStatus
  /** The in-progress (or else blocked) task's issue and kind, for placing them. */
  issue?: number
  kind?: string
  task?: string
  isFlagged: boolean
}

/** One task of an issue, for the issue card: who had it and when it ran. */
export type IssueStep = {
  kind: string
  owner?: string
  state: StageState
  /** Created, or when its last blocker finished: from then it waits for someone to start it. */
  readyTs?: string
  startTs?: string
  doneTs?: string
}

/** How issues move through one step of the line, for finding where work queues up. */
export type StageTime = {
  /** Steps ready to start but not started, and the longest any of them has waited, in ms. */
  waiting: number
  oldestMs: number
  /** Over steps already started: the average wait before starting, and over finished ones the average work. */
  avgWaitMs: number
  avgWorkMs: number
  started: number
  finished: number
}

export type Issue = {
  issue: number
  /** From its task subjects, after the owner: "The sign-in screens". */
  title: string
  steps: IssueStep[]
  /** Its first task's creation, and its merge's completion once shipped. */
  openTs?: string
  shipTs?: string
  stages: Record<string, StageState>
  /** The first stage, in line order, still running or waiting: where the crate is. */
  at?: string
  /** A fix task runs: review sent it back to build. */
  isRework: boolean
  isShipped: boolean
  isActive: boolean
}

export type Msg = { ts: string; from: string; to: string; kind: MsgKind; text: string }
export type Pair = { a: string; b: string; n: number; lastTs: string }
export type Alert = { ts: string; agent: string; kind: string; detail: string }

export type Team = {
  members: Member[]
  issues: Issue[]
  messages: Msg[]
  pairs: Pair[]
  alerts: Alert[]
  lastTs: string
}

/** A view drawn to .team/wire/view.png for the terminal, which shows pictures but not SVG. */
export type Picture = { key: string; view: View; width: number; height: number }

declare module 'claude-code' {
  interface PluginState {
    'team-wire': {
      team: Shaped<Team | null>
      view: Shaped<View>
      isOff: Shaped<boolean>
      picture: Shaped<Picture | null>
      isText: Shaped<boolean>
      selected: Shaped<string>
      isStill: Shaped<boolean>
      filter: Shaped<'all' | 'handoff' | 'problem'>
      /** The Team screen's size in cells while that tmux pane runs (bin/screen.py), else null. */
      screen: Shaped<{ cols: number; rows: number; cellW: number; cellH: number } | null>
      /** The rail step picked on the screen, whose issues the chat card lists; '' for none. */
      stage: Shaped<string>
      /** The issue picked on the screen, whose steps the chat card follows; 0 for none. */
      issue: Shaped<number>
      /** The moment the screen replays (an ISO time), or '' for live. */
      replayAt: Shaped<string>
    }
  }
}
