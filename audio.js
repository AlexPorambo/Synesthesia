// Audio input + analysis: tab/system capture, mic, file, and a demo signal.
class AudioIn {
  constructor() {
    this.f = { bass: 0, mid: 0, high: 0, level: 0 };
    this.spec = new Float32Array(64);
    this.live = false; this.name = 'Demo signal'; this.silent = 0;
    this.onBeat = null; this.peak = 0.25; this.flux = 0; this.lastBeat = 0; this.prev = null; this.dt = 0;
    this.el = new Audio(); this.el.loop = true; this.el.crossOrigin = 'anonymous';
  }
  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.an = this.ctx.createAnalyser();
      this.an.fftSize = 2048; this.an.smoothingTimeConstant = 0.5;
      this.bins = new Uint8Array(this.an.frequencyBinCount);
    }
    await this.ctx.resume();
  }
  stop() {
    if (this.stream) this.stream.getTracks().forEach(t => { t.onended = null; t.stop(); });
    if (this.node) try { this.node.disconnect(); } catch (e) {}
    this.el.pause(); this.stream = this.node = null; this.live = false; this.name = 'Demo signal';
  }
  hook(node, name, stream, toSpeakers) {
    this.stop(); this.node = node; this.stream = stream; this.name = name; this.live = true; this.silent = 0;
    node.connect(this.an);
    if (toSpeakers) node.connect(this.ctx.destination);
    if (stream) stream.getTracks().forEach(t => (t.onended = () => { this.stop(); this.onLost && this.onLost(); }));
  }
  async capture() { // Spotify/Apple Music web tab, or whole system on Windows Chrome/Edge
    if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('unsupported');
    await this.init();
    const s = await navigator.mediaDevices.getDisplayMedia({
      video: true, systemAudio: 'include', preferCurrentTab: false,
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
    if (!s.getAudioTracks().length) { s.getTracks().forEach(t => t.stop()); throw new Error('no-audio'); }
    s.getVideoTracks().forEach(t => (t.enabled = false)); // we only want the sound
    this.hook(this.ctx.createMediaStreamSource(new MediaStream(s.getAudioTracks())), 'Shared audio', s, false);
    this.stream = s;
  }
  async mic() {
    await this.init();
    const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    this.hook(this.ctx.createMediaStreamSource(s), 'Microphone', s, false);
  }
  async file(f) {
    await this.init();
    this.stop();
    this.el.src = URL.createObjectURL(f);
    if (!this.elNode) this.elNode = this.ctx.createMediaElementSource(this.el);
    this.hook(this.elNode, f.name, null, true);
    await this.el.play();
  }
  update(dt, now) {
    const f = this.f; let b = 0, m = 0, h = 0, flux = 0;
    if (this.live) {
      this.an.getByteFrequencyData(this.bins);
      const hz = this.ctx.sampleRate / this.an.fftSize, B = this.bins;
      const avg = (lo, hi) => { let s = 0, n = 0; for (let i = Math.max(1, lo / hz | 0); i < hi / hz && i < B.length; i++) { s += B[i]; n++; } return n ? s / n / 255 : 0; };
      b = avg(30, 150); m = avg(150, 2000); h = avg(2000, 12000);
      for (let k = 0; k < 64; k++) { // log-spaced spectrum
        const lo = 40 * Math.pow(300, k / 64), hi = 40 * Math.pow(300, (k + 1) / 64);
        this.spec[k] += (Math.min(1, avg(lo, Math.max(hi, lo + hz)) / this.peak * 0.9) - this.spec[k]) * 0.45;
      }
      const cur = B.slice(1, 48);
      if (this.prev) for (let i = 0; i < cur.length; i++) flux += Math.max(0, cur[i] - this.prev[i]);
      this.prev = cur; flux /= 255;
      const lvl = Math.max(b, m * 1.2, h * 2);
      this.silent = lvl < 0.01 ? this.silent + dt : 0;
      this.peak = Math.max(this.peak * (1 - dt * 0.08), lvl, 0.12); // auto-gain: quiet streams still look alive
    } else { // demo: ~108 bpm synthetic groove so there is always motion
      const t = now / 1000, ph = (t * 1.8) % 1, k = Math.exp(-ph * 5);
      b = 0.55 * k + 0.1; m = 0.25 + 0.15 * Math.sin(t * 0.9) ** 2 + 0.2 * Math.exp(-((t * 1.8 + 0.5) % 1) * 6);
      h = 0.15 + 0.15 * Math.sin(t * 5.3) ** 2; this.peak = 0.5; flux = ph < dt * 1.8 ? 2 : 0;
      for (let i = 0; i < 64; i++) this.spec[i] += ((0.5 + 0.5 * Math.sin(t * 2 + i * 0.3)) * (1 - i / 80) * (0.3 + k) - this.spec[i]) * 0.2;
    }
    const n = v => Math.min(1, v / this.peak);
    const sm = (a, v) => a + (v - a) * (1 - Math.exp(-dt * (v > a ? 30 : 7)));
    f.bass = sm(f.bass, n(b)); f.mid = sm(f.mid, n(m)); f.high = sm(f.high, n(h));
    f.level = (f.bass + f.mid + f.high) / 3;
    this.flux += (flux - this.flux) * dt * 2.5; // adaptive threshold
    if (flux > this.flux * 1.45 + 0.05 && now - this.lastBeat > 230) {
      this.lastBeat = now; this.onBeat && this.onBeat(Math.min(1, 0.4 + flux / (this.flux * 3 + 0.1)));
    }
  }
}
