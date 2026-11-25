"use strict";
// The backdrop: a red and cyan scene for anaglyph glasses, and the dark theme that goes with it.
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
exports.COLORS = exports.SCENE_LIMIT = exports.SCENE = exports.INKS = exports.DEPTH = void 0;
exports.settingsFrom = settingsFrom;
exports.scene = scene;
exports.lookFor = lookFor;
var make_colors_js_1 = require("./make-colors.js");
// Red lens on the left eye, cyan on the right. A depth is the red copy's x minus the cyan
// copy's, in on-screen CSS pixels: negative sits behind the screen, positive in front.
exports.DEPTH = { far: -10, near: 6 };
// Each pair of inks is as bright as the glasses allow without the other lens letting it
// through: leakier lenses get dimmer, purer inks.
exports.INKS = {
    clean: { red: '#ff1a1a', cyan: '#00b4f0' },
    typical: { red: '#e00a0a', cyan: '#0090c8' },
    leaky: { red: '#c00808', cyan: '#0078a8' },
};
exports.SCENE = 'anaglyph';
exports.SCENE_LIMIT = 131072;
function settingsFrom(options) {
    var depth = options.depth;
    var glasses = options.glasses;
    return {
        strength: typeof depth === 'number' && Number.isFinite(depth) ? Math.min(2, Math.max(0.2, depth)) : 1,
        glasses: typeof glasses === 'string' && glasses in exports.INKS ? glasses : 'typical',
    };
}
var W = 1600;
var H = 1000;
var HORIZON = 620;
var VX = W / 2;
var GRID = '#6a4fa8';
var BG = '#07070b';
// The scene scales with its box by max(width / W, height / H). Each bracket covers boxes up to
// that scale, and the fallback anything larger, so a depth stays the same number of pixels.
var BRACKETS = [0.6, 0.8, 1, 1.25, 1.6, 2];
var FALLBACK_SCALE = 2.6;
var f = function (n) { return (Math.round(n * 100) / 100).toString(); };
var depthName = function (n) { return "d".concat(String(n).replace('-', 'm').replace('.', '_')); };
function random(seed) {
    var s = seed;
    return function () {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / Math.pow(2, 32);
    };
}
function polygon(r, n, start) {
    return Array.from({ length: n }, function (_, k) {
        var a = ((start + (360 / n) * k) * Math.PI) / 180;
        return [r * Math.cos(a), r * Math.sin(a)];
    });
}
var pts = function (ps) { return ps.map(function (_a) {
    var x = _a[0], y = _a[1];
    return "".concat(f(x), " ").concat(f(y));
}); };
// Wireframes drawn flat: an in-plane spin keeps both eyes' copies level with each other.
function shape(kind, r) {
    if (kind === 'cube') {
        var v = polygon(r, 6, -90);
        return "M".concat(pts(v).join('L'), "Z") + v.map(function (_a) {
            var x = _a[0], y = _a[1];
            return "M0 0L".concat(f(x), " ").concat(f(y));
        }).join('');
    }
    if (kind === 'tetra') {
        var v = polygon(r, 3, -90);
        return "M".concat(pts(v).join('L'), "Z") + v.map(function (_a) {
            var x = _a[0], y = _a[1];
            return "M0 ".concat(f(-r * 0.1), "L").concat(f(x), " ").concat(f(y));
        }).join('');
    }
    var eq = [
        [r * 0.8, 0],
        [0, r * 0.28],
        [-r * 0.8, 0],
        [0, -r * 0.28],
    ];
    return "M".concat(pts(eq).join('L'), "Z") + eq.map(function (_a) {
        var x = _a[0], y = _a[1];
        return "M0 ".concat(f(-r), "L").concat(f(x), " ").concat(f(y), "M0 ").concat(f(r), "L").concat(f(x), " ").concat(f(y));
    }).join('');
}
var FLOATERS = [
    { kind: 'cube', x: 190, y: 250, r: 72, d: 4, spin: 20, bob: 16 },
    { kind: 'tetra', x: 330, y: 520, r: 52, d: 1.5, spin: -16, bob: 11 },
    { kind: 'cube', x: 610, y: 150, r: 34, d: -4, spin: 24, bob: 9 },
    { kind: 'octa', x: 1060, y: 115, r: 32, d: -2, spin: -22, bob: 8 },
    { kind: 'octa', x: 1450, y: 470, r: 78, d: 5.5, spin: 15, bob: 18 },
];
var DRIFT = { from: -4, to: exports.DEPTH.near + 2 };
var RUN = 5; // seconds for a floor line to roll from the horizon to the bottom edge
function scene(_a) {
    var strength = _a.strength, glasses = _a.glasses;
    var _b = exports.INKS[glasses], red = _b.red, cyan = _b.cyan;
    var depths = new Set();
    var eyes = function (content, d) {
        var n = Math.round(d * 2) / 2;
        depths.add(n);
        return ("<g class=\"eye r ".concat(depthName(n), "\" stroke=\"").concat(red, "\" fill=\"").concat(red, "\">").concat(content, "</g>") +
            "<g class=\"eye c ".concat(depthName(n), "\" stroke=\"").concat(cyan, "\" fill=\"").concat(cyan, "\">").concat(content, "</g>"));
    };
    var rand = random(7);
    var stars = [];
    for (var i = 0; i < 150; i++) {
        var x = -500 + rand() * (W + 1000);
        var y = rand() * (HORIZON - 50);
        var r = 0.8 + rand() * 1.6;
        var d = exports.DEPTH.far + rand() * 4;
        var twinkle = rand() < 0.3 ? " class=\"tw\" style=\"animation-delay:-".concat(f(rand() * 3), "s\"") : '';
        stars.push("<g".concat(twinkle, ">").concat(eyes("<circle cx=\"".concat(f(x), "\" cy=\"").concat(f(y), "\" r=\"").concat(f(r), "\" stroke=\"none\"/>"), d), "</g>"));
    }
    var radials = [];
    for (var bx = -2600; bx <= W + 2600; bx += 200)
        radials.push("<line x1=\"".concat(VX, "\" y1=\"").concat(HORIZON, "\" x2=\"").concat(bx, "\" y2=\"").concat(H, "\"/>"));
    var floor = "<g class=\"eye rad r\" stroke=\"".concat(red, "\">").concat(radials.join(''), "</g>") +
        "<g class=\"eye rad c\" stroke=\"".concat(cyan, "\">").concat(radials.join(''), "</g>");
    var LINES = 14;
    var rows = Array.from({ length: LINES }, function (_, i) { return "<line class=\"row\" x1=\"-2600\" y1=\"0\" x2=\"".concat(W + 2600, "\" y2=\"0\" style=\"animation-delay:-").concat(f((RUN / LINES) * i), "s\"/>"); }).join('');
    var frames = Array.from({ length: 13 }, function (_, k) {
        var p = k / 12;
        var z = 14 - 13 * p;
        return "".concat(f(p * 100), "%{transform:translateY(").concat(f(HORIZON + (H - HORIZON) / z), "px)}");
    }).join('');
    var floaters = FLOATERS.map(function (s, i) {
        var body = "<g class=\"spin\" style=\"animation-duration:".concat(Math.abs(s.spin), "s;animation-direction:").concat(s.spin < 0 ? 'reverse' : 'normal', "\"><path d=\"").concat(shape(s.kind, s.r), "\" fill=\"none\"/></g>");
        return "<g transform=\"translate(".concat(s.x, " ").concat(s.y, ")\"><g class=\"bob\" style=\"--b:").concat(s.bob, "px;animation-delay:-").concat(f(i * 1.1), "s\">").concat(eyes(body, s.d), "</g></g>");
    }).join('');
    // A cube that floats out of the screen toward you and back.
    var drifterBody = "<g class=\"spin\" style=\"animation-duration:14s\"><path d=\"".concat(shape('cube', 46), "\" fill=\"none\"/></g>");
    var drifter = "<g transform=\"translate(240 800)\">" +
        "<g class=\"dr-red eye\" stroke=\"".concat(red, "\">").concat(drifterBody, "</g>") +
        "<g class=\"dr-cyan eye\" stroke=\"".concat(cyan, "\">").concat(drifterBody, "</g></g>");
    var planet = "<g transform=\"translate(1340 170)\">".concat(eyes('<circle r="58" fill="none"/><ellipse rx="112" ry="24" fill="none" transform="rotate(-16)"/>', -6.5), "</g>");
    // Turns pixel depths into viewBox units for a box at this scale.
    var rules = function (scale) {
        var u = function (px) { return f((px * strength) / 2 / scale); };
        var out = __spreadArray([], depths, true).map(function (n) { return ".r.".concat(depthName(n), "{transform:translateX(").concat(u(n), "px)}.c.").concat(depthName(n), "{transform:translateX(").concat(u(-n), "px)}"); });
        // The floor's depth runs from far at the horizon to near at the bottom edge: x' = x + k*y + e.
        var k = ((exports.DEPTH.near - exports.DEPTH.far) * strength) / 2 / scale / (H - HORIZON);
        var e = (exports.DEPTH.far * strength) / 2 / scale - k * HORIZON;
        var m = function (sign) { return "matrix(1,0,".concat((sign * k).toFixed(5), ",1,").concat(f(sign * e), ",0)"); };
        out.push(".rad.r{transform:".concat(m(1), "}.rad.c{transform:").concat(m(-1), "}"));
        var id = String(scale).replace('.', '_');
        out.push(".dr-red{animation-name:drR".concat(id, "}.dr-cyan{animation-name:drC").concat(id, "}") +
            "@keyframes drR".concat(id, "{from{transform:translateX(").concat(u(DRIFT.from), "px) scale(.8)}to{transform:translateX(").concat(u(DRIFT.to), "px) scale(1.3)}}") +
            "@keyframes drC".concat(id, "{from{transform:translateX(").concat(u(-DRIFT.from), "px) scale(.8)}to{transform:translateX(").concat(u(-DRIFT.to), "px) scale(1.3)}}"));
        return out.join('');
    };
    var scaled = rules(FALLBACK_SCALE) +
        __spreadArray([], BRACKETS, true).reverse()
            .map(function (t) { return "@media (max-width:".concat(W * t, "px) and (max-height:").concat(H * t, "px){").concat(rules(t), "}"); })
            .join('');
    var style = '.eye{mix-blend-mode:screen}' +
        'path,line,circle,ellipse{stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}' +
        ".row{stroke:".concat(GRID, ";stroke-width:2;animation:approach ").concat(RUN, "s linear infinite}") +
        "@keyframes approach{".concat(frames, "}") +
        '.spin{animation:spin linear infinite}@keyframes spin{to{transform:rotate(360deg)}}' +
        '.bob{animation:bob 4s ease-in-out infinite}@keyframes bob{50%{transform:translateY(calc(var(--b) * -1))}}' +
        '.tw{animation:tw 3s ease-in-out infinite}@keyframes tw{50%{opacity:.25}}' +
        '.dr-red,.dr-cyan{animation-duration:9s;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}' +
        scaled +
        '@media (prefers-reduced-motion:reduce){*{animation:none!important}}';
    return ("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 ".concat(W, " ").concat(H, "\" preserveAspectRatio=\"xMidYMid slice\">") +
        "<style>".concat(style, "</style>") +
        '<defs>' +
        "<linearGradient id=\"fade\" gradientUnits=\"userSpaceOnUse\" x1=\"0\" y1=\"".concat(HORIZON, "\" x2=\"0\" y2=\"").concat(H, "\">") +
        '<stop offset="0" stop-color="#000"/><stop offset=".25" stop-color="#555"/><stop offset="1" stop-color="#fff"/></linearGradient>' +
        "<mask id=\"floor\"><rect x=\"-2600\" y=\"".concat(HORIZON, "\" width=\"").concat(W + 5200, "\" height=\"").concat(H - HORIZON, "\" fill=\"url(#fade)\"/></mask>") +
        "<radialGradient id=\"glow\" cx=\"50%\" cy=\"100%\" r=\"60%\"><stop offset=\"0\" stop-color=\"#3a1640\" stop-opacity=\".9\"/><stop offset=\"1\" stop-color=\"".concat(BG, "\" stop-opacity=\"0\"/></radialGradient>") +
        '</defs>' +
        "<rect x=\"-2600\" y=\"-200\" width=\"".concat(W + 5200, "\" height=\"").concat(H + 400, "\" fill=\"").concat(BG, "\"/>") +
        "<rect x=\"-400\" y=\"".concat(HORIZON - 260, "\" width=\"").concat(W + 800, "\" height=\"260\" fill=\"url(#glow)\"/>") +
        stars.join('') +
        planet +
        "<g mask=\"url(#floor)\">".concat(rows).concat(floor, "</g>") +
        floaters +
        drifter +
        '</svg>');
}
exports.COLORS = (0, make_colors_js_1.makeColors)({
    label: 'Anaglyph',
    only: 'dark',
    roles: { accent: '#22c8e8', danger: '#ff4646', success: '#4cc890', warning: '#e8b440', pro: '#b08cff' },
    dark: {
        gray: {
            anchors: {
                'surface-0': '#0a0a10',
                'surface-1': '#111219',
                'surface-2': '#171822',
                'surface-3': '#1d1e29',
                'text-primary': '#eceef4',
                'text-secondary': '#c3c7d2',
                'text-muted': '#9ba0ae',
            },
        },
    },
});
// Light frosting: heavy blur would smear the two eyes' copies together behind the panels.
function lookFor(settings) {
    return {
        source: scene(settings),
        args: { colors: exports.COLORS.theme, backdrop: { scene: exports.SCENE, glass: { blur: 3, tint: '#0a0a10', opacity: 0.7 } } },
    };
}
