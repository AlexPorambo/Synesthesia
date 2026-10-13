/* Synesthesia's procedural engine. No generated image API is used.
   Coordinates are normalized to a 1000 × 1000 drawing space.
   All randomness comes from a seeded generator. */
'use strict';
const ArtEngine = (() => {
    const TAU = Math.PI * 2;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    function randomFrom(seed) {
        let state = seed >>> 0;
        return () => {
            state = (state + 0x6D2B79F5) >>> 0;
            let t = Math.imul(state ^ (state >>> 15), state | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    // Smooth lattice noise, layered into fractional Brownian motion (fBm).
    function makeNoise(seed) {
        function hash(x, y) {
            let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
            n = Math.imul(n ^ (n >>> 13), 1274126177);
            return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
        }
        const smooth = t => t * t * (3 - 2 * t);
        const lerp = (a, b, t) => a + (b - a) * t;
        function noise(x, y) {
            const ix = Math.floor(x), iy = Math.floor(y);
            const u = smooth(x - ix), v = smooth(y - iy);
            return lerp(lerp(hash(ix, iy), hash(ix + 1, iy), u),
                lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), u), v);
        }
        return (x, y) => {
            let sum = 0, amplitude = .57;
            for (let k = 0; k < 4; k++) {
                sum += amplitude * noise(x, y);
                x = x * 2.03 + 19.4; y = y * 2.03 + 7.1; amplitude *= .47;
            }
            return sum;
        };
    }
    function draw(canvas, input) {
        const p = {...input};
        const ctx = canvas.getContext('2d');
        const rand = randomFrom(Number(p.seed) || 0);
        const noise = makeNoise((Number(p.seed) || 0) ^ 0x13579);
        const c = p.complexity / 10, bend = p.curvature / 10;
        const color = (offset = 0, light = 62, alpha = 1) =>
            `hsla(${p.baseHue + offset}, ${p.saturation}%, ${light}%, ${alpha})`;
        function path(points, width, stroke) {
            if (points.length < 2) return;
            ctx.beginPath(); ctx.moveTo(...points[0]);
            for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
            ctx.lineWidth = width; ctx.strokeStyle = stroke; ctx.stroke();
        }
        function glow(points, width, offset, alpha = .5) {
            path(points, width * 7, color(offset, 48, alpha * .035 * p.glow));
            path(points, width * 3, color(offset, 60, alpha * .09 * p.glow));
            path(points, width, color(offset, 66, alpha));
        }
        function dot(x, y, r, stroke) {
            ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = stroke; ctx.fill();
        }
        ctx.setTransform(canvas.width / 1000, 0, 0, canvas.height / 1000, 0, 0);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#05080d'; ctx.fillRect(0, 0, 1000, 1000);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const haze = ctx.createRadialGradient(510, 520, 10, 510, 520, 660);
        haze.addColorStop(0, color(0, 17, .18)); haze.addColorStop(1, '#05080d');
        ctx.fillStyle = haze; ctx.fillRect(0, 0, 1000, 1000);
        ctx.globalCompositeOperation = 'screen';

        function ribbons() {
            // Closely spaced trajectories form coherent bands, with noise
            // bending them and a vortex adding rotational attraction.
            const bands = 3 + Math.round(c * 5);
            for (let b = 0; b < bands; b++) {
                const y0 = 180 + b * 640 / bands + rand() * 70;
                const phase = rand() * TAU, hue = (rand() - .5) * p.hueSpread;
                const threads = 35 + Math.round(c * 60);
                for (let t = 0; t < threads; t++) {
                    let x = -30 + rand() * 20;
                    let y = y0 + (t / threads - .5) * (25 + p.flow * 7);
                    const pts = [];
                    for (let j = 0; j < 430; j++) {
                        pts.push([x, y]);
                        const field = (noise(x * .0025, y * .0025) - .5) * 2;
                        const wave = Math.sin(x * (.003 + p.flow * .0006) + phase);
                        const orbit = Math.atan2(y - 500, x - 540) + Math.PI / 2;
                        const angle = field * (1 + bend * 2.8) + wave * bend * .75;
                        x += (Math.cos(angle) * (1 - p.swirl * .55) + Math.cos(orbit) * p.swirl * .55) * 3.4;
                        y += (Math.sin(angle) * (1 - p.swirl * .55) + Math.sin(orbit) * p.swirl * .55) * 3.4;
                        if (x > 1040 || y < -100 || y > 1100) break;
                    }
                    glow(pts, .4 + rand() * .55, hue + t / threads * 15, .18 + rand() * .23);
                }
            }
        }
        function flames() {
            // Separate plumes rise from a source region. Width and opacity
            // taper with height; noise introduces coherent turbulence.
            const plumes = 4 + Math.round(c * 6);
            for (let b = 0; b < plumes; b++) {
                const center = 280 + rand() * 440, height = 330 + rand() * 510;
                const spread = 20 + rand() * 90, hue = (rand() - .5) * p.hueSpread;
                const threads = 30 + Math.round(c * 55);
                const phase = rand() * TAU;
                for (let t = 0; t < threads; t++) {
                    const offset = (t / threads - .5) * spread;
                    const pts = [];
                    for (let j = 0; j <= 150; j++) {
                        const u = j / 150, y = 920 - u * height;
                        const turbulence = (noise(u * (2 + p.flow * .3), b * 3.7) - .5);
                        const x = center + offset * (1 - u) ** .7
                            + Math.sin(u * 7 + phase) * (15 + bend * 55) * u
                            + turbulence * 120 * bend * u;
                        pts.push([x, y]);
                    }
                    // Segment groups make brightness and width fade upward.
                    for (let k = 0; k < 15; k++) {
                        const u = k / 15;
                        glow(pts.slice(k * 10, k * 10 + 11), .5 + (1 - u) * 1.3,
                            hue - u * 15, .22 * (1 - u) + .035);
                    }
                }
            }
            for (let i = 0; i < 120 + c * 240; i++) {
                const y = 150 + rand() * 700;
                dot(240 + rand() * 530, y, .3 + rand(), color(15, 78, rand() * .45));
            }
        }
        function branches() {
            // Recursive branching: the depth is capped to bound work.
            const depth = 7 + Math.round(c * 3);
            function branch(x, y, angle, len, level, hue) {
                if (!level || len < 1.4) return;
                const twist = (rand() - .5) * bend * .32;
                const endX = x + Math.cos(angle + twist) * len;
                const endY = y + Math.sin(angle + twist) * len;
                const mid = [(x + endX) / 2 + Math.sin(angle) * len * .1,
                    (y + endY) / 2 - Math.cos(angle) * len * .1];
                glow([[x, y], mid, [endX, endY]], .2 + level * .19, hue, .4 + level * .025);
                const spread = .23 + bend * .55;
                branch(endX, endY, angle - spread * (.7 + rand() * .6), len * (.65 + rand() * .12), level - 1, hue - 2);
                branch(endX, endY, angle + spread * (.7 + rand() * .6), len * (.65 + rand() * .12), level - 1, hue + 2);
                if (level <= 2) dot(endX, endY, .6 + rand(), color(hue, 76, .35));
            }
            const roots = 3 + Math.round(c * 5);
            for (let i = 0; i < roots; i++) {
                branch(110 + i * 780 / Math.max(1, roots - 1), 940 - rand() * 100,
                    -Math.PI / 2 + (rand() - .5) * .25,
                    95 + rand() * 55, depth, (rand() - .5) * p.hueSpread);
            }
        }
        function orbits() {
            const count = 90 + Math.round(c * 230);
            for (let i = 0; i < count; i++) {
                const radius = 70 + i / count * 340;
                const tilt = .35 + bend * .6;
                const phase = rand() * TAU, pts = [];
                const hue = (i / count - .5) * p.hueSpread;
                for (let j = 0; j <= 400; j++) {
                    const a = j / 400 * TAU;
                    const r = radius + Math.sin(a * (2 + Math.round(p.flow / 2)) + phase) * (4 + bend * 16);
                    const xx = Math.cos(a) * r, yy = Math.sin(a) * r * (.4 + p.swirl * .55);
                    pts.push([500 + xx * Math.cos(tilt) - yy * Math.sin(tilt),
                        500 + xx * Math.sin(tilt) + yy * Math.cos(tilt)]);
                }
                glow(pts, .5, hue, .32);
            }
            for (let i = 0; i < 400; i++) dot(rand() * 1000, rand() * 1000, rand() * 1.1, color(0, 85, rand() * .35));
        }
        function crystals() {
            const arms = 6;
            const layers = 12 + Math.round(c * 30);
            const rotation = rand() * TAU;
            for (let l = 0; l < layers; l++) {
                const radius = 35 + l / layers * 395, pts = [];
                const hue = (l / layers - .5) * p.hueSpread;
                const skew = (noise(l * .15, 5) - .5) * bend * .25;
                for (let a = 0; a <= arms; a++) {
                    const angle = a / arms * TAU + rotation + skew;
                    pts.push([500 + Math.cos(angle) * radius, 500 + Math.sin(angle) * radius]);
                }
                glow(pts, .6 + rand() * .5, hue, .25);
                for (let a = 0; a < arms; a++) {
                    const angle = a / arms * TAU + rotation;
                    const tip = [500 + Math.cos(angle) * radius, 500 + Math.sin(angle) * radius];
                    const tangent = angle + Math.PI / 2;
                    for (const sign of [-1, 1]) {
                        const length = radius * (.08 + p.flow * .008);
                        glow([tip, [tip[0] + Math.cos(tangent + sign * .5) * length * sign,
                            tip[1] + Math.sin(tangent + sign * .5) * length * sign]], .6, hue, .4);
                    }
                }
            }
            for (let a = 0; a < arms; a++) {
                const angle = a / arms * TAU + rotation;
                glow([[500, 500], [500 + Math.cos(angle) * 450, 500 + Math.sin(angle) * 450]], 1, 0, .65);
            }
        }
        function lightning() {
            function bolt(x, y, angle, len, depth, width) {
                const pts = [[x, y]];
                const segments = 18;
                for (let j = 1; j <= segments; j++) {
                    const dist = j / segments * len, jitter = (rand() - .5) * (12 + bend * 45);
                    pts.push([x + Math.cos(angle) * dist + Math.cos(angle + Math.PI / 2) * jitter,
                        y + Math.sin(angle) * dist + Math.sin(angle + Math.PI / 2) * jitter]);
                }
                glow(pts, width, (rand() - .5) * p.hueSpread, .8);
                path(pts, width * .25, 'rgba(225,245,255,.7)');
                if (depth > 0) for (let b = 0; b < 2; b++) {
                    const point = pts[5 + Math.floor(rand() * 10)];
                    bolt(...point, angle + (rand() - .5) * 1.6, len * .4, depth - 1, width * .55);
                }
            }
            for (let i = 0; i < 2 + Math.round(c * 5); i++)
                bolt(150 + rand() * 700, 80 + rand() * 100, Math.PI / 2 + (rand() - .5) * .8,
                    420 + rand() * 370, 2, 1 + rand() * 1.2);
        }
        const renderers = {ribbons, flames, branches, orbits, crystals, lightning};
        (renderers[p.structure] || ribbons)();
        ctx.globalCompositeOperation = 'source-over';
        // Subtle vignette creates breathing room around the composition.
        const vignette = ctx.createRadialGradient(500, 500, 300, 500, 500, 720);
        vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,0,0,.72)');
        ctx.fillStyle = vignette; ctx.fillRect(0, 0, 1000, 1000);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    return {draw, version: '2.0.0'};
})();
