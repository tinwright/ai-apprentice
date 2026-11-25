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
var testing_1 = require("claude-code/testing");
var scene_1 = require("./scene");
var TYPICAL = { strength: 1, glasses: 'typical' };
(0, testing_1.test)('the scene is an SVG under the backdrop limit, and holds still for reduced motion', function () {
    var source = (0, scene_1.scene)(TYPICAL);
    (0, testing_1.expect)(source.startsWith('<svg')).toBe(true);
    (0, testing_1.expect)(source.length).toBeLessThan(scene_1.SCENE_LIMIT);
    (0, testing_1.expect)(source).toContain('prefers-reduced-motion');
});
(0, testing_1.test)('every depth an eye is drawn at has a rule placing it', function () {
    var source = (0, scene_1.scene)(TYPICAL);
    var used = new Set(__spreadArray([], source.matchAll(/class="eye [rc] (d[\w]+)"/g), true).map(function (m) { return m[1]; }));
    (0, testing_1.expect)(used.size).toBeGreaterThan(3);
    for (var _i = 0, used_1 = used; _i < used_1.length; _i++) {
        var name_1 = used_1[_i];
        (0, testing_1.expect)(source).toContain(".r.".concat(name_1, "{transform:translateX("));
        (0, testing_1.expect)(source).toContain(".c.".concat(name_1, "{transform:translateX("));
    }
});
(0, testing_1.test)('the two eyes are pushed apart in opposite directions, by the same amount', function () {
    var at = function (source, eye) { var _a; return Number((_a = new RegExp("\\.".concat(eye, "\\.dm6_5\\{transform:translateX\\((-?[\\d.]+)px")).exec(source)) === null || _a === void 0 ? void 0 : _a[1]); };
    var source = (0, scene_1.scene)(TYPICAL);
    (0, testing_1.expect)(at(source, 'r')).toBeLessThan(0);
    (0, testing_1.expect)(at(source, 'r')).toBe(-at(source, 'c'));
});
(0, testing_1.test)('depth scales how far apart the eyes are', function () {
    var offset = function (strength) { var _a; return Number((_a = /\.r\.dm6_5\{transform:translateX\((-?[\d.]+)px/.exec((0, scene_1.scene)({ strength: strength, glasses: 'typical' }))) === null || _a === void 0 ? void 0 : _a[1]); };
    (0, testing_1.expect)(Math.abs(offset(2) - offset(1) * 2)).toBeLessThan(0.05);
});
(0, testing_1.test)('the inks follow the glasses setting', function () {
    for (var _i = 0, _a = ['clean', 'typical', 'leaky']; _i < _a.length; _i++) {
        var glasses = _a[_i];
        var source = (0, scene_1.scene)({ strength: 1, glasses: glasses });
        (0, testing_1.expect)(source).toContain("stroke=\"".concat(scene_1.INKS[glasses].red, "\""));
        (0, testing_1.expect)(source).toContain("stroke=\"".concat(scene_1.INKS[glasses].cyan, "\""));
    }
});
(0, testing_1.test)('settings fall back to defaults and keep depth in range', function () {
    (0, testing_1.expect)((0, scene_1.settingsFrom)({})).toEqual({ strength: 1, glasses: 'typical' });
    (0, testing_1.expect)((0, scene_1.settingsFrom)({ depth: 9, glasses: 'leaky' })).toEqual({ strength: 2, glasses: 'leaky' });
    (0, testing_1.expect)((0, scene_1.settingsFrom)({ depth: 0, glasses: 'rose' })).toEqual({ strength: 0.2, glasses: 'typical' });
});
(0, testing_1.test)('the desktop app paints the theme, and the look names the scene', function () {
    (0, testing_1.expect)(scene_1.COLORS.problems.filter(function (line) { return line.startsWith("Desktop won't paint"); })).toEqual([]);
    (0, testing_1.expect)((0, scene_1.lookFor)(TYPICAL).args.backdrop).toMatchObject({ scene: scene_1.SCENE });
});
