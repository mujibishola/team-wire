# Team Wire

Watch a Claude Code agent team at work. Team Wire is a Claude Code
mod that shows the team as a live **map**, **office** or **factory floor**:
- who is working on what, who is waiting and who is free
- where each issue is on its way through your process
- where work is queueing up
- what just went wrong

It runs in the lead's session and reads what the team does. You don't need to change how the team works.

## Install

At the prompt of a Claude Code session:

```
/plugin install team-wire --marketplace mujibishola/team-wire
```

Or from a shell:

```
claude plugin install team-wire --marketplace mujibishola/team-wire
```

Then, in the session that leads the team, run `/team`.

## What you get

- **Three views.**
  - The **factory**: issues travel a conveyor line through your steps, and teammates stand at the station of the task they're on.
  - The **office**: teammates at desks, grouped by area.
  - The **map**: who talks to whom.
- **A step rail** across the top. For each step it shows:
  - how many issues have passed it and how many are running there
  - how many are ready but not started, and the longest any has waited
  - a shaded background on the step where work has waited longest: your bottleneck
- **Issue cards.** Click an issue to see each step with who had it, when it ran, how long it waited and how long the work took, plus what the team said about it. "Open in GitHub/GitLab" takes you to the issue.
- **Alerts.** Messages that report a problem (`BLOCKED`, `STUCK`, `FAILED`... or your own words) pop up as a toast with a sound. The teammate concerned gets a blinking red ring, and a "needs attention" button appears.
- **Replay.** Step back through the day (`[` `]` by 10 minutes, `{` `}` by an hour) or click the timeline strip, and the whole picture shows the team as it stood then.
- **`/team times`**: a table of each step's average wait, average work time and current queue, useful for a retrospective.
- **A summary line** above the prompt, e.g. `Team · 3 working · 2 waiting · ▲ tester · 5/12 issues merged`.

## Commands

| Command | |
| --- | --- |
| `/team` | Open the pane (`/team map`, `/team office`, `/team factory` pick the view) |
| `/team screen` | Open the wide, clickable screen in a tmux pane beside Claude (see below) |
| `/team times` | Each step's waits and work times as a table |
| `/team config` | The settings in force; `/team config init` writes them to a file to edit |
| `/team demo` | Try an alert on a copy of the log; `/team demo off` ends it |
| `/team sound on\|off` | Alert sounds (toasts and rings stay either way) |
| `/team live\|still` | Animated or still pictures |
| `/team text\|pictures` | Plain text in place of pictures |
| `/team off` | Hide the pane and the summary line |

## The clickable screen

Claude Code limits a pane beside the chat to 45% of the window. `/team screen` instead opens a tmux pane
(`bin/screen.py`) as wide as you make it, where everything can be clicked:
- teammates, tabs, filters, rail steps, chat lines and issues
- a double-click on a teammate jumps to their terminal

Press `?` there for every key and click.

It needs:
- **tmux**, with `set -g allow-passthrough on` and `set -g mouse on`.
- **A terminal that shows iTerm2 inline images**: iTerm2, or WezTerm.
- **`rsvg-convert`** to draw the pictures: `brew install librsvg` or `apt install librsvg2-bin`. Google Chrome with
  ImageMagick works too, but is slower.

Without these, `/team` still works in Claude's own pane, as pictures where your terminal shows them and as text where it doesn't.

## Where it reads from

- **A project that keeps its own team log**, at `.team/log/events.jsonl`: Team Wire reads that. The log has one
  JSON line per `TaskCreate`, `TaskUpdate` or `SendMessage` call or `TaskCompleted` event, as a `PostToolUse` or
  `TaskCompleted` hook writes it.
- **Any other project**: the lead's session records one, `.team/wire/recorded.jsonl`, from Claude Code's own team
  files (`~/.claude/tasks/<team>/` and the teammates' inboxes). It needs no hooks.
  - Tasks are checked every 2 seconds.
  - Messages to and from the lead are caught as they happen.
  - Messages between two teammates come from their inboxes, checked every half second, so one read faster than that is missed.
  - Recording starts when the session creates its team.
  - Where `.team/` isn't git-ignored, Team Wire adds `.team/.gitignore`.

Teammates can have any names. A teammate's area comes from their name: review, security, test/QA, web/UI/design,
lead/manager, and otherwise backend. Use `roles` (below) where a name doesn't make the area clear.

Issues, the rail and the factory line come from task subjects of the form `#<issue> <kind> <owner>: <title>`, for
example `#12 build backend-dev: The parser`. Without them, the team, its work and its chat still show.

## Settings

`.claude/team-wire.json` in your project fits Team Wire to your team's process. Every field is optional.
`/team config` shows the settings in force and any problems with them. A change applies within a few seconds.

```json
{
  "steps": ["spec", { "kind": "code", "label": "Coding" }, "code-review", "qa", "ship"],
  "rework": { "kind": "redo", "to": "code" },
  "shipStep": "ship",
  "titleStep": "code",
  "words": { "problem": ["BLOCKED", "HELP"], "approve": ["LGTM"] },
  "issueUrl": "https://github.com/acme/app/issues/{n}",
  "roles": { "pm-bot": "lead", "dev": "backend" }
}
```

- **`steps`**: your task kinds, in the order an issue moves through them, each with an optional label.
- **`rework`**: the task kind that sends an issue back, and the step it goes back to.
- **`shipStep`**: the step that ships an issue. Defaults to `merge`, otherwise the last step. A team that never uses
  its ship step counts an issue shipped once all its tasks are done.
- **`titleStep`**: the task whose title names the issue. Defaults to `build`, otherwise the first step.
- **`words`**: words that mark a message as a `problem`, `handoff`, `approve` or `merge`. They match whole words
  near the message's start, in any case, and replace that kind's default words. A word between slashes is a pattern.
- **`issueUrl`**: where "Open in …" goes, with `{n}` for the number. Without it, the link comes from the git
  remote, in GitHub's or GitLab's form.
- **`roles`**: an area (`lead`, `backend`, `ui`, `qa`, `sec` or `rev`) for a name. Listed names are seated from the
  start, in the order listed.

Without settings, Team Wire uses the steps `plan`, `build`, `ui`, `test`, `review` and `merge`, with `fix` as rework.

Message words default to how a message starts:
- **Problem:** `BLOCKED`, `STUCK`, `OFF-TRACK`, `FAIL`/`FAILED`, `ERROR`, `REJECTED`, `NOT READY`, `CHANGES REQUESTED`, `HELP`.
- **Hand-off:** `… READY`, `… DONE`.
- **Approval:** `APPROVED`, `LGTM`, `PASS`.
- **Merge:** `MERGED`.

A word written between slashes is a pattern, tried on the message's first 80 characters in capitals. For example,
`"/\\b[1-9]\\d* FINDINGS?\\b/"` marks "2 findings" as a problem but not "0 findings".

Teammates listed in `roles` are seated from the start, in the order listed, as soon as the log mentions any of them.

## Platforms

Built and tested on macOS with iTerm2 and tmux.

- **Linux:** should work with tmux and WezTerm, but is untested. There's no alert sound, because Claude Code has no
  audio player there, and issue links open with `xdg-open`.
- **Windows:** the pane may work, but the tmux screen doesn't. Also untested.

## Developing

```
git clone https://github.com/mujibishola/team-wire
claude --plugin-dir ./team-wire
```

- `claude plugin test team-wire` runs the tests.
- `claude plugin validate team-wire` checks the mod.
- Once Claude Code has loaded the mod, it writes the API types, and `tsc -p team-wire` type-checks it.

## License

MIT
