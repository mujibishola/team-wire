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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
var testing_1 = require("claude-code/testing");
var model_1 = require("../hooks/model");
var recorder_1 = require("../hooks/recorder");
var dashboard_1 = require("../hooks/dashboard");
var views_1 = require("../hooks/views");
var log = [
    { ts: '2026-10-31T10:00:00Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#12 build accounts-engineer: invitations' }, response: { task: { id: '1' } } },
    { ts: '2026-10-31T10:00:01Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#12 ui web-engineer: invitations screen' }, response: { task: { id: '2' } } },
    { ts: '2026-10-31T10:00:02Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#12 review reviewer: invitations' }, response: { task: { id: '3' } } },
    { ts: '2026-10-31T10:00:03Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskUpdate', input: { taskId: '3', addBlockedBy: ['1', '2'] } },
    { ts: '2026-10-31T10:01:00Z', event: 'PostToolUse', agent: 'accounts-engineer', tool: 'TaskUpdate', input: { taskId: '1', status: 'in_progress' } },
    { ts: '2026-10-31T10:02:00Z', event: 'TaskCompleted', agent: 'web-engineer', task_id: '2', task_subject: '#12 ui web-engineer: invitations screen', outcome: 'completed' },
    { ts: '2026-10-31T10:03:00Z', event: 'PostToolUse', agent: 'web-engineer', tool: 'SendMessage', input: { to: 'team-lead', message: 'OFF-TRACK web-engineer #12: reworking the shared table' } },
    { ts: '2026-10-31T10:04:00Z', event: 'PostToolUse', agent: 'lead', tool: 'SendMessage', input: { to: 'web-engineer', message: 'Leave the table.' } },
].map(function (e) { return JSON.stringify(e); }).join('\n') + '\nnot json\n';
(0, testing_1.test)('the log becomes who works on what, and where each issue is', function () {
    var team = (0, model_1.parse)(log);
    var by = function (n) { return team.members.find(function (m) { return m.name === n; }); };
    (0, testing_1.expect)(by('accounts-engineer').status).toBe('working');
    (0, testing_1.expect)(by('accounts-engineer').issue).toBe(12);
    (0, testing_1.expect)(by('web-engineer').status).toBe('free');
    (0, testing_1.expect)(by('web-engineer').isFlagged).toBe(true);
    (0, testing_1.expect)(by('reviewer').status).toBe('waiting');
    var issue = team.issues.find(function (i) { return i.issue === 12; });
    (0, testing_1.expect)(issue.stages).toEqual({ build: 'run', ui: 'done', review: 'wait' });
    (0, testing_1.expect)(issue.at).toBe('build');
    (0, testing_1.expect)(issue.isShipped).toBe(false);
    // `team-lead` is the lead's address: one pair, two messages.
    (0, testing_1.expect)(team.pairs).toEqual([{ a: 'lead', b: 'web-engineer', n: 2, lastTs: '2026-10-31T10:04:00Z' }]);
});
(0, testing_1.test)('message kinds follow the team protocol', function () {
    (0, testing_1.expect)((0, model_1.classify)('API READY #12: docs/api/12.yaml')).toBe('handoff');
    (0, testing_1.expect)((0, model_1.classify)('READY #12 build: team/x/12 at abc')).toBe('handoff');
    (0, testing_1.expect)((0, model_1.classify)('OFF-TRACK web-engineer #12: drift')).toBe('problem');
    (0, testing_1.expect)((0, model_1.classify)('#12 review: 2 findings')).toBe('problem');
    (0, testing_1.expect)((0, model_1.classify)('#12 attack: 0 holes')).toBe('note');
    (0, testing_1.expect)((0, model_1.classify)('#12 review approved')).toBe('approve');
    (0, testing_1.expect)((0, model_1.classify)('#12 merged to main at 5e01b7c')).toBe('merge');
});
(0, testing_1.test)('a fix task puts the crate back at build as rework', function () {
    var rework = log + '\n' + [
        { ts: '2026-10-31T10:05:00Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#12 fix accounts-engineer: review findings' }, response: { task: { id: '4' } } },
        { ts: '2026-10-31T10:05:01Z', event: 'PostToolUse', agent: 'accounts-engineer', tool: 'TaskUpdate', input: { taskId: '4', status: 'in_progress' } },
    ].map(function (e) { return JSON.stringify(e); }).join('\n');
    var issue = (0, model_1.parse)(rework).issues.find(function (i) { return i.issue === 12; });
    (0, testing_1.expect)(issue.isRework).toBe(true);
    (0, testing_1.expect)(issue.at).toBe('build');
});
(0, testing_1.test)('every view draws as text and as SVG', function () {
    var team = (0, model_1.parse)(log);
    for (var _i = 0, _a = ['map', 'office', 'factory']; _i < _a.length; _i++) {
        var view = _a[_i];
        (0, testing_1.expect)((0, views_1.textView)(team, view, 80).length).toBeGreaterThan(1);
        var svg = (0, views_1.svgView)(team, view, 'auto');
        (0, testing_1.expect)(svg.startsWith('<svg')).toBe(true);
        (0, testing_1.expect)(svg.length).toBeLessThan(131072);
        // Unescaped ampersands break the SVG on the desktop.
        (0, testing_1.expect)(/&(?!amp;|lt;|gt;|quot;|#39;)/.test(svg)).toBe(false);
    }
});
var PANE = {
    plugin: 'team-wire',
    component: 'Pane',
    requestId: 'team-wire',
    props: { title: 'Team', isFocused: false, bodyColumns: 90, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
};
(0, testing_1.test)('the pane draws text with view buttons in the terminal and a picture elsewhere', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var team, term, _a, _b, desk, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                team = (0, model_1.parse)(log);
                on('state.get', function (_, e) { return ({
                    value: { value: e.key === 'team' ? { shape: 'team-2', value: team } : { shape: 'view-1', value: 'office' }, version: 1 },
                }); });
                on('config.list', function () { return ({ value: [] }); });
                return [4 /*yield*/, $.ui.mount(__assign(__assign({}, PANE), { surface: 'terminal' }))];
            case 1:
                term = _d.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, term.find({ type: 'Text', text: /Backend/ })];
            case 2:
                _a.apply(void 0, [_d.sent()]).toBeDefined();
                _b = testing_1.expect;
                return [4 /*yield*/, term.find({ key: 'view-factory' })];
            case 3:
                _b.apply(void 0, [_d.sent()]).toBeDefined();
                return [4 /*yield*/, term.unmount()];
            case 4:
                _d.sent();
                return [4 /*yield*/, $.ui.mount(__assign(__assign({}, PANE), { surface: 'desktop' }))];
            case 5:
                desk = _d.sent();
                _c = testing_1.expect;
                return [4 /*yield*/, desk.find({ type: 'Svg' })];
            case 6:
                _c.apply(void 0, [_d.sent()]).toBeDefined();
                return [4 /*yield*/, desk.unmount()];
            case 7:
                _d.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('/team off hides the summary line until /team turns it back on', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var team, state, version, TYPED, BAND, before, _a, off, hidden, _b, _c, back, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                team = (0, model_1.parse)(log);
                state = new Map([['team', { shape: 'team-2', value: team }]]);
                version = 1;
                on('state.get', function (_, e) { return ({ value: state.has(e.key) ? { value: state.get(e.key), version: version } : { value: undefined, version: 0 } }); });
                on('state.set', function (_, e) {
                    state.set(e.key, e.value);
                    return { value: { isSet: true, version: ++version } };
                });
                on('clock.now', function () { return ({ value: Date.parse('2026-10-31T10:10:00Z') }); });
                on('store.set', function () { return ({ value: undefined }); });
                on('ui.open', function () { return ({ value: { isPlaced: true } }); });
                on('ui.close', function () { return ({ value: undefined }); });
                on('config.list', function () { return ({ value: [] }); });
                on('command.run', function () { return ({ text: '' }); });
                // Stands for the engine's own band, drawn when the mod passes.
                on('ui.render', function ($, e) {
                    var Text = $.ui.resolve(e).Text;
                    return <Text>engine</Text>;
                });
                TYPED = { origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } };
                BAND = { plugin: 'team-wire', component: 'AbovePrompt', requestId: 'band', props: { bodyColumns: 100 }, surface: 'terminal' };
                return [4 /*yield*/, $.ui.mount(BAND)];
            case 1:
                before = _e.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, before.find({ type: 'Text', text: /working/ })];
            case 2:
                _a.apply(void 0, [_e.sent()]).toBeDefined();
                return [4 /*yield*/, before.unmount()];
            case 3:
                _e.sent();
                return [4 /*yield*/, $.command.run(__assign({ command: 'team', args: 'off' }, TYPED))];
            case 4:
                off = _e.sent();
                (0, testing_1.expect)(JSON.stringify(off)).toContain('Team Wire is off');
                return [4 /*yield*/, $.ui.mount(BAND)];
            case 5:
                hidden = _e.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, hidden.find({ type: 'Text', text: /working/ })];
            case 6:
                _b.apply(void 0, [_e.sent()]).toBeUndefined();
                _c = testing_1.expect;
                return [4 /*yield*/, hidden.find({ type: 'Text', text: /engine/ })];
            case 7:
                _c.apply(void 0, [_e.sent()]).toBeDefined();
                return [4 /*yield*/, hidden.unmount()];
            case 8:
                _e.sent();
                return [4 /*yield*/, $.command.run(__assign({ command: 'team', args: '' }, TYPED))];
            case 9:
                _e.sent();
                return [4 /*yield*/, $.ui.mount(BAND)];
            case 10:
                back = _e.sent();
                _d = testing_1.expect;
                return [4 /*yield*/, back.find({ type: 'Text', text: /working/ })];
            case 11:
                _d.apply(void 0, [_e.sent()]).toBeDefined();
                return [4 /*yield*/, back.unmount()];
            case 12:
                _e.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('the dashboard fills the box it is given and follows the chosen teammate', function () {
    var team = (0, model_1.parse)(log);
    for (var _i = 0, _a = [[720, 1000], [1500, 820]]; _i < _a.length; _i++) {
        var _b = _a[_i], width = _b[0], height = _b[1];
        var svg = (0, dashboard_1.dashboardSvg)(team, 'office', 'dark', { width: width, height: height, selected: 'web-engineer', filter: 'all', isStill: true });
        (0, testing_1.expect)(svg).toContain("viewBox=\"0 0 ".concat(width, " ").concat(height, "\""));
        (0, testing_1.expect)(/&(?!amp;|lt;|gt;|quot;|#39;)/.test(svg)).toBe(false);
        // The badge names the chosen teammate; the chat keeps to their messages.
        (0, testing_1.expect)(svg).toContain('>web-engineer<');
        (0, testing_1.expect)(svg).toContain('OFF-TRACK web-engineer');
        // A still picture carries nothing that only makes sense in motion.
        (0, testing_1.expect)(svg).not.toContain('animateMotion');
    }
    var problems = (0, dashboard_1.dashboardSvg)(team, 'map', 'dark', { width: 720, height: 1000, selected: 'lead', filter: 'problem' });
    (0, testing_1.expect)(problems).toContain('OFF-TRACK web-engineer');
    // The lead's badge quotes their last message; with only problems shown, the chat no longer does.
    var all = (0, dashboard_1.dashboardSvg)(team, 'map', 'dark', { width: 720, height: 1000, selected: 'lead', filter: 'all' });
    (0, testing_1.expect)(all.split('Leave the table.').length - 1).toBe(2);
    (0, testing_1.expect)(problems.split('Leave the table.').length - 1).toBe(1);
});
(0, testing_1.test)('a click on the picture finds the teammate, tab, filter or step drawn there', function () {
    var team = (0, model_1.parse)(log);
    var at = function (hits, action) { return hits.find(function (h) { return h.action === action; }); };
    var centre = function (h) { return [h.x + h.w / 2, h.y + h.h / 2]; };
    // What readInput does with a click: the last box under the point.
    var under = function (hits, _a) {
        var _b;
        var x = _a[0], y = _a[1];
        return (_b = __spreadArray([], hits, true).reverse().find(function (h) { return x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h; })) === null || _b === void 0 ? void 0 : _b.action;
    };
    for (var _i = 0, _a = ['map', 'office', 'factory']; _i < _a.length; _i++) {
        var view = _a[_i];
        for (var _b = 0, _c = [[1368, 1020], [720, 1000]]; _b < _c.length; _b++) {
            var _d = _c[_b], width = _d[0], height = _d[1];
            var hits = [];
            (0, dashboard_1.dashboardSvg)(team, view, 'dark', { width: width, height: height, selected: 'lead', filter: 'all', hits: hits });
            for (var _e = 0, _f = ['view:map', 'view:office', 'view:factory', 'filter:problem', 'stage:build', 'jump:lead']; _e < _f.length; _e++) {
                var a = _f[_e];
                (0, testing_1.expect)(under(hits, centre(at(hits, a)))).toBe(a);
            }
            // Someone standing in the scene is picked over the room they stand in, and is drawn inside the picture.
            var who = hits.filter(function (h) { return h.action === 'who:accounts-engineer' && h.w < 80; });
            (0, testing_1.expect)(who.length).toBe(1);
            (0, testing_1.expect)(under(hits, centre(who[0]))).toBe('who:accounts-engineer');
            (0, testing_1.expect)(who[0].x).toBeGreaterThan(0);
            (0, testing_1.expect)(who[0].x + who[0].w).toBeLessThan(width);
        }
    }
});
(0, testing_1.test)('a picked step lists its issues in place of the chat', function () {
    var team = (0, model_1.parse)(log);
    var hits = [];
    var svg = (0, dashboard_1.dashboardSvg)(team, 'factory', 'dark', { width: 1368, height: 1020, selected: 'lead', filter: 'all', stage: 'build', hits: hits });
    (0, testing_1.expect)(svg).toContain('#12');
    (0, testing_1.expect)(svg).toContain('running');
    (0, testing_1.expect)(svg).not.toContain('Team chat');
    (0, testing_1.expect)(hits.some(function (h) { return h.action === 'who:accounts-engineer' && h.w > 80; })).toBe(true);
});
(0, testing_1.test)('the picture for rsvg-convert carries colours, not CSS variables', function () {
    var svg = (0, dashboard_1.flatSvg)((0, dashboard_1.dashboardSvg)((0, model_1.parse)(log), 'office', 'dark', { width: 1368, height: 1020, selected: 'lead', filter: 'all', isStill: true }));
    (0, testing_1.expect)(svg).not.toMatch(/fill="var\(/);
    (0, testing_1.expect)(svg).not.toMatch(/stroke="var\(/);
});
(0, testing_1.test)('a flagged teammate gets a needs-attention button, and a fresh alert a blinking ring', function () {
    var team = (0, model_1.parse)(log);
    var hits = [];
    var quiet = (0, dashboard_1.dashboardSvg)(team, 'office', 'dark', { width: 1368, height: 1020, selected: 'lead', filter: 'all', hits: hits });
    (0, testing_1.expect)(quiet).toContain('▲ web');
    (0, testing_1.expect)(quiet).not.toContain('class="blink"');
    var button = hits.find(function (h) { return h.action === 'who:web-engineer' && h.y < 72; });
    (0, testing_1.expect)(button).toBeDefined();
    var live = (0, dashboard_1.dashboardSvg)(team, 'office', 'dark', { width: 1368, height: 1020, selected: 'lead', filter: 'all', flash: ['web-engineer'] });
    (0, testing_1.expect)(live).toContain('class="blink"');
    // Frames freeze the blink alternately on and off, so the loop flashes in the terminal.
    var frame = function (k) { return (0, dashboard_1.dashboardSvg)(team, 'office', 'dark', { width: 1368, height: 1020, selected: 'lead', filter: 'all', flash: ['web-engineer'], phase: k / 6 }); };
    (0, testing_1.expect)(frame(0)).toContain('stroke="var(--bad)" stroke-width="3" opacity="1"');
    (0, testing_1.expect)(frame(1)).toContain('stroke="var(--bad)" stroke-width="3" opacity="0.15"');
});
(0, testing_1.test)('an issue keeps its title and each step with who had it and when', function () {
    var i = (0, model_1.parse)(log).issues.find(function (x) { return x.issue === 12; });
    (0, testing_1.expect)(i.title).toBe('invitations');
    (0, testing_1.expect)(i.steps.map(function (s) { return [s.kind, s.state]; })).toEqual([['build', 'run'], ['ui', 'done'], ['review', 'wait']]);
    (0, testing_1.expect)(i.steps[0].startTs).toBe('2026-10-31T10:01:00Z');
    (0, testing_1.expect)(i.steps[1].doneTs).toBe('2026-10-31T10:02:00Z');
});
(0, testing_1.test)('replaying reads the log only up to that moment', function () {
    var then = (0, model_1.parse)(log, '2026-10-31T10:00:30Z');
    (0, testing_1.expect)(then.issues.find(function (x) { return x.issue === 12; }).stages).toEqual({ build: 'wait', ui: 'wait', review: 'wait' });
    (0, testing_1.expect)(then.members.find(function (m) { return m.name === 'web-engineer'; }).isFlagged).toBe(false);
    (0, testing_1.expect)(then.lastTs).toBe('2026-10-31T10:00:03Z');
});
(0, testing_1.test)('a picked issue shows its steps and a GitLab button, and the strip replays and returns to live', function () {
    var team = (0, model_1.parse)(log);
    var hits = [];
    var timeline = { from: '2026-10-31T10:00:00Z', to: '2026-10-31T10:04:00Z', at: '2026-10-31T10:02:00Z', buckets: [3, 0, 2, 1] };
    var svg = (0, dashboard_1.dashboardSvg)(team, 'factory', 'dark', { width: 1368, height: 1020, selected: 'lead', filter: 'all', issue: 12, timeline: timeline, hits: hits });
    (0, testing_1.expect)(svg).toContain('#12');
    (0, testing_1.expect)(svg).toContain('since 10:01');
    (0, testing_1.expect)(svg).toContain('Open in GitLab');
    (0, testing_1.expect)(svg).toContain('REPLAY');
    (0, testing_1.expect)(svg).toContain('Back to live');
    (0, testing_1.expect)(svg).not.toContain('Team chat');
    var _loop_1 = function (a) {
        (0, testing_1.expect)(hits.some(function (h) { return h.action === a; })).toBe(true);
    };
    for (var _i = 0, _a = ['open:12', 'time:', 'live:']; _i < _a.length; _i++) {
        var a = _a[_i];
        _loop_1(a);
    }
    // The strip sits below everything else, inside the picture.
    var strip = hits.find(function (h) { return h.action === 'time:'; });
    (0, testing_1.expect)(strip.y + strip.h).toBeLessThanOrEqual(1020);
    (0, testing_1.expect)(hits.filter(function (h) { return h.action !== 'time:' && h.action !== 'live:'; }).every(function (h) { return h.y + h.h <= strip.y + 2; })).toBe(true);
    // A crate on the factory line opens its issue.
    var crates = [];
    (0, dashboard_1.dashboardSvg)(team, 'factory', 'dark', { width: 1368, height: 1020, selected: 'lead', filter: 'all', hits: crates });
    (0, testing_1.expect)(crates.some(function (h) { return h.action === 'issue:12'; })).toBe(true);
});
(0, testing_1.test)('a demo is badged, beside a replay, so neither passes for the live team', function () {
    var team = (0, model_1.parse)(log);
    var base = { width: 1200, height: 700, selected: 'lead', filter: 'all' };
    (0, testing_1.expect)((0, dashboard_1.dashboardSvg)(team, 'factory', 'dark', base)).not.toContain('DEMO');
    var both = (0, dashboard_1.dashboardSvg)(team, 'factory', 'dark', __assign(__assign({}, base), { isDemo: true, timeline: { from: '2026-10-31T10:00:00Z', to: '2026-10-31T10:04:00Z', at: '2026-10-31T10:02:00Z', buckets: [1, 2] } }));
    (0, testing_1.expect)(both).toContain('DEMO · not the real log');
    (0, testing_1.expect)(both).toContain('REPLAY 10-31 10:02 UTC');
});
(0, testing_1.test)('each step knows how long work queued there, and the longest queue is shaded on the rail', function () {
    var later = [
        { ts: '2026-10-31T10:30:00Z', event: 'PostToolUse', agent: 'accounts-engineer', tool: 'TaskUpdate', input: { taskId: '1', status: 'completed' } },
        { ts: '2026-10-31T11:10:00Z', event: 'PostToolUse', agent: 'lead', tool: 'SendMessage', input: { to: 'reviewer', message: 'Review #12 when free.' } },
    ].map(function (e) { return JSON.stringify(e); }).join('\n');
    var team = (0, model_1.parse)("".concat(log).concat(later, "\n"));
    var times = (0, model_1.stageTimes)(team);
    // Build was ready at creation (10:00) and started at 10:01, then took 29 minutes.
    (0, testing_1.expect)(times.build).toMatchObject({ started: 1, avgWaitMs: 60000, finished: 1, avgWorkMs: 29 * 60000, waiting: 0 });
    // Review became ready when its last blocker finished, 10:30, and nobody has started it by 11:10.
    (0, testing_1.expect)(times.review).toMatchObject({ waiting: 1, oldestMs: 40 * 60000, started: 0 });
    (0, testing_1.expect)((0, model_1.dur)(40000)).toBe('40s');
    (0, testing_1.expect)((0, model_1.dur)(40 * 60000)).toBe('40m');
    (0, testing_1.expect)((0, model_1.dur)(100 * 60000)).toBe('1h40');
    (0, testing_1.expect)((0, model_1.dur)(50 * 3600000)).toBe('2d2h');
    var base = { width: 1200, height: 700, selected: 'lead', filter: 'all' };
    var svg = (0, dashboard_1.dashboardSvg)(team, 'factory', 'dark', base);
    (0, testing_1.expect)(svg).toContain('1 ready 40m');
    // The bottleneck's shading: amber past half an hour.
    (0, testing_1.expect)(svg).toMatch(/fill="var\(--warn\)" fill-opacity="\.12"/);
    var card = (0, dashboard_1.dashboardSvg)(team, 'factory', 'dark', __assign(__assign({}, base), { issue: 12 }));
    (0, testing_1.expect)(card).toContain('Open 1h10');
    (0, testing_1.expect)(card).toContain('longest wait: Review 40m');
    (0, testing_1.expect)(card).toContain('10:01 → 10:30 · 29m');
    var list = (0, dashboard_1.dashboardSvg)(team, 'factory', 'dark', __assign(__assign({}, base), { stage: 'review' }));
    (0, testing_1.expect)(list).toContain('>ready 40m<');
});
(0, testing_1.test)('another team\'s names count, with areas from what they say, and none of the default roles appear', function () {
    var other = [
        { ts: '2026-10-31T09:00:00Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: 'Write the parser' }, response: { task: { id: '1' } } },
        { ts: '2026-10-31T09:00:05Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskUpdate', input: { taskId: '1', owner: 'backend-dev' } },
        { ts: '2026-10-31T09:01:00Z', event: 'PostToolUse', agent: 'backend-dev', tool: 'TaskUpdate', input: { taskId: '1', status: 'in_progress' } },
        { ts: '2026-10-31T09:02:00Z', event: 'PostToolUse', agent: 'lead', tool: 'SendMessage', input: { to: 'tester', message: 'Test the parser when it lands.' } },
        { ts: '2026-10-31T09:03:00Z', event: 'PostToolUse', agent: 'lead', tool: 'SendMessage', input: { to: '*', message: 'Stand-up in 5.' } },
        { ts: '2026-10-31T09:04:00Z', event: 'PostToolUse', agent: 'ux-designer', tool: 'SendMessage', input: { to: 'team-lead', message: 'Mock-ups are in.' } },
    ].map(function (e) { return JSON.stringify(e); }).join('\n');
    var team = (0, model_1.parse)(other);
    (0, testing_1.expect)(team.members.map(function (m) { return m.name; })).toEqual(['lead', 'backend-dev', 'tester', 'ux-designer']);
    (0, testing_1.expect)(team.members.find(function (m) { return m.name === 'backend-dev'; })).toMatchObject({ status: 'working', area: 'backend', task: 'Write the parser' });
    (0, testing_1.expect)([(0, model_1.areaOf)('tester'), (0, model_1.areaOf)('ux-designer'), (0, model_1.areaOf)('security-auditor'), (0, model_1.areaOf)('code-reviewer')]).toEqual(['qa', 'ui', 'sec', 'rev']);
    (0, testing_1.expect)([(0, model_1.initials)('backend-dev'), (0, model_1.initials)('tester'), (0, model_1.initials)('backend-dev-2'), (0, model_1.initials)('web-engineer')]).toEqual(['BD', 'T', 'BD2', 'W']);
    // Everything draws, though no task follows the "#n kind owner:" subjects.
    (0, testing_1.expect)((0, dashboard_1.dashboardSvg)(team, 'factory', 'dark', { width: 1200, height: 700, selected: 'lead', filter: 'all' })).toContain('backend-dev');
});
(0, testing_1.test)('the recorder turns the team\'s task files and messages into log lines the views read, and a shutdown keeps them', function () {
    var first = (0, recorder_1.taskEvents)('t1', {}, [
        { id: '1', subject: '#7 build backend-dev: the parser', status: 'in_progress', owner: 'backend-dev' },
        { id: '2', subject: '#7 review reviewer-bot: the parser', status: 'pending', blockedBy: ['1'] },
        { id: '3', subject: 'Tidy the README', status: 'pending' },
    ], '2026-10-31T09:00:00Z');
    var second = (0, recorder_1.taskEvents)('t1', first.tasks, [
        { id: '1', subject: '#7 build backend-dev: the parser', status: 'completed', owner: 'backend-dev' },
        { id: '2', subject: '#7 review reviewer-bot: the parser', status: 'pending', blockedBy: ['1'], owner: 'reviewer-bot' },
    ], '2026-10-31T09:30:00Z');
    // One task gone among others was deleted.
    (0, testing_1.expect)(second.lines).toContainEqual({ ts: '2026-10-31T09:30:00Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskUpdate', input: { taskId: 't1/3', status: 'deleted' } });
    // Every task gone at once is the team shut down: nothing is deleted, and the next team starts afresh.
    var over = (0, recorder_1.taskEvents)('t1', second.tasks, [], '2026-10-31T09:40:00Z');
    (0, testing_1.expect)(over).toEqual({ lines: [], tasks: {} });
    // A second team numbers its tasks from 1 again, without touching the first's.
    var next = (0, recorder_1.taskEvents)('t2', {}, [{ id: '1', subject: '#8 build backend-dev: the printer', status: 'completed', owner: 'backend-dev' }], '2026-10-31T10:00:00Z');
    (0, testing_1.expect)(next.lines.map(function (l) { var _a, _b, _c, _d, _e; return (_e = (_c = (_b = (_a = l.response) === null || _a === void 0 ? void 0 : _a.task) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : (_d = l.input) === null || _d === void 0 ? void 0 : _d.taskId) !== null && _e !== void 0 ? _e : l.task_id; })).toEqual(['t2/1', 't2/1', 't2/1']);
    // A message seen in an inbox and again in the lead's conversation is logged once.
    var inbox = (0, recorder_1.inboxMessages)({
        'reviewer-bot': [
            { from: 'team-lead', text: 'Review #7 next.', timestamp: '2026-10-31T09:31:10.120Z' },
            { from: 'team-lead', text: '{"type":"task_assignment","taskId":"2"}', timestamp: '2026-10-31T09:31:11.000Z' },
        ],
        'team-lead': [{ from: 'reviewer-bot', text: 'BLOCKED on #7: no fixtures', timestamp: '2026-10-31T09:32:00.000Z' }],
    });
    var seen = [];
    var lines = [];
    for (var _i = 0, inbox_1 = inbox; _i < inbox_1.length; _i++) {
        var m = inbox_1[_i];
        var r = (0, recorder_1.messageEvent)(m, seen);
        seen = r.seen;
        if (r.line)
            lines.push(r.line);
    }
    var delivered = (0, recorder_1.deliveredMessages)('<teammate-message teammate_id="reviewer-bot" color="green" summary="x">\nBLOCKED on #7: no fixtures\n</teammate-message>\n<teammate-message teammate_id="backend-dev">\n{"type":"idle_notification"}\n</teammate-message>');
    (0, testing_1.expect)(delivered).toEqual([{ from: 'reviewer-bot', text: 'BLOCKED on #7: no fixtures' }]);
    (0, testing_1.expect)((0, recorder_1.messageEvent)(__assign(__assign({}, delivered[0]), { to: 'lead', ms: Date.parse('2026-10-31T09:32:01Z') }), seen).line).toBeUndefined();
    (0, testing_1.expect)(lines).toEqual([
        { ts: '2026-10-31T09:31:10Z', event: 'PostToolUse', agent: 'lead', tool: 'SendMessage', input: { to: 'reviewer-bot', message: 'Review #7 next.' } },
        { ts: '2026-10-31T09:32:00Z', event: 'PostToolUse', agent: 'reviewer-bot', tool: 'SendMessage', input: { to: 'lead', message: 'BLOCKED on #7: no fixtures' } },
    ]);
    var team = (0, model_1.parse)(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], first.lines, true), second.lines, true), over.lines, true), lines, true).map(function (l) { return JSON.stringify(l); }).join('\n'));
    (0, testing_1.expect)(team.members.map(function (m) { return m.name; })).toEqual(['lead', 'backend-dev', 'reviewer-bot']);
    var issue = team.issues.find(function (i) { return i.issue === 7; });
    (0, testing_1.expect)(issue.stages).toEqual({ build: 'done', review: 'wait' });
    (0, testing_1.expect)(issue.steps.find(function (s) { return s.kind === 'build'; })).toMatchObject({ startTs: '2026-10-31T09:00:00Z', doneTs: '2026-10-31T09:30:00Z' });
    (0, testing_1.expect)(issue.steps.find(function (s) { return s.kind === 'review'; })).toMatchObject({ owner: 'reviewer-bot', readyTs: '2026-10-31T09:30:00Z' });
    (0, testing_1.expect)(team.members.find(function (m) { return m.name === 'reviewer-bot'; }).isFlagged).toBe(true);
});
(0, testing_1.test)('a project\'s settings name its own steps, words and roles, and their problems are told', function () {
    try {
        var problems = (0, model_1.configure)({
            steps: ['spec', { kind: 'code', label: 'Coding' }, 'code-review', 'ship', 'Bad Kind'],
            rework: { kind: 'redo', to: 'code' },
            words: { problem: ['blocked', 'help'], approve: ['lgtm'], nonsense: ['x'] },
            issueUrl: 'no-number-here',
            roles: { 'pm-bot': 'lead', dev: 'wizard' },
        });
        (0, testing_1.expect)(problems).toEqual([
            'steps: "Bad Kind" is not a task kind (lowercase letters, digits and dashes)',
            'words: "nonsense" is not problem, handoff, approve or merge',
            'issueUrl: needs an http(s) address with {n} where the issue number goes',
            'roles.dev: "wizard" is not one of lead, backend, ui, qa, sec or rev',
        ]);
        (0, testing_1.expect)((0, model_1.line)()).toEqual(['spec', 'code', 'code-review', 'ship']);
        // Own words replace a kind's defaults, as whole words anywhere near the start; other kinds keep theirs.
        (0, testing_1.expect)((0, model_1.classify)('Need help with the schema')).toBe('problem');
        (0, testing_1.expect)((0, model_1.classify)('helpful note')).toBe('note');
        (0, testing_1.expect)((0, model_1.classify)('LGTM, ship it')).toBe('approve');
        (0, testing_1.expect)((0, model_1.classify)('READY #3 code: done')).toBe('handoff');
        (0, testing_1.expect)((0, model_1.classify)('OFF-TRACK dev #3')).toBe('note');
        (0, testing_1.expect)((0, model_1.areaOf)('pm-bot')).toBe('lead');
        var log3 = [
            { ts: '2026-10-31T09:00:00Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#3 code dev: Login form' }, response: { task: { id: '1' } } },
            { ts: '2026-10-31T09:00:01Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#3 ship pm-bot: Login form' }, response: { task: { id: '2' } } },
            { ts: '2026-10-31T09:00:02Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#3 redo dev: Login form fixes' }, response: { task: { id: '3' } } },
            { ts: '2026-10-31T09:05:00Z', event: 'PostToolUse', agent: 'dev', tool: 'TaskUpdate', input: { taskId: '3', status: 'in_progress', owner: 'dev' } },
            { ts: '2026-10-31T09:06:00Z', event: 'PostToolUse', agent: 'dev', tool: 'TaskUpdate', input: { taskId: '1', status: 'completed' } },
        ].map(function (e) { return JSON.stringify(e); }).join('\n');
        var team = (0, model_1.parse)(log3);
        var issue = team.issues.find(function (i) { return i.issue === 3; });
        // The redo task sends #3 back to code, as rework; the title comes from the first step, there being no build.
        (0, testing_1.expect)(issue).toMatchObject({ isRework: true, at: 'code', title: 'Login form', isShipped: false });
        (0, testing_1.expect)(issue.steps.map(function (s) { return s.kind; })).toEqual(['code', 'redo', 'ship']);
        var svg = (0, dashboard_1.dashboardSvg)(team, 'factory', 'dark', { width: 1200, height: 700, selected: 'lead', filter: 'all', issue: 3, issueSite: 'GitHub' });
        (0, testing_1.expect)(svg).toContain('>Coding<');
        (0, testing_1.expect)(svg).toContain('Code review');
        (0, testing_1.expect)(svg).toContain('Open in GitHub');
        (0, testing_1.expect)(svg).not.toContain('API spec');
    }
    finally {
        (0, model_1.configure)(undefined);
    }
    (0, testing_1.expect)((0, model_1.line)()).toContain('security-review');
    (0, testing_1.expect)((0, model_1.classify)('OFF-TRACK dev #3')).toBe('problem');
});
(0, testing_1.test)('for a team that never uses the ship step, an issue is shipped once all of its tasks are done', function () {
    var done = [
        { ts: '2026-10-31T09:00:00Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#2 build dev: Multiply' }, response: { task: { id: '1' } } },
        { ts: '2026-10-31T09:01:00Z', event: 'TaskCompleted', agent: 'dev', task_id: '1', task_subject: '#2 build dev: Multiply', outcome: 'completed' },
        { ts: '2026-10-31T09:02:00Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#3 build dev: Divide' }, response: { task: { id: '2' } } },
        { ts: '2026-10-31T09:02:00Z', event: 'PostToolUse', agent: 'lead', tool: 'TaskCreate', input: { subject: '#3 merge lead: Divide' }, response: { task: { id: '3' } } },
        { ts: '2026-10-31T09:03:00Z', event: 'TaskCompleted', agent: 'dev', task_id: '2', task_subject: '#3 build dev: Divide', outcome: 'completed' },
    ].map(function (e) { return JSON.stringify(e); }).join('\n');
    var noShip = (0, model_1.parse)(done.split('\n').slice(0, 2).join('\n'));
    (0, testing_1.expect)(noShip.issues.find(function (i) { return i.issue === 2; })).toMatchObject({ isShipped: true, shipTs: '2026-10-31T09:01:00Z' });
    // A team that does merge creates an issue's tasks as it goes: #2, all done so far, waits for its next ones.
    var team = (0, model_1.parse)(done);
    (0, testing_1.expect)(team.issues.find(function (i) { return i.issue === 2; }).isShipped).toBe(false);
    (0, testing_1.expect)(team.issues.find(function (i) { return i.issue === 3; }).isShipped).toBe(false);
});
