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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
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
exports.register = void 0;
var claude_code_1 = require("claude-code");
var dashboard_1 = require("./dashboard");
var model_1 = require("./model");
var recorder_1 = require("./recorder");
var views_1 = require("./views");
var PANE = 'team-wire';
var VIEWS = ['map', 'office', 'factory'];
var LABEL = { map: 'Map', office: 'Office', factory: 'Factory' };
var FILTERS = ['all', 'handoff', 'problem'];
var FILTER_LABEL = { all: 'All', handoff: 'Hand-offs', problem: 'Problems' };
var POLL_MS = 3000;
// fs.read refuses files over 4 MiB; past this the log is read by its tail.
var READ_LIMIT = 3.5 * 1024 * 1024;
var TAIL_LINES = '20000';
// The band shows only while the team has logged something this recently.
var BAND_FRESH_MS = 2 * 60 * 60 * 1000;
var CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
var MAGICKS = ['/opt/homebrew/bin/magick', '/usr/local/bin/magick', '/usr/bin/magick'];
// Draws a frame in about 0.3 s where Chrome takes 4 to 5, so a click answers at once; Chrome stays as the fallback.
var RSVGS = ['/opt/homebrew/bin/rsvg-convert', '/usr/local/bin/rsvg-convert', '/usr/bin/rsvg-convert'];
// A fresh alert's ring blinks this long round whoever must act on it.
var FLASH_MS = 2 * 60 * 1000;
// Replay steps: [ and ] move ten minutes, { and } an hour. The strip shows the log's span in this many slices.
var STEP_MS = 10 * 60 * 1000;
var BIG_STEP_MS = 60 * 60 * 1000;
var BUCKETS = 120;
// How often clicks and keys from the screen are picked up.
var INPUT_MS = 120;
// The terminal's animation: a loop of frames swapped into the picture in place. Each frame is a whole PNG sent
// through tmux to the terminal, so few and small: drawn at 1x, about 150 KB each.
var FRAMES = 6;
var FRAME_MS = 500;
// A terminal cell in pixels, near enough for iTerm2's default font: sizes the picture to the pane's box of cells.
var CELL_W = 8;
var CELL_H = 17;
// Rows the controls above the picture take.
var CONTROL_ROWS = 3;
// The dock's widest: Claude Code caps a docked pane at 45% of the terminal, so this asks for all of that.
var PANE_COLUMNS = 255;
// The Team screen (bin/screen.py in a tmux pane) refreshes screen.json about twice a second; older than this, it
// has closed and the pictures come back into the pane.
var SCREEN_FRESH_MS = 5000;
// The share of the tmux window `/team screen` gives the screen, leaving the rest to Claude.
var SCREEN_SHARE = '70%';
// Change a tag when that value's fields change: it declines what an earlier
// version stored, which outlives a reload.
var team = (0, claude_code_1.atom)({ plugin: 'team-wire', key: 'team' }, null, { shape: 'team-2' });
var view = (0, claude_code_1.atom)({ plugin: 'team-wire', key: 'view' }, 'factory', { shape: 'view-1' });
// `/team off` hides the pane and the summary line, across sessions, until `/team` again.
var isOff = (0, claude_code_1.atom)({ plugin: 'team-wire', key: 'isOff' }, false, { shape: 'off-1' });
// The terminal shows no SVG, so the pane is drawn to a PNG by headless Chrome and shown as a picture;
// `/team text` keeps to the text version (a terminal without pictures, or tmux without passthrough).
var picture = (0, claude_code_1.atom)({ plugin: 'team-wire', key: 'picture' }, null, { shape: 'picture-3' });
var isText = (0, claude_code_1.atom)({ plugin: 'team-wire', key: 'isText' }, false, { shape: 'text-1' });
// Who the badge shows and the chat follows; which messages the chat shows.
var selected = (0, claude_code_1.atom)({ plugin: 'team-wire', key: 'selected' }, 'lead', { shape: 'selected-1' });
var filter = (0, claude_code_1.atom)({ plugin: 'team-wire', key: 'filter' }, 'all', { shape: 'filter-1' });
// `/team still` shows one picture; `/team live` (the default) plays the frames.
var isStill = (0, claude_code_1.atom)({ plugin: 'team-wire', key: 'isStill' }, false, { shape: 'still-1' });
var screen = (0, claude_code_1.atom)({ plugin: 'team-wire', key: 'screen' }, null, { shape: 'screen-2' });
var stage = (0, claude_code_1.atom)({ plugin: 'team-wire', key: 'stage' }, '', { shape: 'stage-1' });
var issuePick = (0, claude_code_1.atom)({ plugin: 'team-wire', key: 'issue' }, 0, { shape: 'issue-1' });
var replayAt = (0, claude_code_1.atom)({ plugin: 'team-wire', key: 'replayAt' }, '', { shape: 'replay-1' });
// Set at session start: where pictures are drawn (the main checkout's .team/wire) and with what.
var wireDir = '';
var chrome = '';
var magick = '';
var rsvg = '';
// What the picture on the screen has where, in its pixels, and its size: a click is matched against it.
var hits = [];
var hitSize = { width: 0, height: 0 };
// How far into input.jsonl the screen's clicks and keys have been handled.
var inputAt = 0;
// The newest problem message already announced; teammates whose ring blinks, until when; whether alerts sound.
var alertedTs = '';
var flashUntil = new Map();
var isSound = true;
// The log as last read, for replaying it; its span and how busy each slice was; the replayed team, by moment.
var logText = '';
var timeline = { from: '', to: '', at: '', buckets: [] };
var replayed = { at: '', team: null };
// The team's log, and the copy /team demo reads instead so alerts can be tried without writing to the real one.
// Where announcements had got to in the real log when the demo began: what arrived meanwhile is announced on return.
var logPath = '';
var isDemo = false;
var realAlertedTs = '';
var logSeen = '';
// A project with no team log of its own gets one recorded from Claude Code's team files by the lead's session
// (hooks/recorder.ts): the team it leads, once found, what the last look saw, and each task file's last change.
var isRecording = false;
var home = '';
var sessionId = '';
var recTeam = '';
var recorded = { tasks: {}, seen: [] };
var taskSeen = new Map();
// The project's settings (.claude/team-wire.json): where, as last read, what was wrong with it, and a count of the
// times it changed, which the picture's key carries so a change redraws it.
var settingsPath = '';
var settingsSig = '';
var settingsProblems = [];
var settingsVersion = 0;
// The project's GitLab page, for "Open in GitLab".
var projectUrl = '';
// The frames of the current loop (base64 PNGs), the one on show, and the Image's size in cells, which a swap names.
var frames = [];
var frameAt = 0;
var imageBox = { cols: 0, rows: 0 };
// The pane's body in cells, as last drawn; the next picture is drawn to fit it.
var box = { cols: 0, rows: 0 };
var isPainting = false;
var isStale = false;
// The screen's bottom line: what the last click or key did, so an action is acknowledged before its picture lands.
var say = function ($, text) {
    return wireDir ? $.fs.write("".concat(wireDir, "/status.txt"), "".concat(text, "\n")).catch(function () { return undefined; }) : undefined;
};
var isView = function (x) { return typeof x === 'string' && VIEWS.includes(x); };
// Teammates work in .worktrees/<name>; the log lives in the main checkout.
var rootOf = function ($, cwd) { return __awaiter(void 0, void 0, void 0, function () {
    var git, common;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, $.process
                    .run(['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: cwd })
                    .catch(function () { return undefined; })];
            case 1:
                git = _a.sent();
                common = (git === null || git === void 0 ? void 0 : git.exitCode) === 0 ? git.stdout.trim() : '';
                return [2 /*return*/, common ? common.replace(/\/\.git$/, '') : cwd.replace(/\/\.worktrees\/.*$/, '')];
        }
    });
}); };
var themeOf = function ($) { return __awaiter(void 0, void 0, void 0, function () {
    var row, value;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, $.config.list().catch(function () { return []; })];
            case 1:
                row = (_b.sent()).find(function (r) { return r.key === 'theme'; });
                value = String((_a = row === null || row === void 0 ? void 0 : row.value) !== null && _a !== void 0 ? _a : '');
                return [2 /*return*/, value.startsWith('light') ? 'light' : value.startsWith('dark') ? 'dark' : 'auto'];
        }
    });
}); };
var pictureSize = function (cols, rows) { return ({
    width: Math.max(480, cols * CELL_W),
    height: Math.max(420, Math.max(1, rows - CONTROL_ROWS) * CELL_H),
}); };
var run = function ($, argv) { return $.process.run(argv).then(function (r) { return r.exitCode === 0; }).catch(function () { return false; }); };
// One SVG to a PNG with rsvg-convert, written whole and then swapped in, so no reader sees half a file.
var rsvgTo = function ($_1, svg_1, name_1) {
    var args_1 = [];
    for (var _i = 3; _i < arguments.length; _i++) {
        args_1[_i - 3] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([$_1, svg_1, name_1], args_1, true), void 0, function ($, svg, name, zoom) {
        if (zoom === void 0) { zoom = 1; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, $.fs.write("".concat(wireDir, "/").concat(name, ".svg"), (0, dashboard_1.flatSvg)(svg))];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, run($, [rsvg, '-z', String(zoom), '-o', "".concat(wireDir, "/").concat(name, ".tmp.png"), "".concat(wireDir, "/").concat(name, ".svg")])];
                case 2: return [2 /*return*/, (_a.sent())
                        && run($, ['mv', '-f', "".concat(wireDir, "/").concat(name, ".tmp.png"), "".concat(wireDir, "/").concat(name, ".png")])];
            }
        });
    });
};
var png = function ($, name) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
    switch (_a.label) {
        case 0: return [4 /*yield*/, $.fs.read("".concat(wireDir, "/").concat(name, ".png"), { as: 'bytes' })];
        case 1: return [2 /*return*/, (_a.sent()).base64
            // Headless Chrome writes the shot in about a second, then hangs ~15 s tearing down and exits 2. Its "bytes
            // written" line is taken as done; leaving the loop kills it.
        ];
    }
}); }); };
// Headless Chrome writes the shot in about a second, then hangs ~15 s tearing down and exits 2. Its "bytes
// written" line is taken as done; leaving the loop kills it.
var chromeTo = function ($, svg, width, height, scale) { return __awaiter(void 0, void 0, void 0, function () {
    var shot, _a, shot_1, shot_1_1, chunk, e_1_1;
    var _b, e_1, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0: return [4 /*yield*/, $.fs.write("".concat(wireDir, "/view.svg"), svg)];
            case 1:
                _e.sent();
                shot = $.process.spawn({
                    argv: [
                        chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars',
                        "--force-device-scale-factor=".concat(scale),
                        "--user-data-dir=".concat(wireDir, "/chrome"),
                        "--window-size=".concat(width, ",").concat(height),
                        "--screenshot=".concat(wireDir, "/next.png"),
                        "file://".concat(wireDir, "/view.svg"),
                    ],
                });
                _e.label = 2;
            case 2:
                _e.trys.push([2, 7, 8, 13]);
                _a = true, shot_1 = __asyncValues(shot);
                _e.label = 3;
            case 3: return [4 /*yield*/, shot_1.next()];
            case 4:
                if (!(shot_1_1 = _e.sent(), _b = shot_1_1.done, !_b)) return [3 /*break*/, 6];
                _d = shot_1_1.value;
                _a = false;
                chunk = _d;
                if (/bytes written to file/.test(chunk.text))
                    return [2 /*return*/, true];
                _e.label = 5;
            case 5:
                _a = true;
                return [3 /*break*/, 3];
            case 6: return [3 /*break*/, 13];
            case 7:
                e_1_1 = _e.sent();
                e_1 = { error: e_1_1 };
                return [3 /*break*/, 13];
            case 8:
                _e.trys.push([8, , 11, 12]);
                if (!(!_a && !_b && (_c = shot_1.return))) return [3 /*break*/, 10];
                return [4 /*yield*/, _c.call(shot_1)];
            case 9:
                _e.sent();
                _e.label = 10;
            case 10: return [3 /*break*/, 12];
            case 11:
                if (e_1) throw e_1.error;
                return [7 /*endfinally*/];
            case 12: return [7 /*endfinally*/];
            case 13: return [2 /*return*/, false];
        }
    });
}); };
// Draws the picture while Claude's pane shows it or the screen runs. One drawing at a time; a change meanwhile
// draws again once it ends. With rsvg-convert the first frame shows as soon as it is drawn and the rest of the loop
// follows; a click meanwhile drops the rest and starts over.
var paint = function ($) { return __awaiter(void 0, void 0, void 0, function () {
    var _loop_1, state_1, _a;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if ((!rsvg && !chrome) || !wireDir)
                    return [2 /*return*/];
                if (isPainting) {
                    isStale = true;
                    return [2 /*return*/];
                }
                isPainting = true;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 6, 7, 8]);
                _loop_1 = function () {
                    var live, _d, _e, at, t, scr, _f, _g, v, sel, f, st, isLive, _h, theme, drawn, _j, width, height, flash, _k, iss, key, opts, drawnHits, done, first, rest, list, k, _l, _m, svg, list, k, _o, _p;
                    return __generator(this, function (_q) {
                        switch (_q.label) {
                            case 0:
                                isStale = false;
                                return [4 /*yield*/, (0, claude_code_1.read)($, team)];
                            case 1:
                                live = _q.sent();
                                _e = !live;
                                if (_e) return [3 /*break*/, 3];
                                return [4 /*yield*/, (0, claude_code_1.read)($, isOff)];
                            case 2:
                                _e = (_q.sent());
                                _q.label = 3;
                            case 3:
                                _d = _e;
                                if (_d) return [3 /*break*/, 5];
                                return [4 /*yield*/, (0, claude_code_1.read)($, isText)];
                            case 4:
                                _d = (_q.sent());
                                _q.label = 5;
                            case 5:
                                if (_d)
                                    return [2 /*return*/, { value: void 0 }];
                                return [4 /*yield*/, (0, claude_code_1.read)($, replayAt)];
                            case 6:
                                at = _q.sent();
                                t = at ? teamAt(at) : live;
                                return [4 /*yield*/, (0, claude_code_1.read)($, screen)];
                            case 7:
                                scr = _q.sent();
                                _f = !scr;
                                if (!_f) return [3 /*break*/, 10];
                                _g = !box.cols;
                                if (_g) return [3 /*break*/, 9];
                                return [4 /*yield*/, $.ui.panes()];
                            case 8:
                                _g = !(_q.sent()).some(function (p) { return p.id === PANE; });
                                _q.label = 9;
                            case 9:
                                _f = (_g);
                                _q.label = 10;
                            case 10:
                                if (_f)
                                    return [2 /*return*/, { value: void 0 }];
                                return [4 /*yield*/, (0, claude_code_1.read)($, view)];
                            case 11:
                                v = _q.sent();
                                return [4 /*yield*/, (0, claude_code_1.read)($, selected)];
                            case 12:
                                sel = _q.sent();
                                return [4 /*yield*/, (0, claude_code_1.read)($, filter)];
                            case 13:
                                f = _q.sent();
                                return [4 /*yield*/, (0, claude_code_1.read)($, stage)];
                            case 14:
                                st = _q.sent();
                                _h = (rsvg !== '' || magick !== '');
                                if (!_h) return [3 /*break*/, 16];
                                return [4 /*yield*/, (0, claude_code_1.read)($, isStill)];
                            case 15:
                                _h = !(_q.sent());
                                _q.label = 16;
                            case 16:
                                isLive = _h;
                                return [4 /*yield*/, themeOf($)
                                    // Headless renderers read as light; a terminal with no theme set is most often dark.
                                ];
                            case 17:
                                theme = _q.sent();
                                drawn = theme === 'auto' ? 'dark' : theme;
                                _j = scr
                                    ? { width: Math.max(480, Math.round(scr.cols * scr.cellW)), height: Math.max(420, Math.round((scr.rows - 1) * scr.cellH)) }
                                    : pictureSize(box.cols, box.rows), width = _j.width, height = _j.height;
                                if (!at) return [3 /*break*/, 18];
                                _k = [];
                                return [3 /*break*/, 20];
                            case 18: return [4 /*yield*/, flashing($)];
                            case 19:
                                _k = _q.sent();
                                _q.label = 20;
                            case 20:
                                flash = _k;
                                return [4 /*yield*/, (0, claude_code_1.read)($, issuePick)];
                            case 21:
                                iss = _q.sent();
                                key = [settingsVersion, isDemo ? 'demo' : 'real', v, sel, f, st, iss, at, flash.join(','), drawn, width, height, isLive ? 'live' : 'still', t.lastTs, live.lastTs, t.messages.length].join('|');
                                return [4 /*yield*/, (0, claude_code_1.read)($, picture)];
                            case 22:
                                if (((_b = (_q.sent())) === null || _b === void 0 ? void 0 : _b.key) === key && (!isLive || frames.length))
                                    return [2 /*return*/, "continue"];
                                opts = __assign(__assign({ width: width, height: height, selected: sel, filter: f, stage: st, flash: flash, isStill: true, isDemo: isDemo, issueSite: issueSite() }, (iss ? { issue: iss } : {})), (scr && timeline.from ? { timeline: __assign(__assign({}, timeline), { at: at }) } : {}));
                                drawnHits = [];
                                done = function (n, list) { return __awaiter(void 0, void 0, void 0, function () {
                                    var next;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                frames = list;
                                                hits = drawnHits;
                                                hitSize = { width: width, height: height };
                                                // Written last, so the screen reads only finished frames: their count (0 for the one view.png) and the key.
                                                return [4 /*yield*/, $.fs.write("".concat(wireDir, "/ready.txt"), "".concat(n, " ").concat(key).concat(n === 1 && isLive ? '|first' : '', "\n"))];
                                            case 1:
                                                // Written last, so the screen reads only finished frames: their count (0 for the one view.png) and the key.
                                                _a.sent();
                                                next = { key: n === 1 && isLive ? "".concat(key, "|first") : key, view: v, width: width, height: height };
                                                return [4 /*yield*/, (0, claude_code_1.update)($, picture, function () { return next; })];
                                            case 2:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); };
                                if (!rsvg) return [3 /*break*/, 36];
                                if (!!isLive) return [3 /*break*/, 25];
                                return [4 /*yield*/, rsvgTo($, (0, dashboard_1.dashboardSvg)(t, v, drawn, __assign(__assign({}, opts), { hits: drawnHits })), 'view', 2)];
                            case 23:
                                if (!(_q.sent()))
                                    return [2 /*return*/, { value: void 0 }];
                                return [4 /*yield*/, done(0, [])];
                            case 24:
                                _q.sent();
                                return [2 /*return*/, "continue"];
                            case 25: return [4 /*yield*/, rsvgTo($, (0, dashboard_1.dashboardSvg)(t, v, drawn, __assign(__assign({}, opts), { phase: 0, hits: drawnHits })), 'frame-0')];
                            case 26:
                                if (!(_q.sent()))
                                    return [2 /*return*/, { value: void 0 }];
                                return [4 /*yield*/, run($, ['cp', '-f', "".concat(wireDir, "/frame-0.png"), "".concat(wireDir, "/view.png")])];
                            case 27:
                                _q.sent();
                                return [4 /*yield*/, png($, 'frame-0')];
                            case 28:
                                first = _q.sent();
                                return [4 /*yield*/, done(1, [first])];
                            case 29:
                                _q.sent();
                                if (isStale)
                                    return [2 /*return*/, "continue"];
                                return [4 /*yield*/, Promise.all(Array.from({ length: FRAMES - 1 }, function (_, i) {
                                        return rsvgTo($, (0, dashboard_1.dashboardSvg)(t, v, drawn, __assign(__assign({}, opts), { phase: (i + 1) / FRAMES })), "frame-".concat(i + 1));
                                    }))];
                            case 30:
                                rest = _q.sent();
                                if (isStale || rest.some(function (ok) { return !ok; }))
                                    return [2 /*return*/, "continue"];
                                list = [first];
                                k = 1;
                                _q.label = 31;
                            case 31:
                                if (!(k < FRAMES)) return [3 /*break*/, 34];
                                _m = (_l = list).push;
                                return [4 /*yield*/, png($, "frame-".concat(k))];
                            case 32:
                                _m.apply(_l, [_q.sent()]);
                                _q.label = 33;
                            case 33:
                                k++;
                                return [3 /*break*/, 31];
                            case 34: return [4 /*yield*/, done(FRAMES, list)];
                            case 35:
                                _q.sent();
                                return [2 /*return*/, "continue"];
                            case 36:
                                svg = isLive ? (0, dashboard_1.spriteSvg)(t, v, drawn, __assign(__assign({}, opts), { hits: drawnHits }), FRAMES) : (0, dashboard_1.dashboardSvg)(t, v, drawn, __assign(__assign({}, opts), { hits: drawnHits }));
                                return [4 /*yield*/, chromeTo($, svg, width, isLive ? height * FRAMES : height, isLive ? 1 : 2)];
                            case 37:
                                if (!(_q.sent()))
                                    return [2 /*return*/, { value: void 0 }];
                                if (!isLive) return [3 /*break*/, 45];
                                return [4 /*yield*/, run($, [magick, "".concat(wireDir, "/next.png"), '-crop', "".concat(width, "x").concat(height), '+repage', "".concat(wireDir, "/frame-%d.png")])];
                            case 38:
                                if (!(_q.sent()))
                                    return [2 /*return*/, { value: void 0 }];
                                list = [];
                                k = 0;
                                _q.label = 39;
                            case 39:
                                if (!(k < FRAMES)) return [3 /*break*/, 42];
                                _p = (_o = list).push;
                                return [4 /*yield*/, png($, "frame-".concat(k))];
                            case 40:
                                _p.apply(_o, [_q.sent()]);
                                _q.label = 41;
                            case 41:
                                k++;
                                return [3 /*break*/, 39];
                            case 42: return [4 /*yield*/, run($, ['cp', '-f', "".concat(wireDir, "/frame-0.png"), "".concat(wireDir, "/view.png")])];
                            case 43:
                                if (!(_q.sent()))
                                    return [2 /*return*/, { value: void 0 }];
                                return [4 /*yield*/, done(FRAMES, list)];
                            case 44:
                                _q.sent();
                                return [3 /*break*/, 48];
                            case 45: return [4 /*yield*/, run($, ['mv', '-f', "".concat(wireDir, "/next.png"), "".concat(wireDir, "/view.png")])];
                            case 46:
                                if (!(_q.sent()))
                                    return [2 /*return*/, { value: void 0 }];
                                return [4 /*yield*/, done(0, [])];
                            case 47:
                                _q.sent();
                                _q.label = 48;
                            case 48: return [2 /*return*/];
                        }
                    });
                };
                _c.label = 2;
            case 2: return [5 /*yield**/, _loop_1()];
            case 3:
                state_1 = _c.sent();
                if (typeof state_1 === "object")
                    return [2 /*return*/, state_1.value];
                _c.label = 4;
            case 4:
                if (isStale) return [3 /*break*/, 2];
                _c.label = 5;
            case 5: return [3 /*break*/, 8];
            case 6:
                _a = _c.sent();
                return [3 /*break*/, 8];
            case 7:
                isPainting = false;
                return [7 /*endfinally*/];
            case 8: return [2 /*return*/];
        }
    });
}); };
// Notices the screen opening, resizing or closing. Open, Claude's pane shrinks to its controls; closed, it gets its
// width back and the pictures return to it.
var watchScreen = function ($) { return __awaiter(void 0, void 0, void 0, function () {
    var raw, now, s, _a, scale, _b, was, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0: return [4 /*yield*/, $.fs.read("".concat(wireDir, "/screen.json")).catch(function () { return ''; })];
            case 1:
                raw = _d.sent();
                now = null;
                _d.label = 2;
            case 2:
                _d.trys.push([2, 5, , 6]);
                s = raw ? JSON.parse(raw) : null;
                _a = s;
                if (!_a) return [3 /*break*/, 4];
                return [4 /*yield*/, $.clock.now()];
            case 3:
                _a = (_d.sent()) - s.ts * 1000 < SCREEN_FRESH_MS;
                _d.label = 4;
            case 4:
                if (_a) {
                    scale = s.cellH > 2 * CELL_H - 4 ? 2 : 1;
                    now = { cols: s.cols, rows: s.rows, cellW: s.cellW ? s.cellW / scale : CELL_W, cellH: s.cellH ? s.cellH / scale : CELL_H };
                }
                return [3 /*break*/, 6];
            case 5:
                _b = _d.sent();
                // Caught mid-write: the next tick reads it whole.
                return [2 /*return*/];
            case 6: return [4 /*yield*/, (0, claude_code_1.read)($, screen)];
            case 7:
                was = _d.sent();
                if ((was === null || was === void 0 ? void 0 : was.cols) === (now === null || now === void 0 ? void 0 : now.cols) && (was === null || was === void 0 ? void 0 : was.rows) === (now === null || now === void 0 ? void 0 : now.rows) && (was === null || was === void 0 ? void 0 : was.cellW) === (now === null || now === void 0 ? void 0 : now.cellW) && (was === null || was === void 0 ? void 0 : was.cellH) === (now === null || now === void 0 ? void 0 : now.cellH))
                    return [2 /*return*/];
                return [4 /*yield*/, (0, claude_code_1.update)($, screen, function () { return now; })];
            case 8:
                _d.sent();
                _c = !was !== !now;
                if (!_c) return [3 /*break*/, 10];
                return [4 /*yield*/, $.ui.panes()];
            case 9:
                _c = (_d.sent()).some(function (p) { return p.id === PANE; });
                _d.label = 10;
            case 10:
                if (!_c) return [3 /*break*/, 12];
                return [4 /*yield*/, openPane($)];
            case 11:
                _d.sent();
                _d.label = 12;
            case 12: return [2 /*return*/];
        }
    });
}); };
var openPane = function ($) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, claude_code_1.read)($, screen)];
            case 1: return [2 /*return*/, (_a.sent())
                    ? $.ui.open({ id: PANE, title: 'Team', columns: 60, rows: CONTROL_ROWS + 1 })
                    : $.ui.open({ id: PANE, title: 'Team', columns: PANE_COLUMNS })
                // Opens the screen beside the Claude pane this session runs in.
            ];
        }
    });
}); };
// Opens the screen beside the Claude pane this session runs in.
var openScreen = function ($) { return __awaiter(void 0, void 0, void 0, function () {
    var script, ok;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, claude_code_1.read)($, screen)];
            case 1:
                if (_a.sent())
                    return [2 /*return*/, 'The Team screen is already open.'];
                script = "".concat($.plugin.root, "/bin/screen.py");
                return [4 /*yield*/, run($, ['sh', '-c', 'test -n "$TMUX_PANE" && exec tmux split-window -h -d -l "$1" -t "$TMUX_PANE" python3 "$2" "$3"', 'sh', SCREEN_SHARE, script, wireDir])];
            case 2:
                ok = _a.sent();
                if (!ok)
                    return [2 /*return*/, 'The Team screen needs Claude running inside tmux.'];
                return [2 /*return*/, 'Team screen opened on the right: click a teammate, a tab or a step; double-click someone to go to their terminal; q closes it.'];
        }
    });
}); };
// The teammate's tmux pane, from the newest team config that has them (the lead's is the team window's first).
var paneOf = function ($, name) { return __awaiter(void 0, void 0, void 0, function () {
    var r_1, r;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                if (!(name === 'lead')) return [3 /*break*/, 2];
                return [4 /*yield*/, $.process.run(['tmux', 'list-panes', '-a', '-F', '#{window_name} #{pane_index} #{pane_id}']).catch(function () { return undefined; })];
            case 1:
                r_1 = _d.sent();
                return [2 /*return*/, (_b = (_a = r_1 === null || r_1 === void 0 ? void 0 : r_1.stdout.split('\n').find(function (l) { return l.startsWith('team 1 '); })) === null || _a === void 0 ? void 0 : _a.split(' ')[2]) !== null && _b !== void 0 ? _b : ''];
            case 2: return [4 /*yield*/, $.process
                    .run(['sh', '-c', 'ls -t "$HOME"/.claude/teams/*/config.json 2>/dev/null | while read -r f; do jq -r --arg n "$1" \'.members[] | select(.name == $n and .backendType == "tmux") | .tmuxPaneId\' "$f"; done | head -1', 'sh', name])
                    .catch(function () { return undefined; })];
            case 3:
                r = _d.sent();
                return [2 /*return*/, (_c = r === null || r === void 0 ? void 0 : r.stdout.trim()) !== null && _c !== void 0 ? _c : ''];
        }
    });
}); };
var jump = function ($, name) { return __awaiter(void 0, void 0, void 0, function () {
    var id, ok, _a, _b, text;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, paneOf($, name)];
            case 1:
                id = _c.sent();
                _b = /^%\d+$/.test(id);
                if (!_b) return [3 /*break*/, 3];
                return [4 /*yield*/, run($, ['tmux', 'select-window', '-t', id])];
            case 2:
                _b = (_c.sent());
                _c.label = 3;
            case 3:
                _a = _b;
                if (!_a) return [3 /*break*/, 5];
                return [4 /*yield*/, run($, ['tmux', 'select-pane', '-t', id])];
            case 4:
                _a = (_c.sent());
                _c.label = 5;
            case 5:
                ok = _a;
                text = ok ? "".concat((0, model_1.shortName)(name), "'s terminal") : "No open terminal for ".concat((0, model_1.shortName)(name));
                return [4 /*yield*/, say($, text)];
            case 6:
                _c.sent();
                return [4 /*yield*/, $.ui.toast("Team: ".concat(text))];
            case 7:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); };
var cycle = function ($, step) { return __awaiter(void 0, void 0, void 0, function () {
    var names, cur, _a, _b, next;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0: return [4 /*yield*/, (0, claude_code_1.read)($, team)];
            case 1:
                names = ((_d = (_c = (_e.sent())) === null || _c === void 0 ? void 0 : _c.members) !== null && _d !== void 0 ? _d : []).map(function (m) { return m.name; });
                if (!names.length)
                    return [2 /*return*/];
                _b = (_a = names).indexOf;
                return [4 /*yield*/, (0, claude_code_1.read)($, selected)];
            case 2:
                cur = _b.apply(_a, [_e.sent()]);
                next = names[(cur + step + names.length) % names.length];
                return [4 /*yield*/, (0, claude_code_1.update)($, selected, function () { return next; })];
            case 3:
                _e.sent();
                return [4 /*yield*/, say($, "".concat((0, model_1.shortName)(next), " \u00B7 Enter goes to their terminal"))];
            case 4:
                _e.sent();
                void paint($);
                return [2 /*return*/];
        }
    });
}); };
var act = function ($, action, isDouble) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, kind, _b, arg, now, from;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = [action.slice(0, action.indexOf(':')), action.slice(action.indexOf(':') + 1)], kind = _a[0], _b = _a[1], arg = _b === void 0 ? '' : _b;
                if (kind === 'jump' || (kind === 'who' && isDouble))
                    return [2 /*return*/, jump($, arg)];
                if (kind === 'who')
                    return [2 /*return*/, choose($, arg)];
                if (kind === 'view' && isView(arg))
                    return [2 /*return*/, setView($, arg)];
                if (kind === 'filter' && FILTERS.includes(arg))
                    return [2 /*return*/, setFilter($, arg)];
                if (!(kind === 'stage')) return [3 /*break*/, 4];
                return [4 /*yield*/, (0, claude_code_1.update)($, stage, function (cur) { return (cur === arg ? '' : arg); })];
            case 1:
                now = _c.sent();
                return [4 /*yield*/, (0, claude_code_1.update)($, issuePick, function () { return 0; })];
            case 2:
                _c.sent();
                return [4 /*yield*/, say($, now ? "".concat(arg, ": its issues, in place of the chat") : 'The chat again')];
            case 3:
                _c.sent();
                void paint($);
                _c.label = 4;
            case 4:
                if (kind === 'issue' && Number(arg) > 0)
                    return [2 /*return*/, pickIssue($, Number(arg))];
                if (kind === 'open' && Number(arg) > 0)
                    return [2 /*return*/, openIssue($, Number(arg))];
                if (kind === 'live')
                    return [2 /*return*/, replayTo($, null)];
                if (kind === 'time') {
                    from = Date.parse(timeline.from);
                    return [2 /*return*/, replayTo($, from + Number(arg) * (Date.parse(timeline.to) - from))];
                }
                return [2 /*return*/];
        }
    });
}); };
var REPLAY_KEYS = { '[': -STEP_MS, ']': STEP_MS, '{': -BIG_STEP_MS, '}': BIG_STEP_MS };
var KEY_ACTION = {
    m: 'view:map', o: 'view:office', f: 'view:factory', a: 'filter:all', h: 'filter:handoff', p: 'filter:problem',
};
// Clicks and keys the screen appended to input.jsonl since the last look.
var readInput = function ($) { return __awaiter(void 0, void 0, void 0, function () {
    var path, st, text, fresh, whole, _loop_2, _i, _a, line_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                path = "".concat(wireDir, "/input.jsonl");
                return [4 /*yield*/, $.fs.stat(path).catch(function () { return undefined; })];
            case 1:
                st = _b.sent();
                if (!st)
                    return [2 /*return*/];
                // The screen empties the file when it starts.
                if (st.size < inputAt)
                    inputAt = 0;
                if (st.size === inputAt)
                    return [2 /*return*/];
                return [4 /*yield*/, $.fs.read(path).catch(function () { return ''; })];
            case 2:
                text = _b.sent();
                fresh = text.slice(inputAt);
                whole = fresh.lastIndexOf('\n') + 1;
                inputAt += whole;
                _loop_2 = function (line_1) {
                    var e, _c, _d, x, y, hit, action;
                    return __generator(this, function (_e) {
                        switch (_e.label) {
                            case 0:
                                if (!line_1)
                                    return [2 /*return*/, "continue"];
                                e = void 0;
                                try {
                                    e = JSON.parse(line_1);
                                }
                                catch (_f) {
                                    return [2 /*return*/, "continue"];
                                }
                                if (!e.key) return [3 /*break*/, 17];
                                if (!KEY_ACTION[e.key]) return [3 /*break*/, 2];
                                return [4 /*yield*/, act($, KEY_ACTION[e.key], false)];
                            case 1:
                                _e.sent();
                                return [3 /*break*/, 16];
                            case 2:
                                if (!(e.key === 'left' || e.key === 'right')) return [3 /*break*/, 4];
                                return [4 /*yield*/, cycle($, e.key === 'left' ? -1 : 1)];
                            case 3:
                                _e.sent();
                                return [3 /*break*/, 16];
                            case 4:
                                if (!(e.key === 'enter')) return [3 /*break*/, 7];
                                _c = jump;
                                _d = [$];
                                return [4 /*yield*/, (0, claude_code_1.read)($, selected)];
                            case 5: return [4 /*yield*/, _c.apply(void 0, _d.concat([_e.sent()]))];
                            case 6:
                                _e.sent();
                                return [3 /*break*/, 16];
                            case 7:
                                if (!(e.key === 'esc')) return [3 /*break*/, 12];
                                return [4 /*yield*/, (0, claude_code_1.update)($, selected, function () { return 'lead'; })];
                            case 8:
                                _e.sent();
                                return [4 /*yield*/, (0, claude_code_1.update)($, stage, function () { return ''; })];
                            case 9:
                                _e.sent();
                                return [4 /*yield*/, (0, claude_code_1.update)($, issuePick, function () { return 0; })];
                            case 10:
                                _e.sent();
                                return [4 /*yield*/, say($, 'Everyone')];
                            case 11:
                                _e.sent();
                                void paint($);
                                return [3 /*break*/, 16];
                            case 12:
                                if (!(e.key in REPLAY_KEYS)) return [3 /*break*/, 14];
                                return [4 /*yield*/, replayStep($, REPLAY_KEYS[e.key])];
                            case 13:
                                _e.sent();
                                return [3 /*break*/, 16];
                            case 14:
                                if (!(e.key === 'live')) return [3 /*break*/, 16];
                                return [4 /*yield*/, replayTo($, null)];
                            case 15:
                                _e.sent();
                                _e.label = 16;
                            case 16: return [2 /*return*/, "continue"];
                            case 17:
                                if (e.fx === undefined || e.fy === undefined)
                                    return [2 /*return*/, "continue"];
                                x = e.fx * hitSize.width;
                                y = e.fy * hitSize.height;
                                hit = __spreadArray([], hits, true).reverse().find(function (h) { return x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h; });
                                action = (hit === null || hit === void 0 ? void 0 : hit.action) === 'time:' ? "time:".concat(Math.min(1, Math.max(0, (x - hit.x) / hit.w))) : hit === null || hit === void 0 ? void 0 : hit.action;
                                if (!action) return [3 /*break*/, 19];
                                return [4 /*yield*/, act($, action, e.double === true)];
                            case 18:
                                _e.sent();
                                return [3 /*break*/, 21];
                            case 19: return [4 /*yield*/, say($, 'Nothing to click there')];
                            case 20:
                                _e.sent();
                                _e.label = 21;
                            case 21: return [2 /*return*/];
                        }
                    });
                };
                _i = 0, _a = fresh.slice(0, whole).split('\n');
                _b.label = 3;
            case 3:
                if (!(_i < _a.length)) return [3 /*break*/, 6];
                line_1 = _a[_i];
                return [5 /*yield**/, _loop_2(line_1)];
            case 4:
                _b.sent();
                _b.label = 5;
            case 5:
                _i++;
                return [3 /*break*/, 3];
            case 6: return [2 /*return*/];
        }
    });
}); };
// Announces what went wrong since the last look: a toast per problem message (OFF-TRACK, STUCK, BLOCKED, CHANGES,
// FINDINGS...), one sound, and a blinking ring round whoever the model flags for it. The first look only takes note,
// so starting a session doesn't replay the day's alerts.
var announce = function ($, t) { return __awaiter(void 0, void 0, void 0, function () {
    var fresh, wasFlagged, _a, now, _loop_3, _i, _b, m, _c, _d, m, text;
    var _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                fresh = alertedTs ? t.messages.filter(function (m) { return m.kind === 'problem' && m.ts > alertedTs; }) : [];
                _a = Set.bind;
                return [4 /*yield*/, (0, claude_code_1.read)($, team)];
            case 1:
                wasFlagged = new (_a.apply(Set, [void 0, (_f = (_e = (_g.sent())) === null || _e === void 0 ? void 0 : _e.members.filter(function (m) { return m.isFlagged; }).map(function (m) { return m.name; })) !== null && _f !== void 0 ? _f : []]))();
                alertedTs = t.messages.reduce(function (a, m) { return (m.ts > a ? m.ts : a); }, alertedTs || t.lastTs);
                if (!fresh.length)
                    return [2 /*return*/];
                return [4 /*yield*/, $.clock.now()];
            case 2:
                now = _g.sent();
                _loop_3 = function (m) {
                    if (m.isFlagged && (!wasFlagged.has(m.name) || fresh.some(function (x) { return x.from === m.name || x.to === m.name; })))
                        flashUntil.set(m.name, now + FLASH_MS);
                };
                for (_i = 0, _b = t.members; _i < _b.length; _i++) {
                    m = _b[_i];
                    _loop_3(m);
                }
                for (_c = 0, _d = fresh.slice(-3); _c < _d.length; _c++) {
                    m = _d[_c];
                    text = m.text.replace(/\s+/g, ' ');
                    $.ui.toast("\u25B2 ".concat((0, model_1.shortName)(m.from), " \u2192 ").concat((0, model_1.shortName)(m.to), ": ").concat(text.length > 90 ? "".concat(text.slice(0, 89), "\u2026") : text), { timeoutMs: 10000 });
                }
                if (fresh.length > 3)
                    $.ui.toast("\u25B2 and ".concat(fresh.length - 3, " more problems"), { timeoutMs: 10000 });
                if (isSound)
                    void $.audio.play({ asset: 'sounds/alert.wav' }).catch(function () { return undefined; });
                return [2 /*return*/];
        }
    });
}); };
// The log's span and how many events fell in each slice of it, for the replay strip.
var activity = function (text) {
    var times = __spreadArray([], text.matchAll(/"ts":"([^"]+)"/g), true).map(function (m) { return Date.parse(m[1]); }).filter(function (n) { return !Number.isNaN(n); });
    if (!times.length)
        return { from: '', to: '', at: '', buckets: [] };
    var from = Math.min.apply(Math, times.slice(0, 50));
    var to = Math.max.apply(Math, times.slice(-50));
    var span = Math.max(1, to - from);
    var buckets = new Array(BUCKETS).fill(0);
    for (var _i = 0, times_1 = times; _i < times_1.length; _i++) {
        var t = times_1[_i];
        buckets[Math.min(BUCKETS - 1, Math.floor(((t - from) / span) * BUCKETS))]++;
    }
    return { from: new Date(from).toISOString(), to: new Date(to).toISOString(), at: '', buckets: buckets };
};
// The team as it stood at a moment: the log read up to then. Kept for the moment on show, as each step re-reads.
var teamAt = function (at) {
    if (replayed.at !== at || !replayed.team)
        replayed = { at: at, team: (0, model_1.parse)(logText, at) };
    return replayed.team;
};
// Moves the replay to a moment, held inside the log's span; past its end is live again.
var replayTo = function ($, ms) { return __awaiter(void 0, void 0, void 0, function () {
    var from, to, at;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                from = Date.parse(timeline.from);
                to = Date.parse(timeline.to);
                at = ms === null || Number.isNaN(from) || ms >= to ? '' : new Date(Math.max(from, ms)).toISOString();
                return [4 /*yield*/, (0, claude_code_1.update)($, replayAt, function () { return at; })];
            case 1:
                _a.sent();
                return [4 /*yield*/, say($, at ? "Replaying ".concat(at.slice(5, 10), " ").concat(at.slice(11, 16), " UTC \u00B7 [ ] { } step \u00B7 l live") : 'Live')];
            case 2:
                _a.sent();
                void paint($);
                return [2 /*return*/];
        }
    });
}); };
var replayStep = function ($, by) { return __awaiter(void 0, void 0, void 0, function () {
    var cur;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, claude_code_1.read)($, replayAt)];
            case 1:
                cur = _a.sent();
                return [4 /*yield*/, replayTo($, (cur ? Date.parse(cur) : Date.parse(timeline.to)) + by)];
            case 2:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
var pickIssue = function ($, n) { return __awaiter(void 0, void 0, void 0, function () {
    var now, title;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0: return [4 /*yield*/, (0, claude_code_1.update)($, issuePick, function (cur) { return (cur === n ? 0 : n); })];
            case 1:
                now = _d.sent();
                return [4 /*yield*/, (0, claude_code_1.read)($, team)];
            case 2:
                title = (_c = (_b = (_a = (_d.sent())) === null || _a === void 0 ? void 0 : _a.issues.find(function (i) { return i.issue === n; })) === null || _b === void 0 ? void 0 : _b.title) !== null && _c !== void 0 ? _c : '';
                return [4 /*yield*/, say($, now ? "#".concat(n, " ").concat(title, " \u00B7 Esc closes") : 'The chat again')];
            case 3:
                _d.sent();
                void paint($);
                return [2 /*return*/];
        }
    });
}); };
// An issue's address: the project's own template, else its git remote's, GitHub's or GitLab's way.
var issueUrl = function (n) {
    var own = (0, model_1.issueUrlTemplate)();
    if (own)
        return own.replace('{n}', String(n));
    if (!projectUrl)
        return '';
    return /^https?:\/\/github\.com\//.test(projectUrl) ? "".concat(projectUrl, "/issues/").concat(n) : "".concat(projectUrl, "/-/issues/").concat(n);
};
var issueSite = function () {
    var url = issueUrl(1);
    return /github\.com/.test(url) ? 'GitHub' : /gitlab/.test(url) ? 'GitLab' : 'browser';
};
var openIssue = function ($, n) { return __awaiter(void 0, void 0, void 0, function () {
    var url, ok, _a, _b, text;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                url = issueUrl(n);
                _a = url !== '';
                if (!_a) return [3 /*break*/, 4];
                return [4 /*yield*/, run($, ['open', url])];
            case 1:
                _b = (_c.sent());
                if (_b) return [3 /*break*/, 3];
                return [4 /*yield*/, run($, ['xdg-open', url])];
            case 2:
                _b = (_c.sent());
                _c.label = 3;
            case 3:
                _a = (_b);
                _c.label = 4;
            case 4:
                ok = _a;
                text = ok ? "Opened #".concat(n, " in ").concat(issueSite()) : "No issue address for #".concat(n, ": set issueUrl in .claude/team-wire.json");
                return [4 /*yield*/, say($, text)];
            case 5:
                _c.sent();
                $.ui.toast("Team: ".concat(text));
                return [2 /*return*/];
        }
    });
}); };
var RECORD_MS = 2000;
var INBOX_MS = 500;
// The team this session leads: its config names this session as the lead's.
var findTeam = function ($) { return __awaiter(void 0, void 0, void 0, function () {
    var dirs, _i, dirs_1, d, cfg;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, $.fs.list("".concat(home, "/.claude/teams")).catch(function () { return []; })];
            case 1:
                dirs = _a.sent();
                _i = 0, dirs_1 = dirs;
                _a.label = 2;
            case 2:
                if (!(_i < dirs_1.length)) return [3 /*break*/, 5];
                d = dirs_1[_i];
                if (d.kind !== 'dir')
                    return [3 /*break*/, 4];
                return [4 /*yield*/, $.fs.read("".concat(home, "/.claude/teams/").concat(d.name, "/config.json")).then(function (t) { return JSON.parse(t); }).catch(function () { return null; })];
            case 3:
                cfg = _a.sent();
                if ((cfg === null || cfg === void 0 ? void 0 : cfg.leadSessionId) === sessionId)
                    return [2 /*return*/, d.name];
                _a.label = 4;
            case 4:
                _i++;
                return [3 /*break*/, 2];
            case 5: return [2 /*return*/, ''];
        }
    });
}); };
var appendLines = function ($, path, lines) { return __awaiter(void 0, void 0, void 0, function () {
    var i, chunk;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                i = 0;
                _a.label = 1;
            case 1:
                if (!(i < lines.length)) return [3 /*break*/, 4];
                chunk = lines.slice(i, i + 100).map(function (l) { return JSON.stringify(l); }).join('\n') + '\n';
                return [4 /*yield*/, $.process.run(['sh', '-c', 'mkdir -p "$(dirname "$2")" && printf "%s" "$1" >> "$2"', 'sh', chunk, path])];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3:
                i += 100;
                return [3 /*break*/, 1];
            case 4: return [2 /*return*/];
        }
    });
}); };
// Finds the team this session leads, picking up where an earlier load of the mod left off with it.
var ensureTeam = function ($) { return __awaiter(void 0, void 0, void 0, function () {
    var saved;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (recTeam)
                    return [2 /*return*/, true];
                return [4 /*yield*/, findTeam($)];
            case 1:
                recTeam = _b.sent();
                if (!recTeam)
                    return [2 /*return*/, false];
                return [4 /*yield*/, $.fs.read("".concat(wireDir, "/recorded-state.json")).then(function (t) { return JSON.parse(t); }).catch(function () { return null; })];
            case 2:
                saved = _b.sent();
                recorded = (saved === null || saved === void 0 ? void 0 : saved.team) === recTeam ? { tasks: (_a = saved.tasks) !== null && _a !== void 0 ? _a : {}, seen: Array.isArray(saved.seen) ? saved.seen : [] } : { tasks: {}, seen: [] };
                return [2 /*return*/, true];
        }
    });
}); };
var saveRecorded = function ($) { return $.fs.write("".concat(wireDir, "/recorded-state.json"), JSON.stringify(__assign({ team: recTeam }, recorded))); };
// Logs the messages not logged already, however they were seen.
var noteMessages = function ($, list) { return __awaiter(void 0, void 0, void 0, function () {
    var lines, _i, list_1, m, r;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                lines = [];
                for (_i = 0, list_1 = list; _i < list_1.length; _i++) {
                    m = list_1[_i];
                    r = (0, recorder_1.messageEvent)(m, recorded.seen);
                    recorded.seen = r.seen;
                    if (r.line)
                        lines.push(r.line);
                }
                if (!lines.length)
                    return [2 /*return*/];
                return [4 /*yield*/, appendLines($, logPath, lines)];
            case 1:
                _a.sent();
                return [4 /*yield*/, saveRecorded($)];
            case 2:
                _a.sent();
                return [4 /*yield*/, pollNow()];
            case 3:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
// One look at the task files: what changed since the last is appended to the recorded log.
var recordTasks = function ($) { return __awaiter(void 0, void 0, void 0, function () {
    var tasksDir, files, _i, _a, e, had, file, ts, _b, t, isOver;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, ensureTeam($)];
            case 1:
                if (!(_c.sent()))
                    return [2 /*return*/];
                tasksDir = "".concat(home, "/.claude/tasks/").concat(recTeam);
                files = [];
                _i = 0;
                return [4 /*yield*/, $.fs.list(tasksDir).catch(function () { return []; })];
            case 2:
                _a = _c.sent();
                _c.label = 3;
            case 3:
                if (!(_i < _a.length)) return [3 /*break*/, 6];
                e = _a[_i];
                if (e.kind !== 'file' || !/^\d+\.json$/.test(e.name))
                    return [3 /*break*/, 5];
                had = taskSeen.get(e.name);
                if (had && had.mtimeMs === e.mtimeMs) {
                    files.push(had.file);
                    return [3 /*break*/, 5];
                }
                return [4 /*yield*/, $.fs.read("".concat(tasksDir, "/").concat(e.name)).then(function (t) { return JSON.parse(t); }).catch(function () { return null; })
                    // Caught mid-write: the last version stands until the next look.
                ];
            case 4:
                file = _c.sent();
                // Caught mid-write: the last version stands until the next look.
                if (!file) {
                    if (had)
                        files.push(had.file);
                    return [3 /*break*/, 5];
                }
                taskSeen.set(e.name, { mtimeMs: e.mtimeMs, file: file });
                files.push(file);
                _c.label = 5;
            case 5:
                _i++;
                return [3 /*break*/, 3];
            case 6:
                _b = Date.bind;
                return [4 /*yield*/, $.clock.now()];
            case 7:
                ts = new (_b.apply(Date, [void 0, _c.sent()]))().toISOString().replace(/\.\d+Z$/, 'Z');
                t = (0, recorder_1.taskEvents)(recTeam, recorded.tasks, files, ts);
                isOver = !files.length && Object.keys(recorded.tasks).length > 0;
                recorded.tasks = t.tasks;
                if (!t.lines.length) return [3 /*break*/, 9];
                return [4 /*yield*/, appendLines($, logPath, t.lines)];
            case 8:
                _c.sent();
                _c.label = 9;
            case 9:
                if (!(t.lines.length || isOver)) return [3 /*break*/, 11];
                return [4 /*yield*/, saveRecorded($)
                    // The team shut down: the next one this session makes is looked for afresh.
                ];
            case 10:
                _c.sent();
                _c.label = 11;
            case 11:
                // The team shut down: the next one this session makes is looked for afresh.
                if (isOver) {
                    recTeam = '';
                    taskSeen.clear();
                }
                return [2 /*return*/];
        }
    });
}); };
// Inboxes empty once read, so they're looked at more often than the tasks.
var recordInboxes = function ($) { return __awaiter(void 0, void 0, void 0, function () {
    var inboxes, inboxDir, _i, _a, e, list, fresh;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!recTeam)
                    return [2 /*return*/];
                inboxes = {};
                inboxDir = "".concat(home, "/.claude/teams/").concat(recTeam, "/inboxes");
                _i = 0;
                return [4 /*yield*/, $.fs.list(inboxDir).catch(function () { return []; })];
            case 1:
                _a = _b.sent();
                _b.label = 2;
            case 2:
                if (!(_i < _a.length)) return [3 /*break*/, 5];
                e = _a[_i];
                if (e.kind !== 'file' || !e.name.endsWith('.json') || e.size < 3)
                    return [3 /*break*/, 4];
                return [4 /*yield*/, $.fs.read("".concat(inboxDir, "/").concat(e.name)).then(function (t) { return JSON.parse(t); }).catch(function () { return null; })];
            case 3:
                list = _b.sent();
                if (Array.isArray(list) && list.length)
                    inboxes[e.name.slice(0, -5)] = list;
                _b.label = 4;
            case 4:
                _i++;
                return [3 /*break*/, 2];
            case 5:
                fresh = (0, recorder_1.inboxMessages)(inboxes);
                if (!fresh.length) return [3 /*break*/, 7];
                return [4 /*yield*/, noteMessages($, fresh)];
            case 6:
                _b.sent();
                _b.label = 7;
            case 7: return [2 /*return*/];
        }
    });
}); };
// A project that doesn't ignore .team would show the mod's files as untracked: they get their own .gitignore.
var ignoreTeamDir = function ($, root) { return __awaiter(void 0, void 0, void 0, function () {
    var ignored, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, run($, ['git', '-C', root, 'check-ignore', '-q', '.team/wire/x'])];
            case 1:
                ignored = _b.sent();
                _a = !ignored;
                if (!_a) return [3 /*break*/, 3];
                return [4 /*yield*/, $.fs.exists("".concat(root, "/.team/.gitignore")).catch(function () { return true; })];
            case 2:
                _a = !(_b.sent());
                _b.label = 3;
            case 3:
                if (!_a) return [3 /*break*/, 5];
                return [4 /*yield*/, $.process.run(['sh', '-c', 'mkdir -p "$1" && printf "*\\n" > "$1/.gitignore"', 'sh', "".concat(root, "/.team")]).catch(function () { return undefined; })];
            case 4:
                _b.sent();
                _b.label = 5;
            case 5: return [2 /*return*/];
        }
    });
}); };
var noLog = function () { return isRecording
    ? 'Nothing recorded yet: Team Wire records the team this session leads once it creates one.'
    : 'No team log yet (.team/log/events.jsonl). It appears once a team runs here.'; };
// Reads the project's settings when the file appears, changes or goes; a change re-reads the log under them.
var loadSettings = function ($) { return __awaiter(void 0, void 0, void 0, function () {
    var st, sig, raw, problems, _a, _b, err_1;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0: return [4 /*yield*/, $.fs.stat(settingsPath).catch(function () { return undefined; })];
            case 1:
                st = _d.sent();
                sig = st ? "".concat(st.size, ":").concat(st.mtimeMs) : 'none';
                if (sig === settingsSig)
                    return [2 /*return*/, false];
                settingsSig = sig;
                problems = [];
                if (!st) return [3 /*break*/, 5];
                _d.label = 2;
            case 2:
                _d.trys.push([2, 4, , 5]);
                _b = (_a = JSON).parse;
                return [4 /*yield*/, $.fs.read(settingsPath)];
            case 3:
                raw = _b.apply(_a, [_d.sent()]);
                return [3 /*break*/, 5];
            case 4:
                err_1 = _d.sent();
                problems = ["not valid JSON (".concat(String((_c = err_1 === null || err_1 === void 0 ? void 0 : err_1.message) !== null && _c !== void 0 ? _c : err_1).slice(0, 80), "), so the defaults stand")];
                return [3 /*break*/, 5];
            case 5:
                problems = __spreadArray(__spreadArray([], problems, true), (0, model_1.configure)(raw), true);
                settingsProblems = problems;
                settingsVersion++;
                logSeen = '';
                if (problems.length)
                    $.ui.toast("Team Wire: .claude/team-wire.json: ".concat(problems[0]).concat(problems.length > 1 ? " (and ".concat(problems.length - 1, " more: /team config)") : ''), { timeoutMs: 10000 });
                return [2 /*return*/, true];
        }
    });
}); };
// /team config: the settings in force and where they come from; `init` writes them to a file to edit.
var configCommand = function ($, arg) { return __awaiter(void 0, void 0, void 0, function () {
    var rel, starter, ok, found, steps, lines;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                rel = '.claude/team-wire.json';
                if (!(arg === 'init')) return [3 /*break*/, 3];
                return [4 /*yield*/, $.fs.exists(settingsPath).catch(function () { return false; })];
            case 1:
                if (_a.sent())
                    return [2 /*return*/, "".concat(rel, " already exists; edit it, and Team Wire picks the change up within a few seconds.")];
                starter = {
                    steps: (0, model_1.line)().map(function (k) { var _a; return ({ kind: k, label: (_a = (0, model_1.labelOf)(k)) !== null && _a !== void 0 ? _a : (0, views_1.titled)(k) }); }),
                    rework: (0, model_1.reworkOf)(),
                    shipStep: (0, model_1.line)().includes('merge') ? 'merge' : (0, model_1.line)()[(0, model_1.line)().length - 1],
                    titleStep: (0, model_1.line)().includes('build') ? 'build' : (0, model_1.line)()[0],
                    words: {},
                    issueUrl: (0, model_1.issueUrlTemplate)() || (issueUrl(0) ? issueUrl(0).replace(/0$/, '{n}') : ''),
                    roles: {},
                };
                if (!starter.issueUrl)
                    delete starter.issueUrl;
                return [4 /*yield*/, run($, ['sh', '-c', 'mkdir -p "$(dirname "$1")" && printf "%s\\n" "$2" > "$1"', 'sh', settingsPath, JSON.stringify(starter, null, 2)])];
            case 2:
                ok = _a.sent();
                return [2 /*return*/, ok
                        ? "Wrote ".concat(rel, " with the settings in force. Edit it: steps (the task kinds, in order, each with a label), rework, shipStep, titleStep, words (problem, handoff, approve, merge: lists of words that mark a message), issueUrl (with {n}) and roles (name: lead, backend, ui, qa, sec or rev). Changes apply within a few seconds.")
                        : "Couldn't write ".concat(rel, ".")];
            case 3:
                found = settingsSig !== 'none';
                steps = (0, model_1.line)().map(function (k) { return (0, model_1.labelOf)(k) ? "".concat(k, " (").concat((0, model_1.labelOf)(k), ")") : k; }).join(' → ');
                lines = __spreadArray(__spreadArray([
                    found ? "Settings from ".concat(rel, ".") : "No ".concat(rel, ": the defaults are in force. /team config init writes them there to edit.")
                ], settingsProblems.map(function (p) { return "Problem: ".concat(p); }), true), [
                    "Steps: ".concat(steps).concat((0, model_1.line)() === model_1.DEFAULT_LINE ? ' (default)' : ''),
                    "Rework: a ".concat((0, model_1.reworkOf)().kind, " task sends an issue back to ").concat((0, model_1.reworkOf)().to, "."),
                    "Issue links: ".concat(issueUrl(1) ? issueUrl(1).replace(/1$/, '<n>') : 'none (set issueUrl)'),
                ], false);
                return [2 /*return*/, lines.join('\n')];
        }
    });
}); };
var demoLog = function () { return "".concat(wireDir, "/demo/events.jsonl"); };
var pollNow = function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
    return [2 /*return*/, undefined
        // A made-up problem from a working teammate, appended to the demo's copy of the log only.
    ];
}); }); };
// A made-up problem from a working teammate, appended to the demo's copy of the log only.
var demoAlert = function ($) { return __awaiter(void 0, void 0, void 0, function () {
    var members, who, name, ts, _a, message, line;
    var _b, _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0: return [4 /*yield*/, (0, claude_code_1.read)($, team)];
            case 1:
                members = (_c = (_b = (_g.sent())) === null || _b === void 0 ? void 0 : _b.members) !== null && _c !== void 0 ? _c : [];
                who = (_d = members.find(function (m) { return m.status === 'working' && m.name !== 'lead'; })) !== null && _d !== void 0 ? _d : members.find(function (m) { return m.name !== 'lead'; });
                name = (_e = who === null || who === void 0 ? void 0 : who.name) !== null && _e !== void 0 ? _e : 'web-engineer';
                _a = Date.bind;
                return [4 /*yield*/, $.clock.now()];
            case 2:
                ts = new (_a.apply(Date, [void 0, _g.sent()]))().toISOString().replace(/\.\d+Z$/, 'Z');
                message = "OFF-TRACK ".concat(name, " #").concat((_f = who === null || who === void 0 ? void 0 : who.issue) !== null && _f !== void 0 ? _f : 0, ": a Team Wire demo alert, not a real problem");
                line = JSON.stringify({ ts: ts, event: 'PostToolUse', agent: name, tool: 'SendMessage', input: { to: 'team-lead', message: message } });
                return [4 /*yield*/, $.process.run(['sh', '-c', 'printf "%s\\n" "$1" >> "$2"', 'sh', line, demoLog()])];
            case 3:
                _g.sent();
                return [4 /*yield*/, pollNow()];
            case 4:
                _g.sent();
                return [2 /*return*/];
        }
    });
}); };
// /team demo: the mod switches to a copy of the log and, a moment later, an alert arrives in it.
var demo = function ($, isOn) { return __awaiter(void 0, void 0, void 0, function () {
    var ok;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!!isOn) return [3 /*break*/, 3];
                if (!isDemo)
                    return [2 /*return*/, 'No demo is running.'];
                isDemo = false;
                alertedTs = realAlertedTs;
                return [4 /*yield*/, say($, 'Back to the real log')];
            case 1:
                _a.sent();
                return [4 /*yield*/, pollNow()];
            case 2:
                _a.sent();
                return [2 /*return*/, 'Demo over: back to the real log. The demo copy stays in .team/wire/demo until the next demo.'];
            case 3:
                if (isDemo) {
                    $.clock.after(1500, function () { return void demoAlert($); });
                    return [2 /*return*/, 'Another demo alert is on its way.'];
                }
                return [4 /*yield*/, run($, ['sh', '-c', 'mkdir -p "$(dirname "$2")" && cp -f "$1" "$2"', 'sh', logPath, demoLog()])];
            case 4:
                ok = _a.sent();
                if (!ok)
                    return [2 /*return*/, 'No team log to copy yet (.team/log/events.jsonl).'];
                realAlertedTs = alertedTs;
                isDemo = true;
                return [4 /*yield*/, say($, 'Demo: a copy of the log · an alert arrives in 3 s')];
            case 5:
                _a.sent();
                return [4 /*yield*/, pollNow()];
            case 6:
                _a.sent();
                $.clock.after(3000, function () { return void demoAlert($); });
                return [2 /*return*/, 'Demo on: Team Wire reads a copy of the log (badged DEMO); in 3 s a made-up alert lands in that copy, with its toast, sound and blinking ring. /team demo sends another, /team demo off ends it.'];
        }
    });
}); };
// /team times: each step of the line as numbers, for the retro: where issues queued and how long the work took.
var timesTable = function (t) {
    var times = (0, model_1.stageTimes)(t);
    var LINE = (0, model_1.line)();
    var rows = LINE.filter(function (k) { return times[k].started || times[k].waiting; }).map(function (k) {
        var x = times[k];
        return [k, String(x.started), x.started ? (0, model_1.dur)(x.avgWaitMs) : '–', String(x.finished), x.finished ? (0, model_1.dur)(x.avgWorkMs) : '–', x.waiting ? "".concat(x.waiting, ", oldest ").concat((0, model_1.dur)(x.oldestMs)) : '–'];
    });
    if (!rows.length)
        return 'No step has started yet.';
    var head = ['step', 'started', 'avg wait', 'finished', 'avg work', 'ready now'];
    var widths = head.map(function (h, i) { return Math.max.apply(Math, __spreadArray([h.length], rows.map(function (r) { return r[i].length; }), false)); });
    var row = function (r) { return r.map(function (c, i) { return c.padEnd(widths[i]); }).join('  ').trimEnd(); };
    var worst = LINE.reduce(function (a, k) { var _a, _b; return (times[k].oldestMs > ((_b = (_a = times[a]) === null || _a === void 0 ? void 0 : _a.oldestMs) !== null && _b !== void 0 ? _b : 0) ? k : a); }, '');
    var note = worst && times[worst].oldestMs > 0 ? "\nLongest queue now: ".concat(worst, ", ").concat((0, model_1.dur)(times[worst].oldestMs), ".") : '';
    return "Times per step, as at ".concat(t.lastTs.slice(11, 16), " UTC (a wait runs from ready to started):\n\n").concat(__spreadArray([row(head)], rows.map(row), true).join('\n')).concat(note);
};
var flashing = function ($) { return __awaiter(void 0, void 0, void 0, function () {
    var now, _i, flashUntil_1, _a, name_1, until;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, $.clock.now()];
            case 1:
                now = _b.sent();
                for (_i = 0, flashUntil_1 = flashUntil; _i < flashUntil_1.length; _i++) {
                    _a = flashUntil_1[_i], name_1 = _a[0], until = _a[1];
                    if (until <= now)
                        flashUntil.delete(name_1);
                }
                return [2 /*return*/, __spreadArray([], flashUntil.keys(), true).sort()];
        }
    });
}); };
var setView = function ($, x) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, claude_code_1.update)($, view, function () { return x; })];
            case 1:
                _a.sent();
                return [4 /*yield*/, $.store.set('view', x)];
            case 2:
                _a.sent();
                return [4 /*yield*/, say($, "".concat(LABEL[x], " view"))];
            case 3:
                _a.sent();
                void paint($);
                return [2 /*return*/];
        }
    });
}); };
var choose = function ($, name) { return __awaiter(void 0, void 0, void 0, function () {
    var now;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, claude_code_1.update)($, selected, function (cur) { return (cur === name ? 'lead' : name); })];
            case 1:
                now = _a.sent();
                return [4 /*yield*/, say($, now === 'lead' ? 'Everyone' : "".concat((0, model_1.shortName)(now), " \u00B7 double-click or Enter for their terminal"))];
            case 2:
                _a.sent();
                void paint($);
                return [2 /*return*/];
        }
    });
}); };
var setFilter = function ($, f) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, claude_code_1.update)($, filter, function () { return f; })];
            case 1:
                _a.sent();
                return [4 /*yield*/, say($, "Chat: ".concat(FILTER_LABEL[f]))];
            case 2:
                _a.sent();
                void paint($);
                return [2 /*return*/];
        }
    });
}); };
var register = function (on) {
    on('session.start', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var started, saved, root, inGit, _i, MAGICKS_1, m, _a, _b, RSVGS_1, r, _c, remote, url, poll;
        var _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0: return [4 /*yield*/, next(e)];
                case 1:
                    started = _h.sent();
                    return [4 /*yield*/, $.command.register({
                            name: 'team',
                            description: 'Show the agent team as a map, an office or a factory; /team off hides it',
                            argumentHint: '[map|office|factory|screen|live|still|text|pictures|sound on|sound off|demo|demo off|times|config|config init|off]',
                        })];
                case 2:
                    _h.sent();
                    return [4 /*yield*/, $.store.get('view').catch(function () { return undefined; })];
                case 3:
                    saved = _h.sent();
                    if (!isView(saved)) return [3 /*break*/, 5];
                    return [4 /*yield*/, (0, claude_code_1.update)($, view, function () { return saved; })];
                case 4:
                    _h.sent();
                    _h.label = 5;
                case 5: return [4 /*yield*/, $.store.get('off').catch(function () { return undefined; })];
                case 6:
                    if (!((_h.sent()) === true)) return [3 /*break*/, 8];
                    return [4 /*yield*/, (0, claude_code_1.update)($, isOff, function () { return true; })];
                case 7:
                    _h.sent();
                    _h.label = 8;
                case 8: return [4 /*yield*/, $.store.get('text').catch(function () { return undefined; })];
                case 9:
                    if (!((_h.sent()) === true)) return [3 /*break*/, 11];
                    return [4 /*yield*/, (0, claude_code_1.update)($, isText, function () { return true; })];
                case 10:
                    _h.sent();
                    _h.label = 11;
                case 11: return [4 /*yield*/, $.store.get('still').catch(function () { return undefined; })];
                case 12:
                    if (!((_h.sent()) === true)) return [3 /*break*/, 14];
                    return [4 /*yield*/, (0, claude_code_1.update)($, isStill, function () { return true; })];
                case 13:
                    _h.sent();
                    _h.label = 14;
                case 14: return [4 /*yield*/, $.store.get('sound').catch(function () { return undefined; })];
                case 15:
                    isSound = (_h.sent()) !== false;
                    return [4 /*yield*/, rootOf($, e.cwd)];
                case 16:
                    root = _h.sent();
                    logPath = "".concat(root, "/.team/log/events.jsonl");
                    wireDir = "".concat(root, "/.team/wire");
                    return [4 /*yield*/, run($, ['git', '-C', root, 'rev-parse', '--git-dir'])];
                case 17:
                    inGit = _h.sent();
                    if (!inGit) return [3 /*break*/, 19];
                    return [4 /*yield*/, ignoreTeamDir($, root)
                        // No team log of the project's own: record one, if this session leads a team (checked on each look).
                    ];
                case 18:
                    _h.sent();
                    _h.label = 19;
                case 19: return [4 /*yield*/, $.fs.exists(logPath).catch(function () { return false; })];
                case 20:
                    if (!!(_h.sent())) return [3 /*break*/, 23];
                    logPath = "".concat(wireDir, "/recorded.jsonl");
                    isRecording = true;
                    return [4 /*yield*/, $.process.run(['sh', '-c', 'printf %s "$HOME"']).catch(function () { return undefined; })];
                case 21:
                    home = (_e = (_d = (_h.sent())) === null || _d === void 0 ? void 0 : _d.stdout) !== null && _e !== void 0 ? _e : '';
                    return [4 /*yield*/, $.session.id().catch(function () { return ''; })];
                case 22:
                    sessionId = _h.sent();
                    if (home && sessionId) {
                        $.clock.every(RECORD_MS, function () { return void recordTasks($).catch(function () { return undefined; }); });
                        $.clock.every(INBOX_MS, function () { return void recordInboxes($).catch(function () { return undefined; }); });
                    }
                    _h.label = 23;
                case 23: return [4 /*yield*/, $.fs.exists(CHROME).catch(function () { return false; })];
                case 24:
                    chrome = (_h.sent()) ? CHROME : '';
                    _i = 0, MAGICKS_1 = MAGICKS;
                    _h.label = 25;
                case 25:
                    if (!(_i < MAGICKS_1.length)) return [3 /*break*/, 29];
                    m = MAGICKS_1[_i];
                    _a = !magick;
                    if (!_a) return [3 /*break*/, 27];
                    return [4 /*yield*/, $.fs.exists(m).catch(function () { return false; })];
                case 26:
                    _a = (_h.sent());
                    _h.label = 27;
                case 27:
                    if (_a)
                        magick = m;
                    _h.label = 28;
                case 28:
                    _i++;
                    return [3 /*break*/, 25];
                case 29:
                    _b = 0, RSVGS_1 = RSVGS;
                    _h.label = 30;
                case 30:
                    if (!(_b < RSVGS_1.length)) return [3 /*break*/, 34];
                    r = RSVGS_1[_b];
                    _c = !rsvg;
                    if (!_c) return [3 /*break*/, 32];
                    return [4 /*yield*/, $.fs.exists(r).catch(function () { return false; })];
                case 31:
                    _c = (_h.sent());
                    _h.label = 32;
                case 32:
                    if (_c)
                        rsvg = r;
                    _h.label = 33;
                case 33:
                    _b++;
                    return [3 /*break*/, 30];
                case 34: return [4 /*yield*/, $.process.run(['git', '-C', root, 'remote', 'get-url', 'origin']).catch(function () { return undefined; })];
                case 35:
                    remote = _h.sent();
                    url = (remote === null || remote === void 0 ? void 0 : remote.exitCode) === 0 ? remote.stdout.trim() : '';
                    projectUrl = url
                        .replace(/^git@([^:]+):/, 'https://$1/')
                        .replace(/^(https?:\/\/)[^@/]+@/, '$1')
                        .replace(/\.git$/, '');
                    return [4 /*yield*/, $.fs.stat("".concat(wireDir, "/input.jsonl")).catch(function () { return undefined; })];
                case 36:
                    // Clicks from before this load were meant for the picture then on show: skip them.
                    inputAt = (_g = (_f = (_h.sent())) === null || _f === void 0 ? void 0 : _f.size) !== null && _g !== void 0 ? _g : 0;
                    $.clock.every(INPUT_MS, function () { return void readInput($).catch(function () { return undefined; }); });
                    // Plays the loop: each tick swaps the next frame into the picture without redrawing the pane.
                    $.clock.every(FRAME_MS, function () {
                        if (frames.length < 2 || !imageBox.cols)
                            return;
                        frameAt = (frameAt + 1) % frames.length;
                        var png = frames[frameAt];
                        if (png)
                            void $.ui.blit({ requestId: PANE, key: 'view', source: { png: png }, columns: imageBox.cols, rows: imageBox.rows }).catch(function () { return undefined; });
                    });
                    settingsPath = "".concat(root, "/.claude/team-wire.json");
                    return [4 /*yield*/, loadSettings($)];
                case 37:
                    _h.sent();
                    poll = function () { return __awaiter(void 0, void 0, void 0, function () {
                        var path, st, sig, text, _a, parsed_1, _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0: return [4 /*yield*/, loadSettings($).catch(function () { return false; })];
                                case 1:
                                    _c.sent();
                                    _c.label = 2;
                                case 2:
                                    _c.trys.push([2, 11, , 12]);
                                    path = isDemo ? demoLog() : logPath;
                                    return [4 /*yield*/, $.fs.stat(path)];
                                case 3:
                                    st = _c.sent();
                                    sig = "".concat(path, ":").concat(st.size, ":").concat(st.mtimeMs);
                                    if (!(sig !== logSeen)) return [3 /*break*/, 10];
                                    logSeen = sig;
                                    if (!(st.size < READ_LIMIT)) return [3 /*break*/, 5];
                                    return [4 /*yield*/, $.fs.read(path)];
                                case 4:
                                    _a = _c.sent();
                                    return [3 /*break*/, 7];
                                case 5: return [4 /*yield*/, $.process.run(['tail', '-n', TAIL_LINES, path])];
                                case 6:
                                    _a = (_c.sent()).stdout;
                                    _c.label = 7;
                                case 7:
                                    text = _a;
                                    parsed_1 = (0, model_1.parse)(text);
                                    logText = text;
                                    timeline = activity(text);
                                    replayed = { at: '', team: null };
                                    return [4 /*yield*/, announce($, parsed_1)];
                                case 8:
                                    _c.sent();
                                    return [4 /*yield*/, (0, claude_code_1.update)($, team, function () { return parsed_1; })];
                                case 9:
                                    _c.sent();
                                    _c.label = 10;
                                case 10: return [3 /*break*/, 12];
                                case 11:
                                    _b = _c.sent();
                                    return [3 /*break*/, 12];
                                case 12: return [4 /*yield*/, watchScreen($)
                                    // Also catches a resized pane, whose size only a draw learns.
                                ];
                                case 13:
                                    _c.sent();
                                    // Also catches a resized pane, whose size only a draw learns.
                                    void paint($);
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    pollNow = poll;
                    return [4 /*yield*/, poll()];
                case 38:
                    _h.sent();
                    $.clock.every(POLL_MS, function () { return void poll(); });
                    return [2 /*return*/, started];
            }
        });
    }); });
    // While recording: teammates' messages as they reach the lead's conversation.
    on('session.append', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var result, content, text, got, ms_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, next(e)];
                case 1:
                    result = _a.sent();
                    if (!(isRecording && recTeam && e.message.type === 'user' && e.agentId === undefined)) return [3 /*break*/, 3];
                    content = e.message.content;
                    text = typeof content === 'string' ? content
                        : Array.isArray(content) ? content.map(function (b) { return (b && typeof b === 'object' && 'text' in b && typeof b.text === 'string' ? b.text : ''); }).join('\n') : '';
                    got = text.includes('<teammate-message') ? (0, recorder_1.deliveredMessages)(text) : [];
                    if (!got.length) return [3 /*break*/, 3];
                    return [4 /*yield*/, $.clock.now()];
                case 2:
                    ms_1 = _a.sent();
                    void noteMessages($, got.map(function (m) { return (__assign(__assign({}, m), { to: 'lead', ms: ms_1 })); })).catch(function () { return undefined; });
                    _a.label = 3;
                case 3: return [2 /*return*/, result];
            }
        });
    }); });
    // While recording: the lead's own messages, once sent.
    on('tool.call', { tool: 'SendMessage' }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var result, _a, _b;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, next(e)];
                case 1:
                    result = _d.sent();
                    if (!(isRecording && recTeam && e.agentId === undefined && !('deny' in result) && typeof e.to === 'string' && typeof e.message === 'string')) return [3 /*break*/, 3];
                    _a = noteMessages;
                    _b = [$];
                    _c = { from: 'lead', to: e.to, text: e.message };
                    return [4 /*yield*/, $.clock.now()];
                case 2:
                    void _a.apply(void 0, _b.concat([[(_c.ms = _d.sent(), _c)]])).catch(function () { return undefined; });
                    _d.label = 3;
                case 3: return [2 /*return*/, result];
            }
        });
    }); });
    on('command.run', { command: 'team' }, function ($, e) { return __awaiter(void 0, void 0, void 0, function () {
        var arg, t_1, note, _a, current, _b, isPlaced, t, state;
        var _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    arg = e.args.trim().toLowerCase();
                    if (!(arg === 'off')) return [3 /*break*/, 4];
                    return [4 /*yield*/, (0, claude_code_1.update)($, isOff, function () { return true; })];
                case 1:
                    _e.sent();
                    return [4 /*yield*/, $.store.set('off', true)];
                case 2:
                    _e.sent();
                    return [4 /*yield*/, $.ui.close({ id: PANE })];
                case 3:
                    _e.sent();
                    return [2 /*return*/, { text: 'Team Wire is off: the pane and the summary line are hidden. /team turns it back on.' }];
                case 4:
                    if (!(arg === 'config' || arg === 'config init')) return [3 /*break*/, 6];
                    _c = {};
                    return [4 /*yield*/, configCommand($, arg === 'config init' ? 'init' : '')];
                case 5: return [2 /*return*/, (_c.text = _e.sent(), _c)];
                case 6:
                    if (!(arg === 'times')) return [3 /*break*/, 8];
                    return [4 /*yield*/, (0, claude_code_1.read)($, team)];
                case 7:
                    t_1 = _e.sent();
                    return [2 /*return*/, { text: t_1 ? timesTable(t_1) : noLog() }];
                case 8:
                    if (!(arg === 'demo' || arg === 'demo off')) return [3 /*break*/, 10];
                    _d = {};
                    return [4 /*yield*/, demo($, arg === 'demo')];
                case 9: return [2 /*return*/, (_d.text = _e.sent(), _d)];
                case 10:
                    if (!(arg === 'sound on' || arg === 'sound off' || arg === 'sound')) return [3 /*break*/, 12];
                    isSound = arg === 'sound' ? !isSound : arg === 'sound on';
                    return [4 /*yield*/, $.store.set('sound', isSound)];
                case 11:
                    _e.sent();
                    if (isSound)
                        void $.audio.play({ asset: 'sounds/alert.wav' }).catch(function () { return undefined; });
                    return [2 /*return*/, { text: "Team alerts ".concat(isSound ? 'sound' : 'are silent', ". Toasts and the blinking ring stay either way.") }];
                case 12:
                    note = '';
                    if (!(arg === 'screen')) return [3 /*break*/, 14];
                    _a = " ".concat;
                    return [4 /*yield*/, openScreen($)];
                case 13:
                    note = _a.apply(" ", [_e.sent()]);
                    return [3 /*break*/, 21];
                case 14:
                    if (!(arg === 'text' || arg === 'pictures')) return [3 /*break*/, 17];
                    return [4 /*yield*/, (0, claude_code_1.update)($, isText, function () { return arg === 'text'; })];
                case 15:
                    _e.sent();
                    return [4 /*yield*/, $.store.set('text', arg === 'text')];
                case 16:
                    _e.sent();
                    return [3 /*break*/, 21];
                case 17:
                    if (!(arg === 'live' || arg === 'still')) return [3 /*break*/, 20];
                    return [4 /*yield*/, (0, claude_code_1.update)($, isStill, function () { return arg === 'still'; })];
                case 18:
                    _e.sent();
                    return [4 /*yield*/, $.store.set('still', arg === 'still')];
                case 19:
                    _e.sent();
                    if (arg === 'still')
                        frames = [];
                    return [3 /*break*/, 21];
                case 20:
                    if (arg && !isView(arg)) {
                        return [2 /*return*/, { text: "Unknown option \"".concat(arg, "\". Use /team map, /team office, /team factory, /team screen, /team live, /team still, /team text, /team pictures, /team sound on|off, /team demo [off], /team times, /team config [init] or /team off.") }];
                    }
                    _e.label = 21;
                case 21: return [4 /*yield*/, (0, claude_code_1.update)($, isOff, function () { return false; })];
                case 22:
                    _e.sent();
                    return [4 /*yield*/, $.store.set('off', false)];
                case 23:
                    _e.sent();
                    if (!isView(arg)) return [3 /*break*/, 25];
                    return [4 /*yield*/, setView($, arg)];
                case 24:
                    _e.sent();
                    _e.label = 25;
                case 25:
                    if (!isView(arg)) return [3 /*break*/, 26];
                    _b = arg;
                    return [3 /*break*/, 28];
                case 26: return [4 /*yield*/, (0, claude_code_1.read)($, view)];
                case 27:
                    _b = _e.sent();
                    _e.label = 28;
                case 28:
                    current = _b;
                    return [4 /*yield*/, openPane($)];
                case 29:
                    isPlaced = (_e.sent()).isPlaced;
                    void paint($);
                    return [4 /*yield*/, (0, claude_code_1.read)($, team)];
                case 30:
                    t = _e.sent();
                    state = t ? (0, views_1.summary)(t) : noLog().replace(/^N/, 'n').replace(/\.$/, '');
                    return [2 /*return*/, { text: "Team pane: ".concat(LABEL[current], " view").concat(isPlaced ? '' : ' (it opens once the window is wide enough)', ". ").concat(state, ".").concat(note) }];
            }
        });
    }); });
    on('ui.render', { component: 'Pane', requestId: PANE }, function ($, e) { return __awaiter(void 0, void 0, void 0, function () {
        var t, v, sel, f, cols, rows, draw, controls, _a, Box_1, Text_1, Button_1, Image_1, usePicture, _b, _c, pic, _d, png_1, _e, _f, body, room, _g, Box, Text, Button, Svg, _h, width, height, _j, _k;
        var _l;
        return __generator(this, function (_m) {
            switch (_m.label) {
                case 0: return [4 /*yield*/, (0, claude_code_1.read)($, team)];
                case 1:
                    t = _m.sent();
                    return [4 /*yield*/, (0, claude_code_1.read)($, view)];
                case 2:
                    v = _m.sent();
                    return [4 /*yield*/, (0, claude_code_1.read)($, selected)];
                case 3:
                    sel = _m.sent();
                    return [4 /*yield*/, (0, claude_code_1.read)($, filter)];
                case 4:
                    f = _m.sent();
                    cols = e.props.bodyColumns;
                    rows = e.props.scroll.bodyRows;
                    box = { cols: cols, rows: rows };
                    draw = function (lines, T) {
                        return lines.map(function (line) { return (<T>
          {line.length ? line.map(function (s) { return <T {...(s.color ? { color: s.color } : {})} {...(s.dim ? { dimColor: true } : {})} {...(s.bold ? { bold: true } : {})}>{s.t}</T>; }) : ' '}
        </T>); });
                    };
                    controls = function (Box, Text, Button) {
                        var _a;
                        return (<Box flexDirection="column">
        <Box flexDirection="row" gap={1}>
          {VIEWS.map(function (x) { return <Button key={"view-".concat(x)} hotkey={x[0]} {...(x === v ? { variant: 'primary' } : {})} onPress={function () { return setView($, x); }}>{LABEL[x]}</Button>; })}
          <Text dimColor>│</Text>
          {FILTERS.map(function (x) { return <Button key={"filter-".concat(x)} {...(x === f ? { variant: 'primary' } : {})} onPress={function () { return setFilter($, x); }}>{FILTER_LABEL[x]}</Button>; })}
        </Box>
        <Box flexDirection="row" gap={1} flexWrap="wrap">
          {((_a = t === null || t === void 0 ? void 0 : t.members) !== null && _a !== void 0 ? _a : []).map(function (m) { return (<Button key={"who-".concat(m.name)} plain onPress={function () { return choose($, m.name); }}>
              {/* A flagged teammate's chip turns red with a ▲: the same width, so the row never reflows. */}
              <Text color={m.isFlagged ? 'error' : views_1.AREA_COLOR[m.area]} {...(m.name === sel ? { inverse: true, bold: true } : {})}>{"".concat(m.isFlagged ? '▲' : ' ').concat((0, model_1.initials)(m.name), " ")}</Text>
            </Button>); })}
          <Text dimColor>{sel === 'lead' ? ' everyone' : " ".concat((0, model_1.shortName)(sel))}</Text>
        </Box>
      </Box>);
                    };
                    if (!(e.surface === 'terminal')) return [3 /*break*/, 17];
                    _a = $.ui.resolve(e), Box_1 = _a.Box, Text_1 = _a.Text, Button_1 = _a.Button, Image_1 = _a.Image;
                    if (!t)
                        return [2 /*return*/, <Box_1 flexDirection="column">{controls(Box_1, Text_1, Button_1)}<Text_1 dimColor>{noLog()}</Text_1></Box_1>];
                    _b = (rsvg !== '' || chrome !== '');
                    if (!_b) return [3 /*break*/, 6];
                    return [4 /*yield*/, (0, claude_code_1.read)($, isText)];
                case 5:
                    _b = !(_m.sent());
                    _m.label = 6;
                case 6:
                    usePicture = _b;
                    _c = usePicture;
                    if (!_c) return [3 /*break*/, 8];
                    return [4 /*yield*/, (0, claude_code_1.read)($, screen)];
                case 7:
                    _c = (_m.sent());
                    _m.label = 8;
                case 8:
                    if (_c) {
                        // The picture plays in the screen; here, only what steers it.
                        imageBox = { cols: 0, rows: 0 };
                        return [2 /*return*/, (<Box_1 flexDirection="column">
            {controls(Box_1, Text_1, Button_1)}
            <Text_1 dimColor>{isDemo ? 'DEMO · ' : ''}{(0, views_1.summary)(t)} · showing in the Team screen →</Text_1>
          </Box_1>)];
                    }
                    if (!usePicture) return [3 /*break*/, 10];
                    return [4 /*yield*/, (0, claude_code_1.read)($, picture)];
                case 9:
                    _d = _m.sent();
                    return [3 /*break*/, 11];
                case 10:
                    _d = null;
                    _m.label = 11;
                case 11:
                    pic = _d;
                    if (!!pic) return [3 /*break*/, 12];
                    _e = '';
                    return [3 /*break*/, 16];
                case 12:
                    if (!((_l = frames[frameAt % Math.max(1, frames.length)]) !== null && _l !== void 0)) return [3 /*break*/, 13];
                    _f = _l;
                    return [3 /*break*/, 15];
                case 13: return [4 /*yield*/, $.fs.read("".concat(wireDir, "/view.png"), { as: 'bytes' }).then(function (b) { return b.base64; }).catch(function () { return ''; })];
                case 14:
                    _f = (_m.sent());
                    _m.label = 15;
                case 15:
                    _e = _f;
                    _m.label = 16;
                case 16:
                    png_1 = _e;
                    if (png_1) {
                        imageBox = { cols: Math.min(255, cols), rows: Math.min(255, Math.max(4, rows - CONTROL_ROWS)) };
                        return [2 /*return*/, (<Box_1 flexDirection="column">
            {controls(Box_1, Text_1, Button_1)}
            <Image_1 key="view" source={{ png: png_1 }} columns={imageBox.cols} rows={imageBox.rows} alt={(0, views_1.altText)(t, v)}/>
          </Box_1>)];
                    }
                    body = (0, views_1.textView)(t, v, cols);
                    room = Math.max(3, rows - body.length - 6);
                    return [2 /*return*/, (<Box_1 flexDirection="column">
          {controls(Box_1, Text_1, Button_1)}
          <Text_1 dimColor>{(0, views_1.summary)(t)}{usePicture ? ' · drawing the picture…' : ''}</Text_1>
          <Box_1 flexDirection="column" marginTop={1}>{draw(body, Text_1)}</Box_1>
          <Box_1 flexDirection="column" marginTop={1}>
            <Text_1 bold>Latest messages</Text_1>
            {draw((0, views_1.messageLines)(t, cols, room), Text_1)}
          </Box_1>
        </Box_1>)];
                case 17:
                    _g = $.ui.resolve(e), Box = _g.Box, Text = _g.Text, Button = _g.Button, Svg = _g.Svg;
                    if (!t)
                        return [2 /*return*/, <Box flexDirection="column">{controls(Box, Text, Button)}<Text dimColor>{noLog()}</Text></Box>];
                    _h = pictureSize(cols, rows), width = _h.width, height = _h.height;
                    _j = dashboard_1.dashboardSvg;
                    _k = [t, v];
                    return [4 /*yield*/, themeOf($)];
                case 18: return [2 /*return*/, (<Box flexDirection="column" gap={1}>
        {controls(Box, Text, Button)}
        <Svg source={_j.apply(void 0, _k.concat([_m.sent(), { width: width, height: height, selected: sel, filter: f }]))} alt={(0, views_1.altText)(t, v)} isInteractive/>
      </Box>)];
            }
        });
    }); });
    on('ui.render', { component: 'AbovePrompt' }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var t, _a, Text, flagged;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, claude_code_1.read)($, team)];
                case 1:
                    t = _b.sent();
                    return [4 /*yield*/, (0, claude_code_1.read)($, isOff)];
                case 2:
                    if (_b.sent())
                        return [2 /*return*/, next(e)];
                    _a = !t;
                    if (_a) return [3 /*break*/, 4];
                    return [4 /*yield*/, $.clock.now()];
                case 3:
                    _a = (_b.sent()) - Date.parse(t.lastTs) > BAND_FRESH_MS;
                    _b.label = 4;
                case 4:
                    if (_a)
                        return [2 /*return*/, next(e)];
                    Text = $.ui.resolve(e).Text;
                    flagged = t.members.filter(function (m) { return m.isFlagged; }).map(function (m) { return m.name; });
                    return [2 /*return*/, (<Text>
        <Text bold>Team</Text>
        {isDemo ? <Text color="warning"> · DEMO</Text> : ''}
        <Text dimColor> · {(0, views_1.summary)(t)}</Text>
        {flagged.length ? <Text color="error"> · ▲ {flagged.join(', ')}</Text> : ''}
        <Text dimColor> · /team</Text>
      </Text>)];
            }
        });
    }); });
};
exports.register = register;
