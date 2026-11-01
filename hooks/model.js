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
exports.hhmm = exports.initials = exports.shortName = exports.dur = exports.stageTimes = exports.parse = exports.classify = exports.parseSubject = exports.areaOf = exports.roleOf = exports.configure = exports.reworkOf = exports.issueUrlTemplate = exports.labelOf = exports.isDefaultLine = exports.line = exports.DEFAULT_LINE = void 0;
// The task kinds an issue moves through, in order, unless a project's .claude/team-wire.json names its own.
exports.DEFAULT_LINE = ['plan', 'build', 'ui', 'test', 'review', 'merge'];
var AREAS = ['lead', 'backend', 'ui', 'qa', 'sec', 'rev'];
var KIND_RE = /^[a-z][a-z0-9-]*$/;
var DEFAULTS = {
    steps: exports.DEFAULT_LINE, labels: {}, rework: { kind: 'fix', to: 'build' }, shipStep: 'merge', titleStep: 'build', words: {}, issueUrl: '', roles: {},
};
var cfg = DEFAULTS;
var line = function () { return cfg.steps; };
exports.line = line;
var isDefaultLine = function () { return cfg.steps === exports.DEFAULT_LINE; };
exports.isDefaultLine = isDefaultLine;
var labelOf = function (kind) { return cfg.labels[kind]; };
exports.labelOf = labelOf;
var issueUrlTemplate = function () { return cfg.issueUrl; };
exports.issueUrlTemplate = issueUrlTemplate;
var reworkOf = function () { return cfg.rework; };
exports.reworkOf = reworkOf;
var escapeRe = function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
/**
 * Takes a project's settings, or undefined for none: what it can use replaces the defaults, and each problem is
 * returned in words, its field left at the default.
 */
var configure = function (raw) {
    var _a, _b, _c, _d, _e, _f;
    var problems = [];
    var f = (raw && typeof raw === 'object' ? raw : {});
    var next = __assign(__assign({}, DEFAULTS), { labels: {}, words: {}, roles: {} });
    if (f.steps !== undefined) {
        var steps = [];
        for (var _i = 0, _g = Array.isArray(f.steps) ? f.steps : []; _i < _g.length; _i++) {
            var st = _g[_i];
            var kind = typeof st === 'string' ? st : st === null || st === void 0 ? void 0 : st.kind;
            if (typeof kind !== 'string' || !KIND_RE.test(kind))
                problems.push("steps: \"".concat(String(kind), "\" is not a task kind (lowercase letters, digits and dashes)"));
            else if (!steps.includes(kind)) {
                steps.push(kind);
                if (typeof st === 'object' && typeof st.label === 'string' && st.label.trim())
                    next.labels[kind] = st.label.trim();
            }
        }
        if (steps.length)
            next.steps = steps;
        else
            problems.push('steps: needs at least one task kind');
    }
    var has = function (k) { return next.steps.includes(k); };
    var custom = next.steps !== exports.DEFAULT_LINE;
    // With its own steps a project's other step names default to its own: the last step ships, the first names.
    if (custom) {
        next.shipStep = has('merge') ? 'merge' : next.steps[next.steps.length - 1];
        next.titleStep = has('build') ? 'build' : next.steps[0];
        next.rework = { kind: 'fix', to: has('build') ? 'build' : next.steps[0] };
    }
    for (var _h = 0, _j = ['shipStep', 'titleStep']; _h < _j.length; _h++) {
        var key = _j[_h];
        var v = f[key];
        if (v === undefined)
            continue;
        if (typeof v === 'string' && has(v))
            next[key] = v;
        else
            problems.push("".concat(key, ": \"").concat(String(v), "\" is not one of the steps"));
    }
    if (f.rework !== undefined) {
        var kind = (_b = (_a = f.rework) === null || _a === void 0 ? void 0 : _a.kind) !== null && _b !== void 0 ? _b : next.rework.kind;
        var to = (_d = (_c = f.rework) === null || _c === void 0 ? void 0 : _c.to) !== null && _d !== void 0 ? _d : next.rework.to;
        if (typeof kind !== 'string' || !KIND_RE.test(kind))
            problems.push("rework.kind: \"".concat(String(kind), "\" is not a task kind"));
        else if (typeof to !== 'string' || !has(to))
            problems.push("rework.to: \"".concat(String(to), "\" is not one of the steps"));
        else
            next.rework = { kind: kind, to: to };
    }
    for (var _k = 0, _l = Object.entries((_e = f.words) !== null && _e !== void 0 ? _e : {}); _k < _l.length; _k++) {
        var _m = _l[_k], kind = _m[0], list = _m[1];
        if (!['problem', 'handoff', 'approve', 'merge'].includes(kind))
            problems.push("words: \"".concat(kind, "\" is not problem, handoff, approve or merge"));
        else if (!Array.isArray(list) || !list.every(function (w) { return typeof w === 'string' && w.trim(); }))
            problems.push("words.".concat(kind, ": needs a list of words"));
        else {
            var res = [];
            var plain = [];
            for (var _o = 0, _p = list.map(function (x) { return x.trim(); }); _o < _p.length; _o++) {
                var w = _p[_o];
                // A word between slashes is a pattern, for what a word can't say (at the start only, a count before it).
                if (w.length > 2 && w.startsWith('/') && w.endsWith('/')) {
                    try {
                        res.push(new RegExp(w.slice(1, -1)));
                    }
                    catch (_q) {
                        problems.push("words.".concat(kind, ": ").concat(w, " is not a valid pattern"));
                    }
                }
                else
                    plain.push(escapeRe(w.toUpperCase()));
            }
            if (plain.length)
                res.push(new RegExp("(^|[^A-Z0-9])(".concat(plain.join('|'), ")(?![A-Z0-9])")));
            if (res.length)
                next.words[kind] = res;
        }
    }
    if (f.issueUrl !== undefined) {
        if (typeof f.issueUrl === 'string' && /^https?:\/\/\S+\{n\}/.test(f.issueUrl))
            next.issueUrl = f.issueUrl;
        else
            problems.push('issueUrl: needs an http(s) address with {n} where the issue number goes');
    }
    for (var _r = 0, _s = Object.entries((_f = f.roles) !== null && _f !== void 0 ? _f : {}); _r < _s.length; _r++) {
        var _t = _s[_r], name_1 = _t[0], area = _t[1];
        if (AREAS.includes(area))
            next.roles[name_1] = area;
        else
            problems.push("roles.".concat(name_1, ": \"").concat(String(area), "\" is not one of ").concat(AREAS.slice(0, -1).join(', '), " or ").concat(AREAS[AREAS.length - 1]));
    }
    cfg = next;
    return problems;
};
exports.configure = configure;
var FLAG_MS = 60 * 60 * 1000;
var MAX_MSGS = 80;
var roleOf = function (name) { return name.replace(/-\d+$/, ''); };
exports.roleOf = roleOf;
// A teammate is whatever name owns a task or sends or receives a
// message, but for addresses that are no one (a broadcast) and agent types that are subagents, not teammates.
var NOT_TEAMMATES = new Set(['*', 'all', 'everyone', 'user', 'system', 'general-purpose', 'explore', 'plan', 'claude', 'fork']);
var isMember = function (name) {
    return cfg.roles[name] !== undefined || cfg.roles[(0, exports.roleOf)(name)] !== undefined || (/^[a-z][a-z0-9_-]{0,40}$/.test(name) && !NOT_TEAMMATES.has(name));
};
// A name the roles don't know takes its area from what it says it does.
var AREA_WORDS = [
    [/lead|manager|coordinator|orchestrat/, 'lead'],
    [/secur|pentest|attack|threat|red-?team|audit/, 'sec'],
    [/review|critic|approver/, 'rev'],
    [/qa|test|quality|verif/, 'qa'],
    [/web|ui|ux|front|mobile|ios|android|flutter|react|design|css/, 'ui'],
];
var areaOf = function (name) { var _a, _b, _c, _d; return (_d = (_b = (_a = cfg.roles[name]) !== null && _a !== void 0 ? _a : cfg.roles[(0, exports.roleOf)(name)]) !== null && _b !== void 0 ? _b : (_c = AREA_WORDS.find(function (_a) {
    var re = _a[0];
    return re.test((0, exports.roleOf)(name));
})) === null || _c === void 0 ? void 0 : _c[1]) !== null && _d !== void 0 ? _d : 'backend'; };
exports.areaOf = areaOf;
// The lead logs as `lead` but is addressed as `team-lead`.
var norm = function (name) { return (name === 'team-lead' || name === 'main' ? 'lead' : name); };
var parseSubject = function (s) {
    var m = /^#(\d+)\s+([a-z-]+)\s+([a-z0-9-]+):/.exec(s);
    return m ? { issue: Number(m[1]), kind: m[2], owner: m[3] } : {};
};
exports.parseSubject = parseSubject;
var classify = function (text) {
    var head = text.trimStart().slice(0, 80).toUpperCase();
    // A project's own words replace the defaults for their kind; the order of the kinds stays.
    for (var _i = 0, _a = ['problem', 'merge', 'approve', 'handoff']; _i < _a.length; _i++) {
        var kind = _a[_i];
        var own = cfg.words[kind];
        if (own ? own.some(function (re) { return re.test(head); }) : DEFAULT_WORDS[kind](head))
            return kind;
    }
    return 'note';
};
exports.classify = classify;
// What a message says, by how it starts: problems first, as a message can report one and a hand-off at once.
var DEFAULT_WORDS = {
    problem: function (h) { return /^(OFF-TRACK|STUCK|BLOCKED|FAIL(ED|ING|URE)?|ERROR|REJECTED|NOT READY|CHANGES REQUESTED|HELP)\b/.test(h); },
    merge: function (h) { return /\bMERGED\b/.test(h); },
    approve: function (h) { return /\bAPPROVED\b|^(LGTM|PASS(ED)?)\b/.test(h); },
    handoff: function (h) { return /^[A-Z -]*\b(READY|DONE)\b/.test(h); },
};
var ms = function (ts) {
    var t = Date.parse(ts);
    return Number.isNaN(t) ? 0 : t;
};
// `until`: read the log only up to that moment, for replaying the day.
var parse = function (text, until) {
    var _a;
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    if (until === void 0) { until = ''; }
    var tasks = new Map();
    var messages = [];
    var pairs = new Map();
    var alerts = [];
    var flags = new Map();
    var names = new Set(['lead']);
    var lastTs = '';
    var seq = 0;
    for (var _i = 0, _o = text.split('\n'); _i < _o.length; _i++) {
        var line_1 = _o[_i];
        if (!line_1.trim())
            continue;
        var e = void 0;
        try {
            e = JSON.parse(line_1);
        }
        catch (_p) {
            continue;
        }
        if (until && typeof e.ts === 'string' && e.ts > until)
            continue;
        seq++;
        if (typeof e.ts === 'string')
            lastTs = e.ts;
        var agent = norm(String((_b = e.agent) !== null && _b !== void 0 ? _b : 'lead'));
        var input = (_c = e.input) !== null && _c !== void 0 ? _c : {};
        if (e.event === 'OffTrack') {
            alerts.push({ ts: e.ts, agent: agent, kind: String((_d = e.kind) !== null && _d !== void 0 ? _d : ''), detail: String((_e = e.detail) !== null && _e !== void 0 ? _e : '') });
            if (isMember(agent))
                flags.set(agent, e.ts);
            continue;
        }
        if (e.tool === 'TaskCreate') {
            var id = (_g = (_f = e.response) === null || _f === void 0 ? void 0 : _f.task) === null || _g === void 0 ? void 0 : _g.id;
            if (id === undefined)
                continue;
            var subject = String((_h = input.subject) !== null && _h !== void 0 ? _h : '');
            tasks.set(String(id), __assign(__assign(__assign({ id: String(id), subject: subject }, (0, exports.parseSubject)(subject)), { status: 'pending', blockedBy: [], seq: seq }), (e.ts ? { createdTs: e.ts } : {})));
            continue;
        }
        if (e.tool === 'TaskUpdate') {
            var t = tasks.get(String(input.taskId));
            if (!t)
                continue;
            t.seq = seq;
            if (typeof input.subject === 'string')
                Object.assign(t, { subject: input.subject }, (0, exports.parseSubject)(input.subject));
            if (typeof input.owner === 'string')
                t.owner = input.owner;
            if (input.status === 'deleted')
                tasks.delete(t.id);
            else if (typeof input.status === 'string')
                t.status = input.status;
            if (input.status === 'in_progress' && !t.startTs)
                t.startTs = e.ts;
            if (input.status === 'completed')
                t.doneTs = e.ts;
            if (Array.isArray(input.addBlockedBy))
                (_a = t.blockedBy).push.apply(_a, input.addBlockedBy.map(String));
            continue;
        }
        if (e.event === 'TaskCompleted' && e.outcome === 'completed') {
            var id = String(e.task_id);
            var t = tasks.get(id);
            if (t) {
                t.status = 'completed';
                t.doneTs = e.ts;
                t.seq = seq;
            }
            else {
                var subject = String((_j = e.task_subject) !== null && _j !== void 0 ? _j : '');
                tasks.set(id, __assign(__assign({ id: id, subject: subject }, (0, exports.parseSubject)(subject)), { status: 'completed', blockedBy: [], seq: seq, doneTs: e.ts }));
            }
            continue;
        }
        if (e.tool === 'SendMessage' && typeof input.message === 'string') {
            var to = norm(String((_k = input.to) !== null && _k !== void 0 ? _k : ''));
            var kind = (0, exports.classify)(input.message);
            messages.push({ ts: e.ts, from: agent, to: to, kind: kind, text: input.message });
            if (messages.length > MAX_MSGS)
                messages.shift();
            for (var _q = 0, _r = [agent, to]; _q < _r.length; _q++) {
                var n = _r[_q];
                if (isMember(n))
                    names.add(n);
            }
            if (to !== agent && isMember(to)) {
                var _s = agent < to ? [agent, to] : [to, agent], a = _s[0], b = _s[1];
                var k = "".concat(a, "|").concat(b);
                var p = (_l = pairs.get(k)) !== null && _l !== void 0 ? _l : { a: a, b: b, n: 0, lastTs: e.ts };
                p.n++;
                p.lastTs = e.ts;
                pairs.set(k, p);
            }
            // A problem flags whoever must act on it: the sender of an OFF-TRACK or
            // STUCK about themselves, otherwise the recipient of findings. Their next
            // hand-off or approval clears it.
            if (kind === 'problem') {
                var self_1 = /^\s*(OFF-TRACK|STUCK|BLOCKED)/i.test(input.message);
                var who = self_1 ? agent : to;
                if (isMember(who) && who !== 'lead')
                    flags.set(who, e.ts);
            }
            else if (kind === 'handoff' || kind === 'approve') {
                flags.delete(agent);
            }
        }
    }
    for (var _t = 0, _u = tasks.values(); _t < _u.length; _t++) {
        var t = _u[_t];
        if (t.owner && isMember(norm(t.owner)))
            names.add(norm(t.owner));
    }
    // The roles a project lists show from the start, in the break room until they get work, once its log has any of
    // them; otherwise only the names the log has.
    var listed = Object.keys(cfg.roles);
    if (__spreadArray([], names, true).some(function (n) { return n !== 'lead' && listed.includes((0, exports.roleOf)(n)); }))
        for (var _v = 0, listed_1 = listed; _v < listed_1.length; _v++) {
            var r = listed_1[_v];
            names.add(r);
        }
    var done = function (id) { var _a; return ((_a = tasks.get(id)) === null || _a === void 0 ? void 0 : _a.status) === 'completed' || !tasks.has(id); };
    var open = __spreadArray([], tasks.values(), true).filter(function (t) { return t.status !== 'completed'; });
    var now = ms(lastTs);
    // Ready once created and every blocker has finished; a blocker the log never showed counts as long finished.
    var readyOf = function (t) {
        var at = t.createdTs;
        for (var _i = 0, _a = t.blockedBy; _i < _a.length; _i++) {
            var b = _a[_i];
            var bt = tasks.get(b);
            if (!bt)
                continue;
            if (bt.status !== 'completed')
                return undefined;
            if (bt.doneTs && (!at || bt.doneTs > at))
                at = bt.doneTs;
        }
        return at;
    };
    // The lead, the listed roles in their order, then any other names alphabetically.
    var order = function (n) {
        var _a, _b;
        var i = n === 'lead' ? -1 : listed.indexOf((0, exports.roleOf)(n));
        return (i < 0 && n !== 'lead' ? listed.length : i) * 100 + Number((_b = (_a = /-(\d+)$/.exec(n)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : 0);
    };
    var members = __spreadArray([], names, true).sort(function (a, b) { return order(a) - order(b) || a.localeCompare(b); }).map(function (name) {
        var mine = open.filter(function (t) { return t.owner !== undefined && norm(t.owner) === name; }).sort(function (a, b) { return b.seq - a.seq; });
        var running = mine.find(function (t) { return t.status === 'in_progress'; });
        var waiting = mine.find(function (t) { return t.status === 'pending'; });
        var pick = running !== null && running !== void 0 ? running : waiting;
        var flaggedAt = flags.get(name);
        var status = name === 'lead' ? (open.length ? 'working' : 'free') : running ? 'working' : waiting ? 'waiting' : 'free';
        var m = { name: name, area: (0, exports.areaOf)(name), status: status, isFlagged: flaggedAt !== undefined && now - ms(flaggedAt) < FLAG_MS };
        if (pick && name !== 'lead') {
            m.issue = pick.issue;
            m.kind = pick.kind;
            m.task = pick.subject;
        }
        return m;
    });
    var LINE = cfg.steps;
    var _w = cfg.rework, reworkKind = _w.kind, reworkTo = _w.to;
    var kinds = new Set(__spreadArray(__spreadArray([], LINE, true), [reworkKind], false));
    var usesShipStep = __spreadArray([], tasks.values(), true).some(function (t) { return t.kind === cfg.shipStep; });
    var byIssue = new Map();
    for (var _x = 0, _y = tasks.values(); _x < _y.length; _x++) {
        var t = _y[_x];
        if (t.issue === undefined || !t.kind || !kinds.has(t.kind))
            continue;
        byIssue.set(t.issue, __spreadArray(__spreadArray([], ((_m = byIssue.get(t.issue)) !== null && _m !== void 0 ? _m : []), true), [t], false));
    }
    var issues = __spreadArray([], byIssue.entries(), true).sort(function (a, b) { return a[0] - b[0]; }).map(function (_a) {
        var _b, _c, _d, _e;
        var issue = _a[0], list = _a[1];
        var stages = {};
        var _loop_1 = function (kind) {
            var ofKind = list.filter(function (t) { return t.kind === kind; });
            stages[kind] = ofKind.some(function (t) { return t.status === 'in_progress'; })
                ? 'run'
                : ofKind.every(function (t) { return t.status === 'completed'; }) ? 'done' : 'wait';
        };
        for (var _i = 0, _f = new Set(list.map(function (t) { return t.kind; })); _i < _f.length; _i++) {
            var kind = _f[_i];
            _loop_1(kind);
        }
        var isRework = stages[reworkKind] === 'run';
        var at = isRework
            ? reworkTo
            : (_b = LINE.find(function (k) { return stages[k] === 'run'; })) !== null && _b !== void 0 ? _b : LINE.find(function (k) { return stages[k] === 'wait' && list.some(function (t) { return t.kind === k && t.blockedBy.every(done); }); });
        var stepOrder = function (k) { return (k === reworkKind ? LINE.indexOf(reworkTo) + 0.5 : LINE.indexOf(k)); };
        var steps = list
            .map(function (t) { return (__assign(__assign(__assign(__assign(__assign({ kind: t.kind }, (t.owner ? { owner: norm(t.owner) } : {})), { state: (t.status === 'completed' ? 'done' : t.status === 'in_progress' ? 'run' : 'wait') }), ((function (r) { return (r ? { readyTs: r } : {}); })(readyOf(t)))), (t.startTs ? { startTs: t.startTs } : {})), (t.doneTs ? { doneTs: t.doneTs } : {}))); })
            .sort(function (a, b) { var _a, _b, _c, _d; return stepOrder(a.kind) - stepOrder(b.kind) || ((_b = (_a = a.startTs) !== null && _a !== void 0 ? _a : a.doneTs) !== null && _b !== void 0 ? _b : '~').localeCompare((_d = (_c = b.startTs) !== null && _c !== void 0 ? _c : b.doneTs) !== null && _d !== void 0 ? _d : '~'); });
        // Subjects run "#16 build web-engineer: The sign-in screens"; the build's title is the issue's.
        var titled = (_c = list.find(function (t) { return t.kind === cfg.titleStep; })) !== null && _c !== void 0 ? _c : list[0];
        var title = titled.subject.replace(/^#\d+\s+[a-z-]+\s+[a-z0-9-]+:\s*/, '');
        var created = list.map(function (t) { return t.createdTs; }).filter(function (x) { return !!x; }).sort();
        // Shipped by its ship step; for a team that never makes tasks of that step, by every task of the issue being done.
        // A team that does use it creates an issue's tasks as it goes, so all done so far only means waiting for the next.
        var allDone = list.every(function (t) { return t.status === 'completed'; });
        var isShipped = stages[cfg.shipStep] === 'done' || (!usesShipStep && allDone);
        var lastDone = list.map(function (t) { var _a; return (_a = t.doneTs) !== null && _a !== void 0 ? _a : ''; }).sort().pop();
        var merged = (_e = (_d = list.find(function (t) { return t.kind === cfg.shipStep && t.status === 'completed'; })) === null || _d === void 0 ? void 0 : _d.doneTs) !== null && _e !== void 0 ? _e : (isShipped ? lastDone : undefined);
        return __assign(__assign(__assign({ issue: issue, title: title, steps: steps }, (created[0] ? { openTs: created[0] } : {})), (isShipped && merged ? { shipTs: merged } : {})), { stages: stages, at: at, isRework: isRework, isShipped: isShipped, isActive: list.some(function (t) { return t.status === 'in_progress'; }) });
    });
    return { members: members, issues: issues, messages: messages, pairs: __spreadArray([], pairs.values(), true), alerts: alerts.slice(-10), lastTs: lastTs };
};
exports.parse = parse;
// Per step of the line, at the moment the team stands at (its last event): what queues there now, and how long a
// step has waited and worked on average. A wait runs from ready to started, so it counts time no one picked it up.
var stageTimes = function (team) {
    var now = ms(team.lastTs);
    var out = {};
    for (var _i = 0, _a = cfg.steps; _i < _a.length; _i++) {
        var k = _a[_i];
        var waiting = 0, oldestMs = 0, waitSum = 0, started = 0, workSum = 0, finished = 0;
        for (var _b = 0, _c = team.issues; _b < _c.length; _b++) {
            var i = _c[_b];
            for (var _d = 0, _e = i.steps; _d < _e.length; _d++) {
                var st = _e[_d];
                if (st.kind !== k || !st.readyTs)
                    continue;
                var ready = ms(st.readyTs);
                if (st.startTs) {
                    waitSum += Math.max(0, ms(st.startTs) - ready);
                    started++;
                    if (st.doneTs) {
                        workSum += Math.max(0, ms(st.doneTs) - ms(st.startTs));
                        finished++;
                    }
                }
                else if (st.state === 'wait') {
                    waiting++;
                    oldestMs = Math.max(oldestMs, now - ready);
                }
            }
        }
        out[k] = { waiting: waiting, oldestMs: oldestMs, avgWaitMs: started ? waitSum / started : 0, avgWorkMs: finished ? workSum / finished : 0, started: started, finished: finished };
    }
    return out;
};
exports.stageTimes = stageTimes;
/** 45m, 1h40, 2d3h: short enough for a rail step. */
var dur = function (msv) {
    if (msv < 60000)
        return "".concat(Math.max(0, Math.round(msv / 1000)), "s");
    var m = Math.round(msv / 60000);
    if (m < 60)
        return "".concat(m, "m");
    var h = Math.floor(m / 60);
    if (h < 48)
        return "".concat(h, "h").concat(String(m % 60).padStart(2, '0'));
    return "".concat(Math.floor(h / 24), "d").concat(h % 24, "h");
};
exports.dur = dur;
var shortName = function (name) {
    return name === 'lead' ? 'lead' : name.replace('-engineer', '').replace('security', 'sec').replace('design-reviewer', 'design-rev').replace('-tester', '-test');
};
exports.shortName = shortName;
var initials = function (name) {
    var _a, _b;
    var n = (_b = (_a = /-(\d+)$/.exec(name)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : '';
    var base = (0, exports.roleOf)(name);
    // The first letters of its first two words, a trailing "engineer" left out: backend-dev BD, web-engineer W.
    var words = base.split(/[-_]/).filter(Boolean);
    var kept = words.length > 1 && words[words.length - 1] === 'engineer' ? words.slice(0, -1) : words;
    return (kept.slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join('') || '?') + n;
};
exports.initials = initials;
var hhmm = function (ts) { return (ts.length >= 16 ? ts.slice(11, 16) : ''); };
exports.hhmm = hhmm;
