const $ = id => document.getElementById(id), cv = $('cv'), c = cv.getContext('2d'), A = new AudioIn();
const PAL = [[320, 190, 55], [105, 135, 170], [8, 30, 50], [190, 220, 260], [0, 60, 120, 180, 240, 300]];
const PN = ['Neon', 'Xbox', 'Ember', 'Ocean', 'Prism'], SC = ['Bloom', 'Tunnel', 'Ribbons', 'Spectrum'];
let W, H, D, t = 0, last = 0, items = [], sparks = [], rings = [], scene = 0, sceneT = 0, auto = true, pal = 0, speed = 1, sens = 1, flash = 0;
const R = (a, b) => a + Math.random() * (b - a), RI = (a, b) => Math.floor(R(a, b + 1));
const hue = i => { const p = PAL[pal]; return (p[i % p.length] + t * (pal == 4 ? 14 : 3)) % 360; };
const col = (i, a, l = 60) => `hsla(${hue(i)},95%,${l}%,${a})`;
function resize() { D = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * D; cv.height = H * D; c.setTransform(D, 0, 0, D, 0, 0); c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }
function poly(n, r, rot = 0) { c.beginPath(); for (let i = 0; i <= n; i++) { const a = rot + i / n * Math.PI * 2; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } }
function star(r) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - 1.57, q = i % 2 ? r * .45 : r; i ? c.lineTo(Math.cos(a) * q, Math.sin(a) * q) : c.moveTo(Math.cos(a) * q, Math.sin(a) * q); } c.closePath(); }
function shape(type, r) { // 8 different shapes for variety
  if (type == 0) { c.beginPath(); c.arc(0, 0, r, 0, 7); } else if (type == 1) { c.beginPath(); c.arc(0, 0, r, 0, 7); c.moveTo(r * .55, 0); c.arc(0, 0, r * .55, 0, 7); }
  else if (type == 2) poly(3, r); else if (type == 3) poly(4, r, .785); else if (type == 4) poly(6, r); else if (type == 5) star(r);
  else if (type == 6) { c.beginPath(); c.rect(-r, -r * .18, r * 2, r * .36); c.rect(-r * .18, -r, r * .36, r * 2); } else poly(5, r);
}
A.onBeat = s => {
  flash = Math.min(.5, flash + s * .25);
  if (scene == 0) for (let i = 0, n = 2 + Math.floor(s * 6); i < n; i++) items.push({ x: R(.08, .92) * W, y: R(.12, .88) * H, vx: R(-50, 50), vy: R(-70, -5), r: R(14, 80) * (.6 + s), type: RI(0, 7), rot: R(0, 6), vr: R(-1.5, 1.5), life: R(3, 6.5), age: 0, h: RI(0, 4) });
  if (scene == 1) items.push({ age: 0, n: RI(3, 9), rot: R(0, 6), vr: R(-.7, .7), h: RI(0, 4), ox: R(-.1, .1), oy: R(-.1, .1) });
  if (scene == 3) rings.push({ age: 0, h: RI(0, 4) });
  for (let i = 0; i < 12 + s * 22; i++) { const a = R(0, 6.28), v = R(80, 420) * (.5 + s); sparks.push({ x: W / 2 + R(-60, 60), y: H / 2 + R(-60, 60), vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: R(.6, 1.6), age: 0, h: RI(0, 4), r: R(1, 3.2) }); }
  if (items.length > 160) items.splice(0, items.length - 160);
  if (sparks.length > 500) sparks.splice(0, sparks.length - 500);
};
function setScene(i) { scene = (i + SC.length) % SC.length; sceneT = 0; items = []; rings = []; flash = .6; $('chips').querySelectorAll('[data-s]').forEach(b => b.classList.toggle('on', +b.dataset.s == scene)); toast(SC[scene]); }
const draw = [
  (dt, f) => { // Bloom: shapes keep spawning and drifting
    if (Math.random() < dt * (3 + f.high * 14)) items.push({ x: R(0, W), y: H + 30, vx: R(-20, 20), vy: R(-120, -30), r: R(6, 28), type: RI(0, 7), rot: R(0, 6), vr: R(-2, 2), life: R(4, 8), age: 0, h: RI(0, 4) });
    for (const o of items) {
      o.age += dt; o.x += (o.vx + Math.sin(t + o.h) * 20) * dt * speed; o.y += o.vy * dt * speed; o.rot += o.vr * dt;
      const a = Math.sin(Math.min(1, o.age / o.life) * Math.PI), r = o.r * (1 + f.bass * .5);
      c.save(); c.translate(o.x, o.y); c.rotate(o.rot); shape(o.type, r);
      c.fillStyle = col(o.h, a * .16); c.fill('evenodd'); c.lineWidth = 1.5 + f.mid * 3; c.strokeStyle = col(o.h, a * .85); c.stroke(); c.restore();
    } items = items.filter(o => o.age < o.life);
  },
  (dt, f) => { // Tunnel: polygons rush at you
    if (Math.random() < dt * .8) A.onBeat(.3);
    const cx = W / 2 + Math.sin(t * .5) * W * .05 * (1 + f.mid * 2), cy = H / 2 + Math.cos(t * .4) * H * .05;
    for (const o of items) {
      o.age += dt * (.7 + f.level * .8) * speed; const r = 18 * Math.exp(o.age * 1.45) * (1 + f.bass * .12), a = Math.min(1, o.age * 3) * Math.max(0, 1 - o.age / 4.4);
      c.save(); c.translate(cx + o.ox * r, cy + o.oy * r); c.rotate(o.rot + o.age * o.vr); poly(o.n, r);
      c.lineWidth = 1 + a * (3 + f.bass * 8); c.strokeStyle = col(o.h, a * .9); c.stroke(); c.restore();
    } items = items.filter(o => o.age < 4.4);
  },
  (dt, f) => { // Ribbons: flowing bands steered by bass / mid / treble
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      for (let x = -10; x <= W + 10; x += 10) {
        const y = H / 2 + (i - 2.5) * H * .07 + Math.sin(x * .004 * (1 + i * .25) + t * (.5 + i * .17) + i * 1.7) * H * (.1 + f.bass * .22) * (.6 + .4 * Math.sin(t * .27 + i))
          + Math.sin(x * .013 - t * 1.4 + i) * H * (.015 + f.mid * .07) + Math.sin(x * .05 + t * 3) * f.high * 12;
        x < 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.lineWidth = 2 + f.bass * 16 * (1 - i / 8); c.strokeStyle = col(i, .35 + f.level * .4); c.lineCap = 'round'; c.stroke();
    }
  },
  (dt, f) => { // Spectrum: radial analyzer with shock rings
    const cx = W / 2, cy = H / 2, m = Math.min(W, H), r0 = m * .17 * (1 + f.bass * .25), N = 128;
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, r0 * 1.2); g.addColorStop(0, col(0, .35 + f.bass * .4)); g.addColorStop(1, col(1, 0));
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r0 * 1.2, 0, 7); c.fill();
    c.lineWidth = Math.max(2, m / 260 * 3); c.lineCap = 'round';
    for (let k = 0; k < N; k++) {
      const v = A.spec[k < 64 ? k : 127 - k], a = k / N * 6.283 + t * .15, l = v * m * .3 * (.6 + k % 2 * .0) + 4;
      c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * (r0 + l), cy + Math.sin(a) * (r0 + l));
      c.strokeStyle = col(k / 22 | 0, .4 + v * .6); c.stroke();
    }
    for (const o of rings) { o.age += dt; c.beginPath(); c.arc(cx, cy, r0 + o.age * m * .5, 0, 7); c.lineWidth = 2; c.strokeStyle = col(o.h, Math.max(0, 1 - o.age * 1.1) * .6); c.stroke(); }
    rings = rings.filter(o => o.age < .95);
  }
];
function frame(now) {
  const dt = Math.min((now - last) / 1000 || .016, .05); last = now; t += dt * speed; sceneT += dt;
  A.update(dt, now); const f = A.f;
  if (auto && sceneT > 28 && A.live) setScene(scene + 1); else if (auto && sceneT > 28 && !A.live) setScene(scene + 1);
  c.globalCompositeOperation = 'source-over'; c.fillStyle = `rgba(0,0,6,${scene == 3 ? .3 : .17})`; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .6); g.addColorStop(0, col(0, .05 + f.bass * .12, 40)); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  draw[scene](dt, f);
  for (const s of sparks) { s.age += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= .985; s.vy *= .985; c.fillStyle = col(s.h, Math.max(0, 1 - s.age / s.life)); c.fillRect(s.x, s.y, s.r, s.r); }
  sparks = sparks.filter(s => s.age < s.life);
  if (flash > .01) { c.fillStyle = col(0, flash * .12, 50); c.fillRect(0, 0, W, H); flash *= Math.exp(-dt * 6); }
  $('m').style.width = f.level * 100 + '%';
  const st = $('status'); st.textContent = A.live ? (A.silent > 2 ? A.name + ' — connected but silent. Is music playing?' : A.name) : 'Demo signal — no audio connected';
  requestAnimationFrame(frame);
}
// ---- UI ----
let hideT, tt; const toast = m => { const e = $('toast'); e.textContent = m; e.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => e.classList.remove('show'), 1800); };
function wake() { document.body.classList.add('ui'); clearTimeout(hideT); hideT = setTimeout(() => { if (!document.body.classList.contains('open')) document.body.classList.remove('ui'); }, 3000); }
['mousemove', 'keydown', 'touchstart', 'click'].forEach(e => addEventListener(e, wake));
const toggleMenu = v => { document.body.classList.toggle('open', v); wake(); };
const msg = e => ({ 'no-audio': 'No audio was shared. In the picker choose a Chrome/Edge TAB (or Entire Screen on Windows) and tick “Share audio”.', unsupported: 'This browser can’t capture audio. Use Chrome or Edge on desktop.', NotAllowedError: 'Cancelled — nothing was shared.' }[e.message] || { NotAllowedError: 'Cancelled — nothing was shared.' }[e.name] || 'Could not start audio: ' + e.message);
async function pick(kind, file) {
  try { if (kind == 'capture') await A.capture(); else if (kind == 'mic') await A.mic(); else await A.file(file); $('welcome').hidden = true; toast('Listening: ' + A.name); $('err').textContent = ''; }
  catch (e) { $('err').textContent = msg(e); $('welcome').hidden = false; }
}
document.querySelectorAll('[data-src]').forEach(b => b.onclick = () => pick(b.dataset.src));
$('file').onchange = e => e.target.files[0] && pick('file', e.target.files[0]);
$('demo').onclick = () => { A.stop(); $('welcome').hidden = true; };
A.onLost = () => { toast('Audio sharing stopped'); $('welcome').hidden = false; };
$('chips').innerHTML = SC.map((s, i) => `<button data-s="${i}">${s}</button>`).join('');
$('pals').innerHTML = PAL.map((p, i) => `<button data-p="${i}" style="background:linear-gradient(90deg,${p.slice(0, 3).map(h => `hsl(${h},95%,55%)`)})" title="${PN[i]}"></button>`).join('');
$('chips').onclick = e => { if (e.target.dataset.s) { setScene(+e.target.dataset.s); auto = false; $('auto').checked = false; } };
$('pals').onclick = e => { if (e.target.dataset.p) { pal = +e.target.dataset.p; document.querySelectorAll('[data-p]').forEach(b => b.classList.toggle('on', +b.dataset.p == pal)); } };
$('auto').onchange = e => (auto = e.target.checked); $('sens').oninput = e => (sens = +e.target.value, A.gain = sens); $('speed').oninput = e => (speed = +e.target.value);
$('gear').onclick = () => toggleMenu(); $('x').onclick = () => toggleMenu(false); $('fs').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
addEventListener('keydown', e => {
  if (e.target.tagName == 'INPUT') return; const k = e.key.toLowerCase();
  if (k == 'm') toggleMenu(); else if (k == 'f') $('fs').click(); else if (k == 'n') setScene(scene + 1); else if (k == 'p') setScene(scene - 1); else if (k == 'a') { auto = !auto; $('auto').checked = auto; toast('Auto-cycle ' + (auto ? 'on' : 'off')); } else if (k == ' ') { const el = A.el; if (A.live && A.node == A.elNode) el.paused ? el.play() : el.pause(); }
});
addEventListener('resize', resize); resize(); setScene(0); document.querySelector('[data-p="0"]').classList.add('on'); wake(); requestAnimationFrame(frame);
