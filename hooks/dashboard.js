"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.flatSvg = exports.spriteSvg = exports.dashboardSvg = exports.sceneAspect = exports.RAIL_H = void 0;
var model_1 = require("./model");
var views_1 = require("./views");
var VIEW_TABS = [['map', 'Map'], ['office', 'Office'], ['factory', 'Factory']];
var FILTER_TABS = [['all', 'All'], ['handoff', 'Hand-offs'], ['problem', 'Problems']];
var PAD = 16;
// A project's own label, else the kind: "code-review" reads "Code review".
var railLabel = function (k) { var _a; return (_a = (0, model_1.labelOf)(k)) !== null && _a !== void 0 ? _a : (0, views_1.titled)(k); };
var KIND_VAR = { handoff: 'backend', problem: 'bad', approve: 'ok', merge: 'lead', note: 'muted' };
var STATUS_VAR = { working: 'ok', waiting: 'warn', free: 'idle' };
var v = function (a) { return "var(--".concat(a, ")"); };
// Approximate glyph widths for the system fonts Chrome draws with; used to cut text before it overflows.
var fit = function (s, px, size, isMono) {
    if (isMono === void 0) { isMono = false; }
    var max = Math.floor(px / (size * (isMono ? 0.6 : 0.55)));
    var flat = s.replace(/\s+/g, ' ').trim();
    return flat.length > max ? flat.slice(0, Math.max(1, max - 1)) + '…' : flat;
};
// A row of pill buttons ending at `right`, the active one filled; each records its hit.
var pills = function (items, active, right, y, prefix, hits, size) {
    if (size === void 0) { size = 11; }
    var widths = items.map(function (_a) {
        var label = _a[1];
        return label.length * size * 0.62 + 20;
    });
    var x = right - widths.reduce(function (a, b) { return a + b; }, 0) - 6 * (items.length - 1);
    var s = '';
    items.forEach(function (_a, i) {
        var key = _a[0], label = _a[1];
        var w = widths[i];
        var h = size + 11;
        var on = key === active;
        s += "<rect x=\"".concat(x.toFixed(1), "\" y=\"").concat(y, "\" width=\"").concat(w.toFixed(1), "\" height=\"").concat(h, "\" rx=\"").concat(h / 2, "\" fill=\"").concat(on ? 'var(--fg)' : 'var(--surface)', "\" stroke=\"var(--line)\"/>");
        s += "<text x=\"".concat((x + w / 2).toFixed(1), "\" y=\"").concat(y + h / 2 + size * 0.36, "\" text-anchor=\"middle\" class=\"tab\" style=\"font-size:").concat(size, "px;fill:").concat(on ? 'var(--bg)' : 'var(--fg)', "\">").concat((0, views_1.esc)(label), "</text>");
        hits.push({ x: x, y: y, w: w, h: h, action: "".concat(prefix, ":").concat(key) });
        x += w + 6;
    });
    return s;
};
var card = function (x, y, w, h) {
    return "<rect x=\"".concat(x, "\" y=\"").concat(y, "\" width=\"").concat(w, "\" height=\"").concat(h, "\" rx=\"14\" fill=\"var(--surface)\" stroke=\"var(--line)\"/>");
};
var header = function (team, view, w, flash, replay, hits, isDemo) {
    if (isDemo === void 0) { isDemo = false; }
    var s = "<text x=\"".concat(PAD, "\" y=\"").concat(PAD + 18, "\" class=\"h1\">Team Wire</text>");
    s += pills(VIEW_TABS, view, w - PAD, PAD, 'view', hits, 12);
    // Needs attention: a red button per flagged teammate, right of the summary; a fresh one blinks.
    var flagged = team.members.filter(function (m) { return m.isFlagged; });
    var x = w - PAD;
    var room = Math.max(0, w - 2 * PAD - 360);
    var shown = [];
    for (var _i = 0, _a = __spreadArray([], flagged, true).reverse(); _i < _a.length; _i++) {
        var m = _a[_i];
        var label = "\u25B2 ".concat((0, model_1.shortName)(m.name));
        var bw = label.length * 6.6 + 18;
        if (w - PAD - (x - bw) > room)
            break;
        x -= bw;
        shown.unshift("<g".concat(flash.includes(m.name) ? ' class="blink"' : '', "><rect x=\"").concat(x.toFixed(1), "\" y=\"").concat(PAD + 27, "\" width=\"").concat(bw.toFixed(1), "\" height=\"18\" rx=\"9\" fill=\"var(--bad)\" fill-opacity=\".18\" stroke=\"var(--bad)\"/><text x=\"").concat((x + bw / 2).toFixed(1), "\" y=\"").concat(PAD + 40, "\" text-anchor=\"middle\" class=\"tab\" style=\"font-size:10.5px;fill:var(--bad)\">").concat((0, views_1.esc)(label), "</text></g>"));
        hits.push({ x: x, y: PAD + 27, w: bw, h: 18, action: "who:".concat(m.name) });
        x -= 6;
    }
    var summaryW = (shown.length ? x : w - PAD) - PAD - 8;
    // Replaying or a demo: say so loudly, so neither is read as the team's present.
    var bx = PAD + 128;
    for (var _b = 0, _c = [
        [replay ? "REPLAY ".concat(replay.slice(5, 10), " ").concat((0, model_1.hhmm)(replay), " UTC") : '', 'var(--warn)'],
        [isDemo ? 'DEMO · not the real log' : '', 'var(--backend)'],
    ]; _b < _c.length; _b++) {
        var _d = _c[_b], label = _d[0], fill = _d[1];
        if (!label)
            continue;
        var bw = label.length * 7 + 20;
        s += "<rect x=\"".concat(bx, "\" y=\"").concat(PAD + 2, "\" width=\"").concat(bw, "\" height=\"22\" rx=\"11\" fill=\"").concat(fill, "\"/>");
        s += "<text x=\"".concat(bx + 10, "\" y=\"").concat(PAD + 17, "\" class=\"tab\" style=\"font-size:11.5px;fill:var(--bg);font-weight:700\">").concat((0, views_1.esc)(label), "</text>");
        bx += bw + 8;
    }
    s += "<text x=\"".concat(PAD, "\" y=\"").concat(PAD + 38, "\" class=\"sub\">").concat((0, views_1.esc)(fit("".concat((0, views_1.summary)(team), " \u00B7 ").concat(replay ? 'as at' : 'updated', " ").concat((0, model_1.hhmm)(replay || team.lastTs), " UTC"), summaryW, 12)), "</text>");
    return s + shown.join('');
};
// A wait this long is worth a look, and this long is where the line is stuck.
var SLOW_MS = 30 * 60 * 1000;
var STUCK_MS = 2 * 60 * 60 * 1000;
var waitVar = function (msv) { return (msv >= STUCK_MS ? 'bad' : msv >= SLOW_MS ? 'warn' : 'muted'); };
exports.RAIL_H = 54;
// One step per task kind: the bar fills with the share of issues past it; amber while any issue is in it. Beneath,
// what queues there: how many are ready and unstarted and the longest wait, or else the usual wait. The step where
// work has waited longest, past half an hour, is shaded: the bottleneck.
var rail = function (team, y, w, stage, hits) {
    var LINE = (0, model_1.line)();
    var step = (w - 2 * PAD) / LINE.length;
    var times = (0, model_1.stageTimes)(team);
    var worst = LINE.reduce(function (a, k) { return (times[k].oldestMs > (a ? times[a].oldestMs : SLOW_MS - 1) ? k : a); }, '');
    var s = '';
    LINE.forEach(function (k, i) {
        var t = times[k];
        var having = team.issues.filter(function (x) { return x.stages[k] !== undefined; });
        var done = having.filter(function (x) { return x.stages[k] === 'done'; }).length;
        var running = having.filter(function (x) { return x.stages[k] === 'run'; }).length;
        var x = PAD + i * step;
        var bw = step - 6;
        hits.push({ x: x - 3, y: y - 6, w: step, h: exports.RAIL_H, action: "stage:".concat(k) });
        if (k === worst)
            s += "<rect x=\"".concat((x - 4).toFixed(1), "\" y=\"").concat(y - 6, "\" width=\"").concat((bw + 8).toFixed(1), "\" height=\"").concat(exports.RAIL_H, "\" rx=\"6\" fill=\"var(--").concat(waitVar(t.oldestMs), ")\" fill-opacity=\".12\"/>");
        if (k === stage)
            s += "<rect x=\"".concat((x - 4).toFixed(1), "\" y=\"").concat(y - 6, "\" width=\"").concat((bw + 8).toFixed(1), "\" height=\"").concat(exports.RAIL_H, "\" rx=\"6\" fill=\"var(--fg)\" fill-opacity=\".08\" stroke=\"var(--fg)\" stroke-opacity=\".5\"/>");
        s += "<rect x=\"".concat(x.toFixed(1), "\" y=\"").concat(y, "\" width=\"").concat(bw.toFixed(1), "\" height=\"5\" rx=\"2.5\" fill=\"var(--line)\"/>");
        if (having.length)
            s += "<rect x=\"".concat(x.toFixed(1), "\" y=\"").concat(y, "\" width=\"").concat(((bw * done) / having.length).toFixed(1), "\" height=\"5\" rx=\"2.5\" fill=\"var(--ok)\"/>");
        if (running)
            s += "<rect x=\"".concat(x.toFixed(1), "\" y=\"").concat(y, "\" width=\"").concat(bw.toFixed(1), "\" height=\"5\" rx=\"2.5\" fill=\"var(--warn)\" fill-opacity=\".55\" class=\"pulse\"/>");
        s += "<text x=\"".concat(x.toFixed(1), "\" y=\"").concat(y + 18, "\" class=\"rl\">").concat((0, views_1.esc)(fit(railLabel(k), bw, 10, true)), "</text>");
        s += "<text x=\"".concat(x.toFixed(1), "\" y=\"").concat(y + 31, "\" class=\"rn\">").concat(running ? "<tspan style=\"fill:var(--warn)\">\u25B6".concat(running, "</tspan> ") : '').concat(done, "/").concat(having.length, "</text>");
        var queue = t.waiting
            ? "<tspan style=\"fill:var(--".concat(waitVar(t.oldestMs), ")\">").concat(t.waiting, " ready ").concat((0, model_1.dur)(t.oldestMs), "</tspan>")
            : t.started ? "wait ~".concat((0, model_1.dur)(t.avgWaitMs)) : '';
        if (queue)
            s += "<text x=\"".concat(x.toFixed(1), "\" y=\"").concat(y + 43, "\" class=\"rn\">").concat(queue, "</text>");
    });
    return s;
};
var avatar = function (m, name, x, y, r) {
    var _a;
    var area = (_a = m === null || m === void 0 ? void 0 : m.area) !== null && _a !== void 0 ? _a : 'lead';
    return "<circle cx=\"".concat(x, "\" cy=\"").concat(y, "\" r=\"").concat(r, "\" fill=\"").concat(v(area), "\"/><text x=\"").concat(x, "\" y=\"").concat((y + r * 0.36).toFixed(1), "\" class=\"ini\" style=\"font-size:").concat(Math.round(r * 0.9), "px\" text-anchor=\"middle\">").concat((0, views_1.esc)((0, model_1.initials)(name)), "</text>");
};
var badge = function (team, sel, x, y, w, h, hits) {
    var _a;
    var m = (_a = team.members.find(function (n) { return n.name === sel; })) !== null && _a !== void 0 ? _a : team.members[0];
    if (!m)
        return '';
    var last = __spreadArray([], team.messages, true).reverse().find(function (x2) { return x2.from === m.name || x2.to === m.name; });
    var status = m.isFlagged ? 'needs attention' : m.status;
    var sv = m.isFlagged ? 'bad' : STATUS_VAR[m.status];
    var inner = w - 2 * PAD;
    var s = card(x, y, w, h);
    s += "<rect x=\"".concat(x, "\" y=\"").concat(y, "\" width=\"").concat(w, "\" height=\"8\" rx=\"4\" fill=\"").concat(v(m.area), "\"/>");
    s += avatar(m, m.name, x + PAD + 22, y + 44, 22);
    s += "<text x=\"".concat(x + PAD + 54, "\" y=\"").concat(y + 40, "\" class=\"nm2\">").concat((0, views_1.esc)(fit(m.name, inner - 60, 16)), "</text>");
    s += "<text x=\"".concat(x + PAD + 54, "\" y=\"").concat(y + 58, "\" class=\"sm\">").concat((0, views_1.esc)(views_1.AREA_NAME[m.area]), "</text>");
    var pillW = status.length * 7 + 26;
    s += "<g transform=\"translate(".concat(x + w - PAD - pillW, " ").concat(y + 28, ")\"><rect width=\"").concat(pillW, "\" height=\"22\" rx=\"11\" fill=\"var(--bg)\" stroke=\"var(--line)\"/><circle cx=\"12\" cy=\"11\" r=\"4\" fill=\"var(--").concat(sv, ")\"/><text x=\"21\" y=\"15\" class=\"pill\">").concat((0, views_1.esc)(status), "</text></g>");
    var rows = [
        ['Task', m.task ? m.task.replace(/^#\d+\s+/, "#".concat(m.issue, " ")) : m.name === 'lead' ? 'running the team' : 'none'],
        ['Branch', m.name === 'lead' ? 'main' : m.issue !== undefined ? "team/".concat(m.name, "/").concat(m.issue) : '–'],
        ['Last said', last ? "".concat((0, model_1.hhmm)(last.ts), " ").concat(last.text) : 'nothing yet'],
    ];
    rows.forEach(function (_a, i) {
        var k = _a[0], val = _a[1];
        var ry = y + 88 + i * 20;
        if (ry > y + h - 8)
            return;
        s += "<text x=\"".concat(x + PAD, "\" y=\"").concat(ry, "\" class=\"k\">").concat(k, "</text><text x=\"").concat(x + PAD + 72, "\" y=\"").concat(ry, "\" class=\"val\">").concat((0, views_1.esc)(fit(val, inner - 72, 12)), "</text>");
    });
    // Takes you to the teammate's own terminal in the team window.
    var bw = 112;
    var bx = x + w - PAD - bw;
    var by = y + 62;
    s += "<rect x=\"".concat(bx, "\" y=\"").concat(by, "\" width=\"").concat(bw, "\" height=\"22\" rx=\"11\" fill=\"var(--surface)\" stroke=\"var(--").concat(m.area === 'lead' ? 'lead' : m.area, ")\"/>");
    s += "<text x=\"".concat(bx + bw / 2, "\" y=\"").concat(by + 15, "\" text-anchor=\"middle\" class=\"tab\" style=\"font-size:11px;fill:var(--fg)\">Open pane \u2197</text>");
    hits.push({ x: x, y: y, w: w, h: h, action: "who:".concat(m.name) });
    hits.push({ x: bx, y: by, w: bw, h: 22, action: "jump:".concat(m.name) });
    // The Task row opens the issue it names.
    if (m.issue !== undefined && m.name !== 'lead')
        hits.push({ x: x + PAD, y: y + 76, w: inner - 120, h: 18, action: "issue:".concat(m.issue) });
    return s;
};
var chat = function (team, sel, filter, x, y, w, h, hits) {
    var shown = team.messages
        .filter(function (m) { return filter === 'all' || (filter === 'handoff' ? m.kind === 'handoff' || m.kind === 'approve' : m.kind === 'problem'); })
        .filter(function (m) { return sel === 'lead' || m.from === sel || m.to === sel; })
        .reverse();
    var s = card(x, y, w, h);
    s += "<text x=\"".concat(x + PAD, "\" y=\"").concat(y + 26, "\" class=\"nm2\" style=\"font-size:14px\">Team chat").concat(sel === 'lead' ? '' : " <tspan class=\"sm\" style=\"font-size:11px\">\u00B7 ".concat((0, views_1.esc)((0, model_1.shortName)(sel)), "</tspan>"), "</text>");
    s += pills(FILTER_TABS, filter, x + w - PAD, y + 11, 'filter', hits, 10);
    s += "<line x1=\"".concat(x, "\" x2=\"").concat(x + w, "\" y1=\"").concat(y + 40, "\" y2=\"").concat(y + 40, "\" stroke=\"var(--line)\"/>");
    var rowH = 40;
    var room = Math.max(0, Math.floor((h - 52) / rowH));
    if (!shown.length)
        s += "<text x=\"".concat(x + PAD, "\" y=\"").concat(y + 66, "\" class=\"sm\">Nothing here yet.</text>");
    shown.slice(0, room).forEach(function (m, i) {
        var ry = y + 52 + i * rowH;
        var from = team.members.find(function (n) { return n.name === m.from; });
        s += avatar(from, m.from, x + PAD + 12, ry + 13, 12);
        var tx = x + PAD + 32;
        var meta = "".concat((0, model_1.shortName)(m.from), " \u2192 ").concat(m.to === 'lead' ? 'lead' : (0, model_1.shortName)(m.to), " \u00B7 ").concat((0, model_1.hhmm)(m.ts));
        s += "<text x=\"".concat(tx, "\" y=\"").concat(ry + 10, "\" class=\"meta\">").concat((0, views_1.esc)(meta), "</text>");
        var tagW = views_1.KIND_LABEL[m.kind].length * 6 + 14;
        var tagX = tx + meta.length * 6.2 + 8;
        if (tagX + tagW < x + w - PAD)
            s += "<g transform=\"translate(".concat(tagX.toFixed(1), " ").concat(ry, ")\"><rect width=\"").concat(tagW, "\" height=\"14\" rx=\"7\" fill=\"none\" stroke=\"var(--").concat(KIND_VAR[m.kind], ")\"/><text x=\"").concat(tagW / 2, "\" y=\"10.5\" class=\"tag\" text-anchor=\"middle\" style=\"fill:var(--").concat(KIND_VAR[m.kind], ")\">").concat(views_1.KIND_LABEL[m.kind], "</text></g>");
        s += "<text x=\"".concat(tx, "\" y=\"").concat(ry + 28, "\" class=\"msg\"").concat(m.kind === 'problem' ? ' style="fill:var(--bad)"' : '', ">").concat((0, views_1.esc)(fit(m.text, x + w - PAD - tx, 12.5)), "</text>");
        hits.push({ x: x, y: ry - 4, w: w, h: rowH, action: "who:".concat(m.from) });
    });
    return s;
};
var STAGE_VAR = { done: 'ok', run: 'warn', wait: 'idle' };
// The chat card's place, while a rail step is picked: that step's issues, running first, with who has each.
var stageCard = function (team, stage, x, y, w, h, hits) {
    var order = { run: 0, wait: 1, done: 2 };
    var rows = team.issues
        .filter(function (i) { return i.stages[stage] !== undefined; })
        .sort(function (a, b) { return order[a.stages[stage]] - order[b.stages[stage]] || a.issue - b.issue; });
    var s = card(x, y, w, h);
    s += "<text x=\"".concat(x + PAD, "\" y=\"").concat(y + 26, "\" class=\"nm2\" style=\"font-size:14px\">").concat((0, views_1.esc)(railLabel(stage)), "</text>");
    var t = (0, model_1.stageTimes)(team)[stage];
    var stats = !t ? '' : [
        t.started ? "waits ~".concat((0, model_1.dur)(t.avgWaitMs)) : '',
        t.finished ? "takes ~".concat((0, model_1.dur)(t.avgWorkMs)) : '',
        t.finished ? "".concat(t.finished, " done") : '',
    ].filter(Boolean).join(' · ');
    s += "<text x=\"".concat(x + w - PAD, "\" y=\"").concat(y + 26, "\" class=\"sm\" text-anchor=\"end\">").concat((0, views_1.esc)(stats || 'click the step again to close'), "</text>");
    s += "<line x1=\"".concat(x, "\" x2=\"").concat(x + w, "\" y1=\"").concat(y + 40, "\" y2=\"").concat(y + 40, "\" stroke=\"var(--line)\"/>");
    hits.push({ x: x, y: y, w: w, h: 40, action: "stage:".concat(stage) });
    var rowH = 30;
    // Room for the rows, and for the "and n more" line under them when they don't all fit.
    var fits = Math.floor((h - 52) / rowH);
    var room = Math.max(0, rows.length > fits ? Math.floor((h - 52 - 14) / rowH) : fits);
    if (!rows.length)
        s += "<text x=\"".concat(x + PAD, "\" y=\"").concat(y + 66, "\" class=\"sm\">No issue has this step.</text>");
    rows.slice(0, room).forEach(function (i, n) {
        var ry = y + 52 + n * rowH;
        var st = i.stages[stage];
        var who = team.members.find(function (m) { return m.issue === i.issue && m.kind === stage; });
        s += "<circle cx=\"".concat(x + PAD + 5, "\" cy=\"").concat(ry + 10, "\" r=\"5\" fill=\"var(--").concat(STAGE_VAR[st], ")\"/>");
        s += "<text x=\"".concat(x + PAD + 18, "\" y=\"").concat(ry + 14, "\" class=\"val\" style=\"font-weight:600\">#").concat(i.issue, "</text>");
        // The dot gives the state; the words go to the title, the one thing a narrow card must show.
        var step = i.steps.find(function (x2) { return x2.kind === stage && x2.state === st; });
        var now = Date.parse(team.lastTs);
        var tail = i.isRework && st !== 'done' ? ' · rework' : '';
        // How long it has run, or waited since it was ready: its own column, so a long title never hides it.
        var age = st === 'run' && (step === null || step === void 0 ? void 0 : step.startTs) ? "\u25B6 ".concat((0, model_1.dur)(now - Date.parse(step.startTs)))
            : st === 'wait' && (step === null || step === void 0 ? void 0 : step.readyTs) ? "ready ".concat((0, model_1.dur)(now - Date.parse(step.readyTs))) : '';
        var ageW = age ? age.length * 6.3 + 10 : 0;
        var right = x + w - PAD - (who ? 110 : 0);
        if (age) {
            var waited = st === 'wait' ? now - Date.parse(step.readyTs) : 0;
            s += "<text x=\"".concat(right, "\" y=\"").concat(ry + 14, "\" class=\"meta\" text-anchor=\"end\" style=\"fill:var(--").concat(st === 'run' ? 'warn' : waitVar(waited), ")\">").concat((0, views_1.esc)(age), "</text>");
        }
        s += "<text x=\"".concat(x + PAD + 62, "\" y=\"").concat(ry + 14, "\" class=\"val\">").concat((0, views_1.esc)(fit(i.title + tail, right - ageW - x - PAD - 62, 12)), "</text>");
        hits.push({ x: x, y: ry - 4, w: w, h: rowH, action: "issue:".concat(i.issue) });
        if (who) {
            s += avatar(who, who.name, x + w - PAD - 10, ry + 10, 10);
            s += "<text x=\"".concat(x + w - PAD - 26, "\" y=\"").concat(ry + 14, "\" class=\"meta\" text-anchor=\"end\">").concat((0, views_1.esc)((0, model_1.shortName)(who.name)), "</text>");
            hits.push({ x: x + w - PAD - 110, y: ry - 4, w: 110, h: rowH, action: "who:".concat(who.name) });
        }
    });
    if (rows.length > room)
        s += "<text x=\"".concat(x + PAD, "\" y=\"").concat(y + h - 10, "\" class=\"sm\">and ").concat(rows.length - room, " more</text>");
    return s;
};
var when = function (ts) { return (ts ? (0, model_1.hhmm)(ts) : ''); };
// The chat card's place, while an issue is picked: every step with who had it and when, then what was said about it.
var issueCard = function (team, issue, x, y, w, h, hits, site) {
    if (site === void 0) { site = 'GitLab'; }
    var s = card(x, y, w, h);
    var gw = 120;
    s += "<text x=\"".concat(x + PAD, "\" y=\"").concat(y + 26, "\" class=\"nm2\" style=\"font-size:14px\">#").concat(issue.issue, " <tspan class=\"sm\" style=\"font-size:12px\">").concat((0, views_1.esc)(fit(issue.title, w - 2 * PAD - gw - 50, 12)), "</tspan></text>");
    s += "<rect x=\"".concat(x + w - PAD - gw, "\" y=\"").concat(y + 11, "\" width=\"").concat(gw, "\" height=\"21\" rx=\"10.5\" fill=\"var(--surface)\" stroke=\"var(--line)\"/>");
    s += "<text x=\"".concat(x + w - PAD - gw / 2, "\" y=\"").concat(y + 25.5, "\" text-anchor=\"middle\" class=\"tab\" style=\"font-size:10.5px;fill:var(--fg)\">").concat((0, views_1.esc)("Open in ".concat(site, " \u2197")), "</text>");
    s += "<line x1=\"".concat(x, "\" x2=\"").concat(x + w, "\" y1=\"").concat(y + 40, "\" y2=\"").concat(y + 40, "\" stroke=\"var(--line)\"/>");
    hits.push({ x: x, y: y, w: w, h: 40, action: "issue:".concat(issue.issue) });
    hits.push({ x: x + w - PAD - gw, y: y + 11, w: gw, h: 21, action: "open:".concat(issue.issue) });
    var rowH = 24;
    var said = team.messages.filter(function (m) { return new RegExp("#".concat(issue.issue, "\\b")).test(m.text); }).reverse();
    var stepRoom = Math.max(1, Math.floor((h - 72 - (said.length ? 80 : 0)) / rowH));
    var now = Date.parse(team.lastTs);
    var ms = function (ts) { return (ts ? Date.parse(ts) : NaN); };
    // Where it waited longest: a finished wait, or one still going.
    var waits = issue.steps
        .filter(function (st) { return st.readyTs && (st.startTs || st.state === 'wait'); })
        .map(function (st) { return ({ kind: st.kind, ms: (st.startTs ? ms(st.startTs) : now) - ms(st.readyTs) }); })
        .sort(function (a, b) { return b.ms - a.ms; });
    var open = issue.openTs ? "".concat(issue.shipTs ? 'Shipped in' : 'Open', " ").concat((0, model_1.dur)((issue.shipTs ? ms(issue.shipTs) : now) - ms(issue.openTs))) : '';
    var top = waits[0] && waits[0].ms >= 60000 ? waits[0] : undefined;
    var longest = top ? "".concat(open ? '· ' : '', "longest wait: ").concat(railLabel(top.kind), " ").concat((0, model_1.dur)(top.ms)) : '';
    if (open || longest)
        s += "<text x=\"".concat(x + PAD, "\" y=\"").concat(y + 58, "\" class=\"meta\">").concat((0, views_1.esc)(open)).concat(top ? "<tspan dx=\"".concat(open ? 6 : 0, "\" style=\"fill:var(--").concat(waitVar(top.ms), ")\">").concat((0, views_1.esc)(longest), "</tspan>") : '', "</text>");
    var ry = y + 72;
    issue.steps.slice(0, stepRoom).forEach(function (st) {
        s += "<circle cx=\"".concat(x + PAD + 5, "\" cy=\"").concat(ry + 8, "\" r=\"5\" fill=\"var(--").concat(STAGE_VAR[st.state], ")\"").concat(st.state === 'run' ? ' class="pulse"' : '', "/>");
        s += "<text x=\"".concat(x + PAD + 18, "\" y=\"").concat(ry + 12, "\" class=\"val\">").concat((0, views_1.esc)(railLabel(st.kind)), "</text>");
        var took = st.startTs && st.doneTs ? " \u00B7 ".concat((0, model_1.dur)(ms(st.doneTs) - ms(st.startTs))) : '';
        var time = st.state === 'done' ? "".concat(when(st.startTs) || '…', " \u2192 ").concat(when(st.doneTs)).concat(took)
            : st.state === 'run' ? (st.startTs ? "since ".concat(when(st.startTs), " \u00B7 ").concat((0, model_1.dur)(now - ms(st.startTs))) : 'running')
                : st.readyTs ? "ready ".concat((0, model_1.dur)(now - ms(st.readyTs))) : 'blocked';
        s += "<text x=\"".concat(x + PAD + 110, "\" y=\"").concat(ry + 12, "\" class=\"meta\">").concat((0, views_1.esc)(time), "</text>");
        if (st.owner) {
            var m = team.members.find(function (n) { return n.name === st.owner; });
            s += avatar(m, st.owner, x + w - PAD - 9, ry + 8, 9);
            s += "<text x=\"".concat(x + w - PAD - 24, "\" y=\"").concat(ry + 12, "\" class=\"meta\" text-anchor=\"end\">").concat((0, views_1.esc)((0, model_1.shortName)(st.owner)), "</text>");
            hits.push({ x: x, y: ry - 4, w: w, h: rowH, action: "who:".concat(st.owner) });
        }
        ry += rowH;
    });
    if (issue.steps.length > stepRoom) {
        s += "<text x=\"".concat(x + PAD + 18, "\" y=\"").concat(ry + 8, "\" class=\"sm\">and ").concat(issue.steps.length - stepRoom, " more steps</text>");
        ry += 16;
    }
    var sayRoom = Math.floor((y + h - ry - 30) / 18);
    if (said.length && sayRoom > 0) {
        s += "<text x=\"".concat(x + PAD, "\" y=\"").concat(ry + 18, "\" class=\"k\">Said about it</text>");
        ry += 26;
        said.slice(0, sayRoom).forEach(function (m) {
            s += "<text x=\"".concat(x + PAD, "\" y=\"").concat(ry + 10, "\" class=\"meta\">").concat((0, views_1.esc)(fit("".concat((0, model_1.hhmm)(m.ts), " ").concat((0, model_1.shortName)(m.from), "\u2192").concat((0, model_1.shortName)(m.to)), 142, 10.5, true)), "</text>");
            s += "<text x=\"".concat(x + PAD + 150, "\" y=\"").concat(ry + 10, "\" class=\"msg\" style=\"font-size:11.5px").concat(m.kind === 'problem' ? ';fill:var(--bad)' : '', "\">").concat((0, views_1.esc)(fit(m.text, w - 2 * PAD - 150, 11.5)), "</text>");
            hits.push({ x: x, y: ry - 4, w: w, h: 18, action: "who:".concat(m.from) });
            ry += 18;
        });
    }
    return s;
};
// The day as a strip: how busy each slice of the log was, where the replay stands, and the way back to live.
var TIMELINE_H = 30;
var timelineStrip = function (tl, y, w, hits) {
    var liveW = 96;
    var x0 = PAD + 44;
    var bw = w - x0 - PAD - liveW - 12;
    var from = Date.parse(tl.from);
    var span = Math.max(1, Date.parse(tl.to) - from);
    var peak = Math.max.apply(Math, __spreadArray([1], tl.buckets, false));
    var s = "<text x=\"".concat(PAD, "\" y=\"").concat(y + 19, "\" class=\"meta\">").concat((0, views_1.esc)((0, model_1.hhmm)(tl.from)), "</text>");
    s += "<rect x=\"".concat(x0, "\" y=\"").concat(y + 4, "\" width=\"").concat(bw, "\" height=\"22\" rx=\"4\" fill=\"var(--surface)\" stroke=\"var(--line)\"/>");
    var n = tl.buckets.length;
    tl.buckets.forEach(function (c, i) {
        if (!c)
            return;
        var bh = Math.max(2, (c / peak) * 16);
        s += "<rect x=\"".concat((x0 + (i / n) * bw).toFixed(1), "\" y=\"").concat((y + 23 - bh).toFixed(1), "\" width=\"").concat(Math.max(1, bw / n - 1).toFixed(1), "\" height=\"").concat(bh.toFixed(1), "\" fill=\"var(--muted)\" fill-opacity=\".55\"/>");
    });
    // Hours, so a time can be found by eye.
    for (var t = Math.ceil(from / 3600000) * 3600000; t < from + span; t += 3600000 * Math.max(1, Math.round(span / 3600000 / 12))) {
        var hx = x0 + ((t - from) / span) * bw;
        s += "<line x1=\"".concat(hx.toFixed(1), "\" x2=\"").concat(hx.toFixed(1), "\" y1=\"").concat(y + 4, "\" y2=\"").concat(y + 8, "\" stroke=\"var(--muted)\"/>");
    }
    var at = tl.at ? Math.min(1, Math.max(0, (Date.parse(tl.at) - from) / span)) : 1;
    var mx = x0 + at * bw;
    s += "<rect x=\"".concat(x0, "\" y=\"").concat(y + 4, "\" width=\"").concat((mx - x0).toFixed(1), "\" height=\"22\" rx=\"4\" fill=\"var(--").concat(tl.at ? 'warn' : 'ok', ")\" fill-opacity=\".12\"/>");
    s += "<line x1=\"".concat(mx.toFixed(1), "\" x2=\"").concat(mx.toFixed(1), "\" y1=\"").concat(y + 1, "\" y2=\"").concat(y + 29, "\" stroke=\"var(--").concat(tl.at ? 'warn' : 'ok', ")\" stroke-width=\"2.5\"/>");
    hits.push({ x: x0, y: y, w: bw, h: TIMELINE_H, action: 'time:' });
    var lx = w - PAD - liveW;
    s += "<rect x=\"".concat(lx, "\" y=\"").concat(y + 4, "\" width=\"").concat(liveW, "\" height=\"22\" rx=\"11\" fill=\"").concat(tl.at ? 'var(--surface)' : 'var(--ok)', "\" stroke=\"var(--").concat(tl.at ? 'line' : 'ok', ")\"/>");
    s += "<text x=\"".concat(lx + liveW / 2, "\" y=\"").concat(y + 19, "\" text-anchor=\"middle\" class=\"tab\" style=\"font-size:11px;fill:").concat(tl.at ? 'var(--fg)' : 'var(--bg)', "\">").concat(tl.at ? 'Back to live' : '● Live', "</text>");
    hits.push({ x: lx, y: y + 4, w: liveW, h: 22, action: 'live:' });
    return s;
};
// The scene is the view's own SVG, nested and scaled into its box.
var scene = function (team, view, theme, sel, x, y, w, h, still, at, hits, flash) {
    var spots = [];
    var svg = (0, views_1.svgView)(team, view, theme, sel, still, at, spots, flash);
    var vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
    if (vb) {
        // The nested view is scaled to fit and centred ("meet"): the same sum places each teammate on the picture.
        var vw = Number(vb[1]);
        var vh = Number(vb[2]);
        var k = Math.min(w / vw, h / vh);
        var ox = x + (w - vw * k) / 2;
        var oy = y + (h - vh * k) / 2;
        for (var _i = 0, spots_1 = spots; _i < spots_1.length; _i++) {
            var p = spots_1[_i];
            hits.push({ x: ox + (p.x - p.r) * k, y: oy + (p.y - p.r) * k, w: 2 * p.r * k, h: 2 * p.r * k, action: p.action });
        }
    }
    return svg.replace(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="([^"]+)" width="\d+" height="\d+">/, "<svg x=\"".concat(x, "\" y=\"").concat(y, "\" width=\"").concat(w, "\" height=\"").concat(h, "\" viewBox=\"$1\" preserveAspectRatio=\"xMidYMid meet\">"));
};
var sceneAspect = function (view) { return (view === 'map' ? 440 / 640 : view === 'office' ? 560 / 900 : 600 / 900); };
exports.sceneAspect = sceneAspect;
var dashboardSvg = function (team, view, theme, o) {
    var _a, _b, _c, _d, _e, _f;
    var W = Math.max(480, Math.round(o.width));
    var fullH = Math.max(420, Math.round(o.height));
    // The timeline takes the bottom strip; the rest lays out in what is left.
    var H = fullH - (o.timeline ? TIMELINE_H + 6 : 0);
    var sel = team.members.some(function (m) { return m.name === o.selected; }) ? o.selected : 'lead';
    var stage = o.stage && (0, model_1.line)().includes(o.stage) ? o.stage : '';
    // Later boxes win a click, so the people in the scene are pushed after the boxes they stand in.
    var hits = [];
    var top = PAD + 56;
    var railH = exports.RAIL_H;
    var bodyY = top + railH;
    var picked = o.issue === undefined ? undefined : team.issues.find(function (i) { return i.issue === o.issue; });
    var side = function (x, y, w, h) {
        return picked ? issueCard(team, picked, x, y, w, h, hits, o.issueSite)
            : stage ? stageCard(team, stage, x, y, w, h, hits) : chat(team, sel, o.filter, x, y, w, h, hits);
    };
    var flash = (_a = o.flash) !== null && _a !== void 0 ? _a : [];
    var body = header(team, view, W, flash, (_c = (_b = o.timeline) === null || _b === void 0 ? void 0 : _b.at) !== null && _c !== void 0 ? _c : '', hits, o.isDemo) + rail(team, top, W, stage, hits);
    var isWide = W >= 1100 && W / H > 1.2;
    if (isWide) {
        var sideW = 360;
        var sw = W - 3 * PAD - sideW;
        var sh = Math.min(H - bodyY - PAD, sw * (0, exports.sceneAspect)(view));
        body += "<rect x=\"".concat(PAD, "\" y=\"").concat(bodyY, "\" width=\"").concat(sw, "\" height=\"").concat(H - bodyY - PAD, "\" rx=\"16\" fill=\"var(--bg)\" stroke=\"var(--line)\"/>");
        body += scene(team, view, theme, sel, PAD, bodyY, sw, sh, o.isStill === true, (_d = o.phase) !== null && _d !== void 0 ? _d : null, hits, flash);
        body += badge(team, sel, W - PAD - sideW, bodyY, sideW, 150, hits);
        body += side(W - PAD - sideW, bodyY + 150 + 12, sideW, H - bodyY - 150 - 12 - PAD);
    }
    else {
        var sw = W - 2 * PAD;
        var sh = Math.min(sw * (0, exports.sceneAspect)(view), (H - bodyY) * 0.55);
        body += "<rect x=\"".concat(PAD, "\" y=\"").concat(bodyY, "\" width=\"").concat(sw, "\" height=\"").concat(sh.toFixed(1), "\" rx=\"16\" fill=\"var(--bg)\" stroke=\"var(--line)\"/>");
        body += scene(team, view, theme, sel, PAD, bodyY, sw, sh, o.isStill === true, (_e = o.phase) !== null && _e !== void 0 ? _e : null, hits, flash);
        var by = bodyY + sh + 12;
        body += badge(team, sel, PAD, by, sw, 150, hits);
        var cy = by + 150 + 12;
        if (H - cy - PAD > 80)
            body += side(PAD, cy, sw, H - cy - PAD);
    }
    var extra = "<style>\n.h1{font:800 20px ui-sans-serif,system-ui,sans-serif;fill:var(--fg);letter-spacing:-.02em}\n.sub{font:400 12px ui-sans-serif,system-ui,sans-serif;fill:var(--muted)}\n.rl{font:500 10px ui-monospace,Menlo,monospace;fill:var(--fg)}\n.rn{font:400 9.5px ui-monospace,Menlo,monospace;fill:var(--muted)}\n.nm2{font:600 16px ui-sans-serif,system-ui,sans-serif;fill:var(--fg)}\n.pill{font:500 11px ui-monospace,Menlo,monospace;fill:var(--fg)}\n.k{font:400 12px ui-sans-serif,system-ui,sans-serif;fill:var(--muted)}\n.val{font:400 12px ui-sans-serif,system-ui,sans-serif;fill:var(--fg)}\n.meta{font:500 10.5px ui-monospace,Menlo,monospace;fill:var(--muted)}\n.tag{font:500 9px ui-monospace,Menlo,monospace}\n.msg{font:400 12.5px ui-sans-serif,system-ui,sans-serif;fill:var(--fg)}\n.tab{font-family:ui-sans-serif,system-ui,sans-serif;font-weight:500}\n</style>";
    if (o.timeline)
        body += timelineStrip(o.timeline, H, W, hits);
    // Scene people last: a click on someone standing inside a box picks them, not the box.
    var people = hits.filter(function (h) { return h.action.startsWith('who:') && h.w < 80; });
    (_f = o.hits) === null || _f === void 0 ? void 0 : _f.push.apply(_f, __spreadArray(__spreadArray([], hits.filter(function (h) { return !people.includes(h); }), false), people, false));
    var svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 ".concat(W, " ").concat(fullH, "\" width=\"").concat(W, "\" height=\"").concat(fullH, "\">").concat((0, views_1.svgStyle)(theme)).concat(extra, "<rect width=\"").concat(W, "\" height=\"").concat(fullH, "\" fill=\"var(--bg)\"/>").concat(body, "</svg>");
    return o.phase === undefined ? svg : freeze(svg, o.phase);
};
exports.dashboardSvg = dashboardSvg;
// A frame stops the CSS animations at one moment of their loop: rings turned, lights part-way through a pulse, the
// belt moved on.
var freeze = function (svg, t) {
    return svg
        .replace(/ class="spin"/g, " transform=\"rotate(".concat(Math.round(t * 360), ")\""))
        .replace(/ class="pulse"/g, " opacity=\"".concat((0.45 + 0.55 * Math.abs(Math.cos(t * Math.PI))).toFixed(2), "\""))
        .replace(/ class="belt"/g, " stroke-dashoffset=\"".concat((-16 * t * 3).toFixed(1), "\""))
        .replace(/ class="blink"/g, " opacity=\"".concat(Math.round(t * 6) % 2 ? 0.15 : 1, "\""));
};
// Every frame of the loop stacked top to bottom in one picture, so one Chrome run draws them all.
var spriteSvg = function (team, view, theme, o, frames) {
    var W = Math.max(480, Math.round(o.width));
    var H = Math.max(420, Math.round(o.height));
    var body = '';
    for (var k = 0; k < frames; k++) {
        body += (0, exports.dashboardSvg)(team, view, theme, __assign(__assign({}, o), { isStill: true, phase: k / frames, hits: k === 0 ? o.hits : undefined })).replace(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="([^"]+)" width="\d+" height="\d+">/, "<svg x=\"0\" y=\"".concat(k * H, "\" width=\"").concat(W, "\" height=\"").concat(H, "\" viewBox=\"$1\">"));
    }
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 ".concat(W, " ").concat(H * frames, "\" width=\"").concat(W, "\" height=\"").concat(H * frames, "\">").concat(body, "</svg>");
};
exports.spriteSvg = spriteSvg;
// rsvg-convert draws in a tenth of Chrome's time but knows no CSS variables: put each colour in place of its name.
var flatSvg = function (svg) {
    var _a, _b;
    var block = (_b = (_a = /svg\{([^}]*)\}/.exec(svg)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : '';
    var vars = new Map(__spreadArray([], block.matchAll(/--([\w-]+):([^;]+)/g), true).map(function (m) { return [m[1], m[2].trim()]; }));
    return svg.replace(/var\(--([\w-]+)\)/g, function (all, name) { var _a; return (_a = vars.get(name)) !== null && _a !== void 0 ? _a : all; });
};
exports.flatSvg = flatSvg;
