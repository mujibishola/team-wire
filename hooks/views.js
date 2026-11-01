"use strict";
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
exports.altText = exports.svgView = exports.esc = exports.svgStyle = exports.textView = exports.messageLines = exports.summary = exports.stationName = exports.titled = exports.kindColor = exports.KIND_LABEL = exports.AREA_NAME = exports.AREA_COLOR = void 0;
var model_1 = require("./model");
// Raw colours that read on both a light and a dark terminal background.
exports.AREA_COLOR = {
    lead: '#e8930c', backend: '#1fb3a1', ui: '#8f7cf5', qa: '#43b05c', sec: '#e5575c', rev: '#3a9fe0',
};
exports.AREA_NAME = {
    lead: 'Lead', backend: 'Backend', ui: 'Web & mobile', qa: 'QA', sec: 'Security', rev: 'Review',
};
exports.KIND_LABEL = { handoff: 'hand-off', problem: 'problem', approve: 'approved', merge: 'merged', note: 'note' };
var KIND_KEY = { handoff: 'suggestion', problem: 'error', approve: 'success', merge: 'claude', note: 'subtle' };
var kindColor = function (k) { return KIND_KEY[k]; };
exports.kindColor = kindColor;
var stationOf = function (kind) { return (kind === (0, model_1.reworkOf)().kind ? (0, model_1.reworkOf)().to : kind); };
// A project's own label, else the kind itself: "code-review" reads "Code review", "qa" "QA".
var titled = function (k) { return (k.length <= 3 ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1).replace(/-/g, ' ')); };
exports.titled = titled;
var stationName = function (k) { var _a; return (_a = (0, model_1.labelOf)(k)) !== null && _a !== void 0 ? _a : (0, exports.titled)(k); };
exports.stationName = stationName;
var abbr = function (k) { var _a; return ((_a = (0, model_1.labelOf)(k)) !== null && _a !== void 0 ? _a : k).replace(/[^a-z0-9]/gi, '').slice(0, 3).toLowerCase(); };
var glyph = function (m) {
    return m.isFlagged ? { t: '▲', color: 'error' }
        : m.status === 'working' ? { t: '●', color: 'success' }
            : m.status === 'waiting' ? { t: '◷', color: 'warning' }
                : { t: '·', dim: true };
};
var taskShort = function (m) { return (m.issue !== undefined ? "#".concat(m.issue, " ").concat(m.kind) : m.name === 'lead' ? 'running the team' : 'free'); };
var pad = function (s, n) { return (s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length)); };
var cut = function (s, n) { return (n <= 1 ? '' : s.length > n ? s.slice(0, n - 1) + '…' : s); };
var summary = function (team) {
    var w = team.members.filter(function (m) { return m.status === 'working'; }).length;
    var q = team.members.filter(function (m) { return m.status === 'waiting'; }).length;
    var f = team.members.filter(function (m) { return m.isFlagged; }).length;
    var shipped = team.issues.filter(function (i) { return i.isShipped; }).length;
    return "".concat(w, " working \u00B7 ").concat(q, " waiting").concat(f ? " \u00B7 ".concat(f, " need attention") : '', " \u00B7 ").concat(shipped, "/").concat(team.issues.length, " issues merged");
};
exports.summary = summary;
var messageLines = function (team, cols, rows) {
    return team.messages.slice(-rows).reverse().map(function (m) {
        var _a, _b;
        return [
            { t: "".concat((0, model_1.hhmm)(m.ts), " "), dim: true },
            { t: (0, model_1.shortName)(m.from), color: exports.AREA_COLOR[(_b = (_a = team.members.find(function (x) { return x.name === m.from; })) === null || _a === void 0 ? void 0 : _a.area) !== null && _b !== void 0 ? _b : 'lead'] },
            { t: " \u2192 ".concat(m.to === 'lead' ? 'lead' : (0, model_1.shortName)(m.to), " "), dim: true },
            { t: "".concat(exports.KIND_LABEL[m.kind], " "), color: (0, exports.kindColor)(m.kind) },
            { t: cut(m.text.replace(/\s+/g, ' '), Math.max(10, cols - 36)) },
        ];
    });
};
exports.messageLines = messageLines;
/* ---------- terminal text ---------- */
var textMap = function (team, cols) {
    var _a, _b;
    var out = [[{ t: 'Who talks to whom', bold: true }, { t: ' · messages per pair', dim: true }]];
    var pairs = __spreadArray([], team.pairs, true).sort(function (a, b) { return b.n - a.n; });
    var max = Math.max.apply(Math, __spreadArray([1], pairs.map(function (p) { return p.n; }), false));
    var barW = Math.max(6, Math.min(24, cols - 42));
    var _loop_1 = function (p) {
        var filled = Math.max(1, Math.round((p.n / max) * barW));
        out.push([
            { t: pad((0, model_1.shortName)(p.a), 12) + ' ⇄ ' },
            { t: pad((0, model_1.shortName)(p.b), 12) + ' ' },
            { t: '█'.repeat(filled), color: exports.AREA_COLOR[(_b = (_a = team.members.find(function (m) { return m.name === (p.a === 'lead' ? p.b : p.a); })) === null || _a === void 0 ? void 0 : _a.area) !== null && _b !== void 0 ? _b : 'lead'] },
            { t: '░'.repeat(barW - filled) + " ".concat(p.n), dim: true },
        ]);
    };
    for (var _i = 0, _c = pairs.slice(0, 14); _i < _c.length; _i++) {
        var p = _c[_i];
        _loop_1(p);
    }
    if (!pairs.length)
        out.push([{ t: 'No messages yet.', dim: true }]);
    var talking = new Set(team.pairs.flatMap(function (p) { return [p.a, p.b]; }));
    var quiet = team.members.filter(function (m) { return !talking.has(m.name); }).map(function (m) { return (0, model_1.shortName)(m.name); });
    out.push([], [{ t: 'Quiet: ', dim: true }, { t: quiet.join(', ') || 'nobody' }]);
    return out;
};
var textOffice = function (team, cols) {
    var out = [];
    var _loop_2 = function (area) {
        var ms = team.members.filter(function (m) { return m.area === area; });
        if (!ms.length)
            return "continue";
        var title = " ".concat(exports.AREA_NAME[area], " ");
        out.push([{ t: '──' + title + '─'.repeat(Math.max(2, Math.min(cols, 60) - title.length - 2)), color: exports.AREA_COLOR[area] }]);
        for (var _b = 0, ms_1 = ms; _b < ms_1.length; _b++) {
            var m = ms_1[_b];
            out.push([{ t: '  ' }, glyph(m), { t: ' ' + pad((0, model_1.shortName)(m.name), 14) }, { t: cut(taskShort(m), cols - 20), dim: m.status === 'free' }]);
        }
    };
    for (var _i = 0, _a = Object.keys(exports.AREA_NAME); _i < _a.length; _i++) {
        var area = _a[_i];
        _loop_2(area);
    }
    return out;
};
var textFactory = function (team, cols) {
    var live = team.issues.filter(function (i) { return !i.isShipped && i.at !== undefined; });
    var shipped = team.issues.filter(function (i) { return i.isShipped; }).length;
    var queued = team.issues.filter(function (i) { return !i.isShipped && i.at === undefined; }).length;
    var workers = function (n) { return team.members.filter(function (m) { return m.status === 'working' && m.issue === n; }).map(function (m) { return (0, model_1.initials)(m.name); }).join(' '); };
    var out = [];
    if (cols >= 64) {
        out.push([{ t: 'issue ', dim: true }, { t: (0, model_1.line)().map(function (k) { return pad(abbr(k), 4); }).join(''), dim: true }]);
        for (var _i = 0, _a = live.slice(0, 16); _i < _a.length; _i++) {
            var i = _a[_i];
            var row = [{ t: pad("#".concat(i.issue), 6), color: i.isRework ? 'error' : exports.AREA_COLOR.lead }];
            for (var _b = 0, _c = (0, model_1.line)(); _b < _c.length; _b++) {
                var k = _c[_b];
                var s = i.stages[k];
                row.push(s === 'done' ? { t: '✓   ', color: 'success' } : s === 'run' ? { t: '▶   ', color: 'warning' } : s === 'wait' ? { t: '◷   ', dim: true } : { t: '    ' });
            }
            row.push({ t: workers(i.issue), dim: true });
            if (i.isRework)
                row.push({ t: ' rework', color: 'error' });
            out.push(row);
        }
    }
    else {
        for (var _d = 0, _e = live.slice(0, 16); _d < _e.length; _d++) {
            var i = _e[_d];
            var done = Object.values(i.stages).filter(function (s) { return s === 'done'; }).length;
            out.push([{ t: pad("#".concat(i.issue), 5), color: i.isRework ? 'error' : exports.AREA_COLOR.lead }, { t: "\u25B6 ".concat((0, exports.stationName)(i.at), " ") }, { t: "".concat(done, "/").concat(Object.keys(i.stages).length, " ").concat(workers(i.issue)), dim: true }]);
        }
    }
    if (!live.length)
        out.push([{ t: 'Nothing on the line.', dim: true }]);
    var breakRoom = team.members.filter(function (m) { return m.name !== 'lead' && m.status !== 'working'; }).map(function (m) { return (0, model_1.shortName)(m.name); });
    out.push([], [{ t: '🚚 ', dim: true }, { t: "".concat(shipped, " shipped"), color: 'success' }, { t: " \u00B7 ".concat(queued, " in the loading bay"), dim: true }]);
    out.push([{ t: 'Break room: ', dim: true }, { t: cut(breakRoom.join(', ') || 'empty', cols - 12) }]);
    return out;
};
var textView = function (team, view, cols) {
    return view === 'map' ? textMap(team, cols) : view === 'office' ? textOffice(team, cols) : textFactory(team, cols);
};
exports.textView = textView;
/* ---------- SVG (desktop, VS Code, mobile) ---------- */
var LIGHT = 'bg:#f7f8fa;surface:#ffffff;fg:#0f1420;muted:#606a7d;line:#e3e6ec;grid:#eceff3;belt:#c9ced8;belthi:#aab1be;on:#ffffff;lead:#e8890c;backend:#0d9f8f;ui:#7c5cf0;qa:#2f9e44;sec:#e5484d;rev:#0b8bd1;ok:#2f9e44;warn:#e8890c;bad:#e5484d;idle:#9aa3b3';
var DARK = 'bg:#0d1016;surface:#161a23;fg:#eef1f6;muted:#9aa3b5;line:#2a3140;grid:#161b25;belt:#2a3140;belthi:#3a4356;on:#0b0d12;lead:#ffa940;backend:#2fd3bf;ui:#a08bff;qa:#5cd36f;sec:#ff6b70;rev:#4cb8ff;ok:#5cd36f;warn:#ffa940;bad:#ff6b70;idle:#5f687a';
var vars = function (p) { return p.split(';').map(function (kv) { var _a = kv.split(':'), k = _a[0], v = _a[1]; return "--".concat(k, ":").concat(v); }).join(';'); };
var svgStyle = function (theme) { return "<style>\nsvg{".concat(vars(theme === 'dark' ? DARK : LIGHT), "}\n").concat(theme === 'auto' ? "@media (prefers-color-scheme:dark){svg{".concat(vars(DARK), "}}") : '', "\ntext{font-family:ui-monospace,Menlo,monospace}\n.lbl{font:600 11px ui-sans-serif,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}\n.sm{font-size:9.5px;fill:var(--muted)}\n.nm{font-size:10px;fill:var(--fg)}\n.ini{font:700 11px ui-sans-serif,system-ui,sans-serif;fill:var(--on)}\n.ml{font-size:9.5px;fill:var(--fg)}\n.spin{animation:spin 3s linear infinite;transform-box:fill-box;transform-origin:center}\n.pulse{animation:pulse 1s ease-in-out infinite;transform-box:fill-box;transform-origin:center}\n.belt{animation:belt 1s linear infinite}\n.blink{animation:blink 1s steps(2,jump-none) infinite}\n@keyframes blink{50%{opacity:.15}}\n@keyframes spin{to{transform:rotate(360deg)}}\n@keyframes pulse{50%{transform:scale(1.5);opacity:.4}}\n@keyframes belt{to{stroke-dashoffset:-16}}\n@media (prefers-reduced-motion:reduce){.spin,.pulse,.belt,.blink{animation:none}}\n</style>"); };
exports.svgStyle = svgStyle;
var esc = function (s) { return s.replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
exports.esc = esc;
var v = function (a) { return "var(--".concat(a, ")"); };
// The teammate picked in the pane, ringed in whichever view draws them; set by svgView for one synchronous draw.
var selected = '';
// A still picture (the terminal's PNG) leaves out what only makes sense moving: the planes and dots in flight.
var isStill = false;
// A frame of the terminal's animation: where in its loop (0 to 1) each moving thing is drawn, or null for none.
var phase = null;
var spots = null;
// Teammates with a fresh alert: a red ring blinks round them for a while.
var flashing = new Set();
// The point and heading `t` of the way along a path of one line (`M L`) or one quadratic curve (`M Q`).
var along = function (d, t) {
    var _a;
    var n = ((_a = d.match(/-?\d+(\.\d+)?/g)) !== null && _a !== void 0 ? _a : []).map(Number);
    if (n.length >= 6) {
        var _b = n, x1_1 = _b[0], y1_1 = _b[1], cx = _b[2], cy = _b[3], x2_1 = _b[4], y2_1 = _b[5];
        var x = Math.pow((1 - t), 2) * x1_1 + 2 * (1 - t) * t * cx + Math.pow(t, 2) * x2_1;
        var y = Math.pow((1 - t), 2) * y1_1 + 2 * (1 - t) * t * cy + Math.pow(t, 2) * y2_1;
        var dx = 2 * (1 - t) * (cx - x1_1) + 2 * t * (x2_1 - cx);
        var dy = 2 * (1 - t) * (cy - y1_1) + 2 * t * (y2_1 - cy);
        return [x, y, (Math.atan2(dy, dx) * 180) / Math.PI];
    }
    var _c = n[0], x1 = _c === void 0 ? 0 : _c, _d = n[1], y1 = _d === void 0 ? 0 : _d, _e = n[2], x2 = _e === void 0 ? 0 : _e, _f = n[3], y2 = _f === void 0 ? 0 : _f;
    return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI];
};
var person = function (m, x, y, opts) {
    var _a;
    if (opts === void 0) { opts = {}; }
    var r = opts.big ? 17 : 13;
    spots === null || spots === void 0 ? void 0 : spots.push({ action: "who:".concat(m.name), x: x, y: y, r: r + 6 });
    var ring = m.isFlagged ? 'bad' : m.status === 'working' ? 'ok' : m.status === 'waiting' ? 'warn' : 'idle';
    var spin = m.status === 'working' ? " stroke-dasharray=\"".concat(((r + 4) * 1.2).toFixed(1), " ").concat(((r + 4) * 0.37).toFixed(1), "\" class=\"spin\"") : '';
    var s = "<g transform=\"translate(".concat(x.toFixed(1), " ").concat(y.toFixed(1), ")\"><title>").concat((0, exports.esc)(m.name), ": ").concat((0, exports.esc)((_a = m.task) !== null && _a !== void 0 ? _a : m.status), "</title>");
    if (m.name === selected)
        s += "<circle r=\"".concat(r + 10, "\" fill=\"var(--fg)\" fill-opacity=\".08\" stroke=\"var(--fg)\" stroke-width=\"1.5\" stroke-dasharray=\"3 3\"/>");
    s += "<circle r=\"".concat(r + 4, "\" fill=\"none\" stroke=\"var(--").concat(ring, ")\" stroke-width=\"2.2\"").concat(spin, "/>");
    s += "<circle r=\"".concat(r, "\" fill=\"").concat(v(m.area), "\"/><text class=\"ini\" y=\"4\" text-anchor=\"middle\">").concat((0, exports.esc)((0, model_1.initials)(m.name)), "</text>");
    if (opts.hat)
        s += "<g transform=\"translate(0 ".concat(-r + 2, ")\"><path d=\"M-12 -8 A12 10 0 0 1 12 -8 Z\" fill=\"var(--warn)\"/><rect x=\"-14\" y=\"-9\" width=\"28\" height=\"3\" rx=\"1.5\" fill=\"var(--warn)\"/></g>");
    if (m.status === 'waiting' && !m.isFlagged)
        s += "<g transform=\"translate(".concat(r + 2, " ").concat(-r - 2, ")\"><circle r=\"6.5\" fill=\"var(--surface)\" stroke=\"var(--warn)\" stroke-width=\"1.5\"/><path d=\"M0 -3.5V0H3\" stroke=\"var(--warn)\" stroke-width=\"1.4\" fill=\"none\"/></g>");
    if (flashing.has(m.name))
        s += "<circle r=\"".concat(r + 13, "\" fill=\"none\" stroke=\"var(--bad)\" stroke-width=\"3\" class=\"blink\"/>");
    if (m.isFlagged)
        s += "<g transform=\"translate(".concat(-r - 2, " ").concat(-r - 2, ")\"><circle r=\"9\" fill=\"var(--bad)\" fill-opacity=\".35\" class=\"pulse\"/><circle r=\"5\" fill=\"var(--bad)\"/></g>");
    if (!opts.isNameless)
        s += "<text class=\"nm\" y=\"".concat(r + 16, "\" text-anchor=\"middle\">").concat((0, exports.esc)((0, model_1.shortName)(m.name)), "</text>");
    if (opts.label)
        s += "<text class=\"sm\" y=\"".concat(r + 27, "\" text-anchor=\"middle\">").concat((0, exports.esc)(opts.label), "</text>");
    return s + '</g>';
};
var frame = function (w, h, theme, body, pattern) {
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 ".concat(w, " ").concat(h, "\" width=\"").concat(w, "\" height=\"").concat(h, "\">").concat((0, exports.svgStyle)(theme), "<defs>").concat(pattern, "</defs><rect width=\"").concat(w, "\" height=\"").concat(h, "\" fill=\"var(--bg)\"/><rect width=\"").concat(w, "\" height=\"").concat(h, "\" fill=\"url(#p)\"/>").concat(body, "</svg>");
};
var isRecent = function (ts, last, minutes) { return Date.parse(last) - Date.parse(ts) < minutes * 60000; };
// A dot (or a plane) that keeps flying along a path while its pair is talking.
var flier = function (path, color, shape, dur) {
    if (dur === void 0) { dur = 2.2; }
    if (phase !== null) {
        var _a = along(path, phase), x = _a[0], y = _a[1], a = _a[2];
        var body_1 = shape === 'dot'
            ? "<circle r=\"5\" fill=\"".concat(color, "\"/><circle r=\"10\" fill=\"").concat(color, "\" fill-opacity=\".2\"/>")
            : "<path d=\"M-9,-6 L11,0 L-9,6 L-4,0 Z\" fill=\"var(--surface)\" stroke=\"".concat(color, "\" stroke-width=\"1.6\" stroke-linejoin=\"round\"/>");
        return "<g transform=\"translate(".concat(x.toFixed(1), " ").concat(y.toFixed(1), ")").concat(shape === 'plane' ? " rotate(".concat(a.toFixed(0), ")") : '', "\">").concat(body_1, "</g>");
    }
    if (isStill)
        return '';
    var body = shape === 'dot'
        ? "<circle r=\"5\" fill=\"".concat(color, "\"/><circle r=\"10\" fill=\"").concat(color, "\" fill-opacity=\".2\"/>")
        : "<path d=\"M-9,-6 L11,0 L-9,6 L-4,0 Z\" fill=\"var(--surface)\" stroke=\"".concat(color, "\" stroke-width=\"1.6\" stroke-linejoin=\"round\"/>");
    return "<g>".concat(body, "<animateMotion dur=\"").concat(dur, "s\" repeatCount=\"indefinite\" rotate=\"").concat(shape === 'plane' ? 'auto' : '0', "\" path=\"").concat(path, "\"/></g>");
};
var svgMap = function (team, theme) {
    var _a, _b;
    var W = 640, H = 440, cx = 320, cy = 220;
    var pos = new Map();
    var others = team.members.filter(function (m) { return m.name !== 'lead'; });
    pos.set('lead', [cx, cy]);
    others.forEach(function (m, i) {
        var a = -Math.PI / 2 + (i / Math.max(1, others.length)) * Math.PI * 2;
        pos.set(m.name, [cx + 250 * Math.cos(a), cy + 160 * Math.sin(a)]);
    });
    var path = function (a, b) {
        var _a = pos.get(a), x1 = _a[0], y1 = _a[1], _b = pos.get(b), x2 = _b[0], y2 = _b[1];
        if (a === 'lead' || b === 'lead')
            return { d: "M".concat(x1.toFixed(1), " ").concat(y1.toFixed(1), "L").concat(x2.toFixed(1), " ").concat(y2.toFixed(1)), mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
        var qx = (x1 + x2) / 2 + (cx - (x1 + x2) / 2) * 0.5, qy = (y1 + y2) / 2 + (cy - (y1 + y2) / 2) * 0.5;
        return { d: "M".concat(x1.toFixed(1), " ").concat(y1.toFixed(1), "Q").concat(qx.toFixed(1), " ").concat(qy.toFixed(1), " ").concat(x2.toFixed(1), " ").concat(y2.toFixed(1)), mx: 0.25 * x1 + 0.5 * qx + 0.25 * x2, my: 0.25 * y1 + 0.5 * qy + 0.25 * y2 };
    };
    var s = '';
    for (var _i = 0, _c = [90, 160, 230]; _i < _c.length; _i++) {
        var r = _c[_i];
        s += "<ellipse cx=\"".concat(cx, "\" cy=\"").concat(cy, "\" rx=\"").concat(r * 1.1, "\" ry=\"").concat(r * 0.7, "\" fill=\"none\" stroke=\"var(--grid)\"/>");
    }
    var max = Math.max.apply(Math, __spreadArray([1], team.pairs.map(function (p) { return p.n; }), false));
    var talking = new Set(team.pairs.flatMap(function (p) { return [p.a, p.b]; }));
    for (var _d = 0, others_1 = others; _d < others_1.length; _d++) {
        var m = others_1[_d];
        if (!talking.has(m.name))
            s += "<path d=\"".concat(path('lead', m.name).d, "\" stroke=\"var(--line)\" stroke-dasharray=\"2 5\" fill=\"none\"/>");
    }
    var _loop_3 = function (p) {
        if (!pos.has(p.a) || !pos.has(p.b))
            return "continue";
        var _k = path(p.a, p.b), d = _k.d, mx = _k.mx, my = _k.my;
        var area = (_b = (_a = team.members.find(function (m) { return m.name === (p.a === 'lead' ? p.b : p.a); })) === null || _a === void 0 ? void 0 : _a.area) !== null && _b !== void 0 ? _b : 'lead';
        s += "<path d=\"".concat(d, "\" fill=\"none\" stroke=\"").concat(v(area), "\" stroke-opacity=\".45\" stroke-width=\"").concat((1.5 + (p.n / max) * 6).toFixed(1), "\" stroke-linecap=\"round\"/>");
        if (isRecent(p.lastTs, team.lastTs, 10))
            s += flier(d, v(area), 'dot');
        if (p.n < max * 0.2)
            return "continue";
        s += "<circle cx=\"".concat(mx.toFixed(1), "\" cy=\"").concat(my.toFixed(1), "\" r=\"10\" fill=\"var(--surface)\" stroke=\"").concat(v(area), "\"/><text class=\"sm\" x=\"").concat(mx.toFixed(1), "\" y=\"").concat((my + 3).toFixed(1), "\" text-anchor=\"middle\" style=\"fill:var(--fg)\">").concat(p.n, "</text>");
    };
    for (var _e = 0, _f = team.pairs; _e < _f.length; _e++) {
        var p = _f[_e];
        _loop_3(p);
    }
    for (var _g = 0, _h = team.members; _g < _h.length; _g++) {
        var m = _h[_g];
        var _j = pos.get(m.name), x = _j[0], y = _j[1];
        s += person(m, x, y, { big: m.name === 'lead' });
    }
    return frame(W, H, theme, s, "<radialGradient id=\"p\" cx=\"50%\" cy=\"50%\" r=\"60%\"><stop offset=\"0\" stop-color=\"var(--surface)\"/><stop offset=\"1\" stop-color=\"var(--bg)\"/></radialGradient>");
};
var svgOffice = function (team, theme) {
    var _a, _b;
    var W = 900, H = 560, RW = 274, RH = 255;
    var rooms = [['backend', 20, 20], ['lead', 313, 20], ['ui', 606, 20], ['qa', 20, 290], ['sec', 313, 290], ['rev', 606, 290]];
    var pos = new Map();
    var s = '';
    var _loop_4 = function (area, rx, ry) {
        s += "<rect x=\"".concat(rx, "\" y=\"").concat(ry, "\" width=\"").concat(RW, "\" height=\"").concat(RH, "\" rx=\"18\" fill=\"").concat(v(area), "\" fill-opacity=\".06\" stroke=\"").concat(v(area), "\" stroke-opacity=\".35\"/>");
        s += "<text class=\"lbl\" x=\"".concat(rx + 16, "\" y=\"").concat(ry + 24, "\" fill=\"").concat(v(area), "\">").concat((0, exports.esc)(exports.AREA_NAME[area]), "</text>");
        var ms = team.members.filter(function (m) { return m.area === area; }).slice(0, 6);
        ms.forEach(function (m, i) {
            var cols = Math.min(3, ms.length);
            var x = rx + RW / 2 + ((i % 3) - (cols - 1) / 2) * 88;
            var y = ry + 62 + Math.floor(i / 3) * 100;
            var on = m.status === 'working';
            s += "<rect x=\"".concat(x - 36, "\" y=\"").concat(y - 14, "\" width=\"72\" height=\"28\" rx=\"8\" fill=\"var(--surface)\" stroke=\"var(--line)\"/>");
            s += "<rect x=\"".concat(x - 14, "\" y=\"").concat(y - 10, "\" width=\"28\" height=\"16\" rx=\"3\" fill=\"").concat(on ? v(m.area) : 'var(--line)', "\"").concat(on ? ' class="pulse"' : '', " fill-opacity=\"").concat(on ? 0.8 : 1, "\"/>");
            pos.set(m.name, [x, y + 38]);
            s += person(m, x, y + 38, { big: m.name === 'lead', label: m.issue !== undefined ? "#".concat(m.issue, " ").concat(m.kind) : m.name === 'lead' ? '' : 'free' });
        });
    };
    for (var _i = 0, rooms_1 = rooms; _i < rooms_1.length; _i++) {
        var _c = rooms_1[_i], area = _c[0], rx = _c[1], ry = _c[2];
        _loop_4(area, rx, ry);
    }
    // The latest messages keep flying as paper planes; the newest shows its words.
    var recent = team.messages.filter(function (m) { return isRecent(m.ts, team.lastTs, 5) && pos.has(m.from) && pos.has(m.to) && m.from !== m.to; }).slice(-3);
    var _loop_5 = function (m) {
        var _f = pos.get(m.from), x1 = _f[0], y1 = _f[1], _g = pos.get(m.to), x2 = _g[0], y2 = _g[1];
        var d = "M".concat(x1.toFixed(1), " ").concat(y1.toFixed(1), "Q").concat(((x1 + x2) / 2).toFixed(1), " ").concat((Math.min(y1, y2) - 90).toFixed(1), " ").concat(x2.toFixed(1), " ").concat(y2.toFixed(1));
        s += flier(d, v((_b = (_a = team.members.find(function (x) { return x.name === m.from; })) === null || _a === void 0 ? void 0 : _a.area) !== null && _b !== void 0 ? _b : 'lead'), 'plane', 2.6);
    };
    for (var _d = 0, recent_1 = recent; _d < recent_1.length; _d++) {
        var m = recent_1[_d];
        _loop_5(m);
    }
    var last = team.messages[team.messages.length - 1];
    if (last && pos.has(last.to)) {
        var _e = pos.get(last.to), x = _e[0], y = _e[1];
        var txt = cut(last.text.replace(/\s+/g, ' '), 40), w = txt.length * 6 + 24;
        var bx = Math.max(8, Math.min(W - w - 8, x - w / 2)), by = Math.max(6, y - 64);
        s += "<g><rect x=\"".concat(bx.toFixed(1), "\" y=\"").concat(by.toFixed(1), "\" width=\"").concat(w.toFixed(1), "\" height=\"24\" rx=\"12\" fill=\"var(--surface)\" stroke=\"var(--").concat(last.kind === 'problem' ? 'bad' : last.kind === 'approve' ? 'ok' : 'backend', ")\" stroke-width=\"1.5\"/><text class=\"ml\" x=\"").concat((bx + 12).toFixed(1), "\" y=\"").concat((by + 16).toFixed(1), "\">").concat((0, exports.esc)(txt), "</text></g>");
    }
    return frame(W, H, theme, s, "<pattern id=\"p\" width=\"24\" height=\"24\" patternUnits=\"userSpaceOnUse\"><circle cx=\"1\" cy=\"1\" r=\"1\" fill=\"var(--grid)\"/></pattern>");
};
var B1 = 170, B2 = 500;
// Where each step's station stands: the first half along line 1 left to right, the rest along line 2 right to left.
var stations = function () {
    var steps = (0, model_1.line)();
    var top = Math.ceil(steps.length / 2);
    var out = {};
    steps.forEach(function (k, i) {
        var onTop = i < top;
        var n = onTop ? top : steps.length - top;
        var j = onTop ? i : i - top;
        var t = n === 1 ? 0.5 : j / (n - 1);
        out[k] = onTop ? [Math.round(80 + t * 720), B1] : [Math.round(815 - t * 550), B2];
    });
    return out;
};
var crate = function (x, y, label, color) {
    spots === null || spots === void 0 ? void 0 : spots.push({ action: "issue:".concat(label.replace('#', '')), x: x, y: y, r: 16 });
    return "<g transform=\"translate(".concat(x, " ").concat(y, ")\"><rect x=\"-16\" y=\"-11\" width=\"32\" height=\"22\" rx=\"4\" fill=\"var(--surface)\" stroke=\"").concat(color, "\" stroke-width=\"2\"/><text class=\"sm\" y=\"3.5\" text-anchor=\"middle\" style=\"fill:var(--fg)\">").concat((0, exports.esc)(label), "</text></g>");
};
var svgFactory = function (team, theme) {
    var _a, _b;
    var W = 900, H = 600;
    var s = '';
    var at0 = stations();
    var belt = "M30 ".concat(B1, "H850Q872 ").concat(B1, " 872 ").concat(B1 + 22, "V").concat(B2 - 22, "Q872 ").concat(B2, " 850 ").concat(B2, "H150");
    s += "<path d=\"".concat(belt, "\" fill=\"none\" stroke=\"var(--belt)\" stroke-width=\"18\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>");
    s += "<path d=\"".concat(belt, "\" fill=\"none\" stroke=\"var(--belthi)\" stroke-width=\"2\" stroke-dasharray=\"6 10\" class=\"belt\"/>");
    var running = new Set(team.issues.flatMap(function (i) { return Object.entries(i.stages).filter(function (_a) {
        var st = _a[1];
        return st === 'run';
    }).map(function (_a) {
        var k = _a[0];
        return stationOf(k);
    }); }));
    for (var _i = 0, _c = Object.entries(at0); _i < _c.length; _i++) {
        var _d = _c[_i], k = _d[0], _e = _d[1], x = _e[0], y = _e[1];
        var on = running.has(k);
        s += "<rect x=\"".concat(x - 44, "\" y=\"").concat(y - 58, "\" width=\"88\" height=\"42\" rx=\"10\" fill=\"var(--surface)\" stroke=\"var(--line)\"/><text class=\"ml\" x=\"").concat(x, "\" y=\"").concat(y - 32, "\" text-anchor=\"middle\">").concat((0, exports.esc)((0, exports.stationName)(k)), "</text>");
        s += "<circle cx=\"".concat(x + 33, "\" cy=\"").concat(y - 49, "\" r=\"4\" fill=\"var(--").concat(on ? 'ok' : 'line', ")\"").concat(on ? ' class="pulse"' : '', "/>");
        if (on)
            s += "<g transform=\"translate(".concat(x - 33, " ").concat(y - 47, ")\"><circle r=\"5.5\" fill=\"none\" stroke=\"var(--muted)\" stroke-width=\"3\" stroke-dasharray=\"3 2.2\" class=\"spin\"/></g>");
    }
    // Middle band: break room, control room, loading bay.
    s += "<rect x=\"30\" y=\"285\" width=\"300\" height=\"112\" rx=\"16\" fill=\"var(--surface)\" stroke=\"var(--line)\"/><text class=\"lbl\" x=\"44\" y=\"306\" fill=\"var(--muted)\">Break room</text>";
    s += "<rect x=\"350\" y=\"285\" width=\"180\" height=\"112\" rx=\"16\" fill=\"var(--surface)\" stroke=\"var(--lead)\" stroke-opacity=\".6\"/><text class=\"lbl\" x=\"364\" y=\"306\" fill=\"var(--lead)\">Control room</text>";
    s += "<rect x=\"550\" y=\"285\" width=\"190\" height=\"112\" rx=\"16\" fill=\"var(--surface)\" stroke=\"var(--line)\"/><text class=\"lbl\" x=\"564\" y=\"306\" fill=\"var(--muted)\">Loading bay</text>";
    var queued = team.issues.filter(function (i) { return !i.isShipped && i.at === undefined; });
    queued.slice(0, 4).forEach(function (i, k) { return (s += crate(584 + (k % 4) * 40, 345, "#".concat(i.issue), 'var(--idle)')); });
    if (queued.length)
        s += "<text class=\"sm\" x=\"564\" y=\"385\">".concat(queued.length, " waiting to start</text>");
    else
        s += "<text class=\"sm\" x=\"564\" y=\"345\">empty</text>";
    // Dock and truck.
    var shipped = team.issues.filter(function (i) { return i.isShipped; });
    s += "<rect x=\"24\" y=\"".concat(B2 - 36, "\" width=\"104\" height=\"72\" rx=\"12\" fill=\"var(--surface)\" stroke=\"var(--line)\"/>");
    s += "<g><rect x=\"38\" y=\"".concat(B2 - 20, "\" width=\"46\" height=\"30\" rx=\"5\" fill=\"var(--fg)\" fill-opacity=\".85\"/><rect x=\"84\" y=\"").concat(B2 - 10, "\" width=\"18\" height=\"20\" rx=\"4\" fill=\"var(--fg)\" fill-opacity=\".7\"/><circle cx=\"52\" cy=\"").concat(B2 + 14, "\" r=\"5\" fill=\"var(--muted)\"/><circle cx=\"92\" cy=\"").concat(B2 + 14, "\" r=\"5\" fill=\"var(--muted)\"/></g>");
    s += "<text class=\"sm\" x=\"76\" y=\"".concat(B2 + 52, "\" text-anchor=\"middle\">").concat(shipped.length, " shipped</text>");
    // Crates at their stations.
    var at = new Map();
    for (var _f = 0, _g = team.issues; _f < _g.length; _f++) {
        var i = _g[_f];
        if (!i.isShipped && i.at && at0[i.at])
            at.set(i.at, __spreadArray(__spreadArray([], ((_a = at.get(i.at)) !== null && _a !== void 0 ? _a : []), true), [i], false));
    }
    var _loop_6 = function (k, list) {
        var _p = at0[k], x = _p[0], y = _p[1], cap = 3;
        list.slice(0, cap).forEach(function (i, n) { return (s += crate(x, y + (n === 0 ? 0 : 14 + n * 24), "#".concat(i.issue), i.isRework ? 'var(--bad)' : i.isActive ? 'var(--lead)' : 'var(--idle)')); });
        if (list.length > cap)
            s += "<text class=\"sm\" x=\"".concat(x + 22, "\" y=\"").concat(y + 14 + cap * 24, "\">+").concat(list.length - cap, "</text>");
    };
    for (var _h = 0, at_1 = at; _h < at_1.length; _h++) {
        var _j = at_1[_h], k = _j[0], list = _j[1];
        _loop_6(k, list);
    }
    // People: at the station of the task they're on, else the control or break room.
    var byStation = new Map();
    var resting = [];
    for (var _k = 0, _l = team.members; _k < _l.length; _k++) {
        var m = _l[_k];
        if (m.name === 'lead')
            continue;
        var st = stationOf(m.kind);
        if (m.status === 'working' && st && at0[st])
            byStation.set(st, __spreadArray(__spreadArray([], ((_b = byStation.get(st)) !== null && _b !== void 0 ? _b : []), true), [m], false));
        else
            resting.push(m);
    }
    var _loop_7 = function (k, ms) {
        var _q = at0[k], x = _q[0], y = _q[1];
        ms.slice(0, 3).forEach(function (m, i) {
            s += person(m, x + (i - (Math.min(3, ms.length) - 1) / 2) * 38, y - 84, { hat: true, isNameless: true });
        });
        if (ms.length > 3)
            s += "<text class=\"sm\" x=\"".concat(x + 58, "\" y=\"").concat(y - 80, "\">+").concat(ms.length - 3, "</text>");
    };
    // Crowded spots show initials only; the name is in each avatar's tooltip.
    for (var _m = 0, byStation_1 = byStation; _m < byStation_1.length; _m++) {
        var _o = byStation_1[_m], k = _o[0], ms = _o[1];
        _loop_7(k, ms);
    }
    // Twelve seats: whoever needs attention sits first, so their ring is never the one left out.
    resting.sort(function (a, b) { return Number(b.isFlagged || flashing.has(b.name)) - Number(a.isFlagged || flashing.has(a.name)); });
    resting.slice(0, 12).forEach(function (m, k) { return (s += person(m, 60 + (k % 6) * 46, 334 + Math.floor(k / 6) * 40, { hat: true, isNameless: true })); });
    if (resting.length > 12)
        s += "<text class=\"sm\" x=\"300\" y=\"392\">+".concat(resting.length - 12, "</text>");
    var lead = team.members.find(function (m) { return m.name === 'lead'; });
    if (lead)
        s += person(lead, 440, 352, { big: true });
    return frame(W, H, theme, s, "<pattern id=\"p\" width=\"40\" height=\"40\" patternUnits=\"userSpaceOnUse\"><path d=\"M40 0H0V40\" fill=\"none\" stroke=\"var(--grid)\"/></pattern>");
};
var svgView = function (team, view, theme, sel, still, at, out, flash) {
    if (sel === void 0) { sel = ''; }
    if (still === void 0) { still = false; }
    if (at === void 0) { at = null; }
    if (flash === void 0) { flash = []; }
    selected = sel;
    flashing = new Set(flash);
    isStill = still;
    phase = at;
    spots = out !== null && out !== void 0 ? out : null;
    try {
        return view === 'map' ? svgMap(team, theme) : view === 'office' ? svgOffice(team, theme) : svgFactory(team, theme);
    }
    finally {
        selected = '';
        isStill = false;
        phase = null;
        spots = null;
        flashing = new Set();
    }
};
exports.svgView = svgView;
var altText = function (team, view) {
    return "Team ".concat(view, ": ").concat((0, exports.summary)(team), ". ") +
        team.members.filter(function (m) { return m.status === 'working'; }).map(function (m) { return "".concat(m.name, " on ").concat(taskShort(m)); }).join('; ');
};
exports.altText = altText;
