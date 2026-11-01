#!/usr/bin/env python3
"""The Team Wire screen: the team's picture in a tmux pane of its own, as wide as you make it, and clickable.

Claude Code caps its docked pane at 45% of the window; this pane has no cap. `/team screen` opens it beside Claude.

    screen.py <wire dir>    the main checkout's .team/wire

It tells the mod its size (screen.json, refreshed while it runs) and plays the frames the mod last finished
(ready.txt names them). Clicks and keys go to the mod as lines in input.jsonl; the mod knows what was drawn where.

    click        a teammate, a tab, a filter, a step of the rail, a chat line, "Open pane"
    double-click a teammate: go to their terminal
    m o f        map, office, factory          a h p    all, hand-offs, problems
    ← →          previous, next teammate       Enter    go to the chosen teammate's terminal
    Esc          back to everyone              q        close the screen
    ?            the keys and clicks, on the screen
    click an issue (a crate, a stage's list, a badge's Task) for its steps; "Open in GitLab" there
    [ ]          replay ten minutes back, on   { }      an hour back, on      l    live again
    click the strip along the bottom to replay from there; "Back to live" ends it
"""
import base64
import fcntl
import json
import os
import select
import struct
import subprocess
import sys
import termios
import time
import tty

FRAME_SECONDS = 0.5
TICK = 0.05
DOUBLE_SECONDS = 0.4
# A click's mark stays until the picture it asked for arrives, or this long.
PENDING_SECONDS = 2.0
HINT = "? help · q close"
HELP = [
    "Team Wire screen",
    "",
    "Click     a teammate, a tab, a filter, a step of the rail, a chat line",
    "          an issue (a crate, a row of a step's list, a badge's Task) for its steps",
    "          \"Open pane\" or a double-click on a teammate: go to their terminal",
    "          \"Open in GitLab\" on an issue's card",
    "          the strip along the bottom: replay from there; \"Back to live\" ends it",
    "",
    "m o f     map, office, factory           a h p     chat: all, hand-offs, problems",
    "<- ->     previous, next teammate         Enter     go to the chosen teammate's terminal",
    "Esc       back to everyone",
    "[ ]       replay 10 minutes back, on      { }       an hour back, on",
    "l         live again                      q         close the screen",
    "",
    "In Claude: /team demo tries an alert on a copy of the log; /team sound off silences alerts.",
    "",
    "Any key goes back to the picture.",
]
KEYS = {"m": "m", "o": "o", "f": "f", "a": "a", "h": "h", "p": "p", "\r": "enter", "\n": "enter",
        "\x1b[D": "left", "\x1b[C": "right", "\x1bOD": "left", "\x1bOC": "right", "\x1b": "esc",
        "[": "[", "]": "]", "{": "{", "}": "}", "l": "live"}

wire = sys.argv[1]
out = sys.stdout.buffer
pane = os.environ.get("TMUX_PANE", "")


def size():
    rows, cols, xpx, ypx = struct.unpack("HHHH", fcntl.ioctl(1, termios.TIOCGWINSZ, b"\0" * 8))
    return cols, rows, xpx, ypx


def write_json(path, value):
    with open(path + ".tmp", "w") as f:
        json.dump(value, f)
    os.replace(path + ".tmp", path)


def place():
    """Where the pane sits in the client's window, or None while it doesn't show: the client is on another window,
    or another pane is zoomed, and a picture sent to iTerm2 would land on top of that."""
    fmt = "#{window_id} #{pane_left} #{pane_top} #{?#{&&:#{window_zoomed_flag},#{!=:#{pane_active},1}},0,1}"
    try:
        win, left, top, shown = subprocess.run(["tmux", "display", "-p", "-t", pane, fmt],
                                               capture_output=True, text=True).stdout.split()
        clients = subprocess.run(["tmux", "list-clients", "-F", "#{window_id}"], capture_output=True, text=True).stdout
    except ValueError:
        return None
    return (int(left), int(top)) if shown == "1" and win in clients.split() else None


def show(png, at, cols, rows):
    """iTerm2's inline image, through tmux's passthrough (allow-passthrough on): tmux keeps no pictures, so the image
    goes straight on to iTerm2, which draws it at its own cursor. The passthrough carries the move to the pane's corner
    inside a cursor save and restore, which leaves iTerm2's cursor where tmux believes it is. Stretched to exactly
    the pane's cells, so a click's cell maps straight onto the picture."""
    left, top = at
    inner = (b"\x1b7\x1b[%d;%dH\x1b]1337;File=inline=1;width=%d;height=%d;preserveAspectRatio=0:" % (top + 1, left + 1, cols, rows)
             + png + b"\x07\x1b8")
    out.write(b"\x1bPtmux;" + inner.replace(b"\x1b", b"\x1b\x1b") + b"\x1b\\")
    out.flush()


def at_cell(row, col, text):
    """Plain text at a cell of the pane: tmux places it, so no passthrough is needed."""
    out.write(b"\x1b[%d;%dH" % (row, col) + text)
    out.flush()


def status_line(text, cols, rows):
    """The pane's last row, which the picture leaves free: what the last action did, and the hint."""
    room = max(0, cols - 1)
    left = text[: max(0, room - len(HINT) - 2)]
    line = left + " " * max(1, room - len(left) - len(HINT)) + HINT
    at_cell(rows, 1, b"\x1b[2K\x1b[2m" + line[:room].encode() + b"\x1b[0m")


def help_card(cols, rows):
    out.write(b"\x1b[2J")
    for i, line in enumerate(HELP[: rows - 1]):
        at_cell(i + 2, 3, (b"\x1b[1m" if i == 0 else b"") + line[: cols - 4].encode() + b"\x1b[0m")


def send(action):
    with open(os.path.join(wire, "input.jsonl"), "a") as f:
        f.write(json.dumps(action) + "\n")


def main():
    old = termios.tcgetattr(0)
    tty.setcbreak(0)
    # Mouse presses as SGR reports (\e[<b;x;yM), which tmux hands to a pane that asks for them.
    out.write(b"\x1b[?25l\x1b[2J\x1b[?1000h\x1b[?1006h")
    out.flush()
    open(os.path.join(wire, "input.jsonl"), "w").close()
    ready, frames, at, shown, last_frame, last_beat = None, [], 0, False, 0.0, 0.0
    last_click = (0.0, -9, -9)
    buf = b""
    # Until when a click's mark holds the picture still; the status line as last drawn and as last asked for.
    pending, drawn_status, status, is_help = 0.0, None, "", False
    status_path = os.path.join(wire, "status.txt")
    try:
        os.remove(status_path)
    except OSError:
        pass
    try:
        while True:
            cols, rows, xpx, ypx = size()
            now = time.time()
            if now - last_beat > 0.5:
                last_beat = now
                beat = {"cols": cols, "rows": rows, "ts": int(now)}
                if xpx and ypx:
                    beat.update(cellW=xpx / cols, cellH=ypx / rows)
                write_json(os.path.join(wire, "screen.json"), beat)
            try:
                with open(os.path.join(wire, "ready.txt")) as f:
                    tag = f.read().strip()
            except OSError:
                tag = ""
            if tag and tag != ready:
                n = int(tag.split()[0]) if tag.split()[0].isdigit() else 0
                names = [f"frame-{k}.png" for k in range(n)] if n else ["view.png"]
                try:
                    loaded = [base64.b64encode(open(os.path.join(wire, x), "rb").read()) for x in names]
                    ready, frames, at, last_frame, pending = tag, loaded, 0, 0.0, 0.0
                except OSError:
                    pass  # mid-swap: read it next tick
            try:
                with open(status_path) as f:
                    status = f.read().strip()
            except OSError:
                pass
            if not is_help and (status, cols, rows) != drawn_status:
                drawn_status = (status, cols, rows)
                status_line(status, cols, rows)
            if is_help:
                pass
            elif frames and now - last_frame >= FRAME_SECONDS and now >= pending:
                last_frame = now
                corner = place()
                if corner:
                    if not shown:
                        out.write(b"\x1b[2J")
                        drawn_status = None
                    shown = True
                    # One row short of the pane: an image reaching the last row scrolls it.
                    show(frames[at % len(frames)], corner, cols, rows - 1)
                    at = (at + 1) % len(frames)
                else:
                    shown = False
            elif not frames:
                out.write(b"\x1b[HWaiting for the Team Wire mod to draw (open /team in Claude)...")
                out.flush()

            if select.select([0], [], [], TICK)[0]:
                buf += os.read(0, 4096)
            while buf:
                if buf.startswith(b"\x1b[<"):
                    end = next((i for i, c in enumerate(buf) if c in b"Mm"), -1)
                    if end < 0:
                        break
                    report, kind, buf = buf[3:end].decode(), buf[end:end + 1], buf[end + 1:]
                    b, x, y = (int(v) for v in report.split(";"))
                    if b == 0 and kind == b"M" and y <= rows - 1:
                        t = time.time()
                        double = t - last_click[0] < DOUBLE_SECONDS and abs(x - last_click[1]) <= 1 and abs(y - last_click[2]) <= 1
                        last_click = (0.0, -9, -9) if double else (t, x, y)
                        # The cell's middle, as a share of the picture: the mod scales it to its own pixels.
                        if is_help:
                            is_help, shown, drawn_status = False, False, None
                            continue
                        send({"fx": (x - 0.5) / cols, "fy": (y - 0.5) / (rows - 1), "double": double})
                        if shown:
                            # Marked at once, and the loop held, so the click is seen before its picture is drawn.
                            at_cell(y, x, b"\x1b[1;38;5;208m\xe2\x97\x89\x1b[0m")
                            status_line("...", cols, rows)
                            # The mod's answer replaces the dots when it lands.
                            drawn_status, pending, status = ("...", cols, rows), time.time() + PENDING_SECONDS, "..."
                            try:
                                os.remove(status_path)
                            except OSError:
                                pass
                    continue
                if is_help:
                    # Any key leaves the help card; q still closes the screen.
                    if buf[:1] == b"q":
                        return
                    buf, is_help, shown, drawn_status = b"", False, False, None
                    continue
                if buf[:1] == b"?":
                    buf, is_help, shown = buf[1:], True, False
                    help_card(cols, rows)
                    continue
                for seq in sorted(KEYS, key=len, reverse=True):
                    if buf.startswith(seq.encode()) and (seq != "\x1b" or len(buf) == 1):
                        send({"key": KEYS[seq]})
                        buf = buf[len(seq):]
                        break
                else:
                    if buf[:1] == b"q":
                        return
                    # Anything else (an unknown escape, a stray key) is dropped a byte at a time.
                    buf = buf[1:]
    finally:
        out.write(b"\x1b[?1000l\x1b[?1006l\x1b[?25h")
        out.flush()
        termios.tcsetattr(0, termios.TCSADRAIN, old)
        try:
            os.remove(os.path.join(wire, "screen.json"))
        except OSError:
            pass


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
