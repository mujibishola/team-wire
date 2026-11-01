"use strict";
// For a project with no team log of its own: the lead's session turns what it can see of its team into log lines.
// Tasks: Claude Code keeps each as ~/.claude/tasks/<team>/<id>.json (its state now); comparing one look with the
// last gives tasks created, claimed, started and finished, timed to within one look. Messages: those to the lead
// arrive in its own conversation and its own go out through SendMessage, so both are caught as they happen; those
// between two teammates are only seen in the recipient's inbox (~/.claude/teams/<team>/inboxes/<name>.json), which
// empties once read, so a quick reader can beat the look. A team shut down takes its task files with it: that is
// the team ending, not its tasks being deleted, and the log keeps them as they last stood.
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
exports.deliveredMessages = exports.inboxMessages = exports.messageEvent = exports.taskEvents = void 0;
// A message arriving two ways (the inbox and the lead's conversation) is the same one this close together.
var SAME_MS = 10 * 60 * 1000;
// Structured notes the engine sends between agents (idle, assignment, shutdown): not what teammates said.
var isProtocol = function (text) { return /^\s*\{\s*"type"\s*:/.test(text); };
var who = function (name) { return (name === 'team-lead' ? 'lead' : name); };
var iso = function (ms) { return new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z'); };
/**
 * The lines for what changed in the tasks between the last look and this one. Ids are logged as `<team>/<id>`:
 * each team numbers its tasks from 1.
 */
var taskEvents = function (team, before, now, ts) {
    var _a, _b, _c, _d, _e;
    var lines = [];
    var tasks = {};
    var idOf = function (id) { return "".concat(team, "/").concat(id); };
    var _loop_1 = function (f) {
        var id = idOf(String(f.id));
        var cur = { subject: (_a = f.subject) !== null && _a !== void 0 ? _a : '', status: (_b = f.status) !== null && _b !== void 0 ? _b : 'pending', owner: (_c = f.owner) !== null && _c !== void 0 ? _c : '', blockedBy: ((_d = f.blockedBy) !== null && _d !== void 0 ? _d : []).map(function (b) { return idOf(String(b)); }) };
        tasks[id] = cur;
        var was = before[id];
        var by = cur.owner || 'lead';
        if (!was)
            lines.push({ ts: ts, event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: cur.subject }, response: { task: { id: id } } });
        else if (was.subject !== cur.subject)
            lines.push({ ts: ts, event: 'PostToolUse', agent: by, tool: 'TaskUpdate', input: { taskId: id, subject: cur.subject } });
        var added = cur.blockedBy.filter(function (b) { return !(was === null || was === void 0 ? void 0 : was.blockedBy.includes(b)); });
        if (added.length)
            lines.push({ ts: ts, event: 'PostToolUse', agent: 'lead', tool: 'TaskUpdate', input: { taskId: id, addBlockedBy: added } });
        if (cur.owner && cur.owner !== (was === null || was === void 0 ? void 0 : was.owner))
            lines.push({ ts: ts, event: 'PostToolUse', agent: by, tool: 'TaskUpdate', input: { taskId: id, owner: cur.owner } });
        // A task finished without ever being marked in progress has no start: none is made up.
        if (cur.status !== ((_e = was === null || was === void 0 ? void 0 : was.status) !== null && _e !== void 0 ? _e : 'pending')) {
            if (cur.status === 'completed')
                lines.push({ ts: ts, event: 'TaskCompleted', agent: by, task_id: id, task_subject: cur.subject, outcome: 'completed' });
            else
                lines.push({ ts: ts, event: 'PostToolUse', agent: by, tool: 'TaskUpdate', input: { taskId: id, status: cur.status } });
        }
    };
    for (var _i = 0, now_1 = now; _i < now_1.length; _i++) {
        var f = now_1[_i];
        _loop_1(f);
    }
    // Every task gone at once is the team shut down: they stay as they were. One gone among others was deleted.
    var gone = Object.keys(before).filter(function (id) { return !tasks[id]; });
    if (now.length)
        for (var _f = 0, gone_1 = gone; _f < gone_1.length; _f++) {
            var id = gone_1[_f];
            lines.push({ ts: ts, event: 'PostToolUse', agent: 'lead', tool: 'TaskUpdate', input: { taskId: id, status: 'deleted' } });
        }
    return { lines: lines, tasks: now.length ? tasks : {} };
};
exports.taskEvents = taskEvents;
/** One message as a log line, unless the same was logged lately; `seen` comes back pruned and with it added. */
var messageEvent = function (m, seen) {
    var kept = seen.filter(function (_a) {
        var at = _a[1];
        return Math.abs(m.ms - at) < SAME_MS;
    });
    var text = m.text.trim();
    var from = who(m.from);
    var to = who(m.to);
    var key = "".concat(from, "|").concat(to, "|").concat(text);
    if (!text || isProtocol(text) || kept.some(function (_a) {
        var k = _a[0];
        return k === key;
    }))
        return { seen: kept };
    return { line: { ts: iso(m.ms), event: 'PostToolUse', agent: from, tool: 'SendMessage', input: { to: to, message: text } }, seen: __spreadArray(__spreadArray([], kept, true), [[key, m.ms]], false) };
};
exports.messageEvent = messageEvent;
/** The messages waiting in each teammate's inbox, keyed by the inbox's owner. */
var inboxMessages = function (inboxes) {
    return Object.entries(inboxes)
        .flatMap(function (_a) {
        var to = _a[0], list = _a[1];
        return list.map(function (m) { var _a, _b, _c; return ({ from: (_a = m.from) !== null && _a !== void 0 ? _a : '', to: to, text: (_b = m.text) !== null && _b !== void 0 ? _b : '', ms: Date.parse((_c = m.timestamp) !== null && _c !== void 0 ? _c : '') }); });
    })
        .filter(function (m) { return m.from && m.text && !Number.isNaN(m.ms); })
        .sort(function (a, b) { return a.ms - b.ms; });
};
exports.inboxMessages = inboxMessages;
/** Teammates' messages as they appear in the lead's conversation: `<teammate-message teammate_id="x">text</…>`. */
var deliveredMessages = function (content) {
    return __spreadArray([], content.matchAll(/<teammate-message teammate_id="([^"]+)"[^>]*>([\s\S]*?)<\/teammate-message>/g), true).map(function (m) { return ({ from: m[1], text: m[2].trim() }); })
        .filter(function (m) { return m.from !== 'team-lead' && m.text && !isProtocol(m.text); });
};
exports.deliveredMessages = deliveredMessages;
