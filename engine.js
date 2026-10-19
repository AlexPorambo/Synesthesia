/* Shared, continuous flow field; audio modulates motion rather than replacing it. */
"use strict";
window.Visualizer = class {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.time = 0;
    this.last = 0;
    this.paused = false;
    this.features = { bass: 0, mid: 0, high: 0, energy: 0, pulse: 0 };
    this.config = {
      speed: 0.7,
      density: 0.55,
      distortion: 0.45,
      transition: 0.35,
      palette: 0,
      patterns: new Set(["honeycomb", "mesh", "orbits"]),
    };
    this.layerAlpha = { honeycomb: 1, mesh: 1, orbits: 1, wave: 0 };
    this.hues = [155, 190, 260];
    this.palettes = [
      [155, 190, 260],
      [25, 345, 290],
      [210, 260, 175],
      [285, 330, 220],
      [40, 10, 330],
    ];
    this.resize = () => {
      this.w = innerWidth;
      this.h = innerHeight;
      const d = Math.min(devicePixelRatio || 1, 2);
      canvas.width = this.w * d;
      canvas.height = this.h * d;
      this.ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    addEventListener("resize", this.resize);
    this.resize();
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }
  frame(now) {
    const dt = Math.min((now - (this.last || now)) / 1000, 0.05);
    this.last = now;
    if (!document.hidden && !this.paused) {
      this.time += dt * (0.12 + this.config.speed * 1.4);
      for (const key of Object.keys(this.layerAlpha))
        this.layerAlpha[key] +=
          ((this.config.patterns.has(key) ? 1 : 0) - this.layerAlpha[key]) *
          (1 - Math.exp(-dt * 2));
      const target = this.palettes[this.config.palette];
      for (let i = 0; i < 3; i++)
        this.hues[i] +=
          (((target[i] - this.hues[i] + 540) % 360) - 180) *
          (1 - Math.exp(-dt * 1.2));
      if (this.analyze) this.analyze(dt);
      this.draw();
    }
    requestAnimationFrame(this.frame);
  }
  color(i, alpha = 1) {
    const p = this.hues;
    return `hsla(${p[i % p.length] + Math.sin(this.time * 0.07) * 18 + (this.features.mood || 0) * 35},72%,${i === 0 ? 66 : 60}%,${alpha})`;
  }
  point(x, y, t) {
    const f = this.features,
      d = this.config.distortion;
    return [
      x + Math.sin(y * 0.004 + t * 0.4) * (20 + d * 65 + f.mid * 55),
      y + Math.cos(x * 0.004 - t * 0.28) * (15 + d * 50 + f.bass * 45),
    ];
  }
  draw() {
    const c = this.ctx,
      w = this.w,
      h = this.h,
      t = this.time,
      f = this.features;
    c.globalCompositeOperation = "source-over";
    c.fillStyle = "#070c14";
    c.fillRect(0, 0, w, h);
    const cx = w * 0.64,
      cy = h * 0.49,
      rad = Math.max(w, h) * 0.62;
    let bg = c.createRadialGradient(cx, cy, 0, cx, cy, rad);
    bg.addColorStop(0, this.color(0, 0.1 + f.energy * 0.07));
    bg.addColorStop(0.55, this.color(2, 0.035));
    bg.addColorStop(1, "#070c14");
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    c.save();
    c.translate(cx, cy);
    c.rotate(Math.sin(t * 0.07) * 0.17);
    c.translate(-cx, -cy);
    c.globalCompositeOperation = "screen";
    const phase = t * (0.025 + this.config.transition * 0.13);
    const weight = (i) => 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(phase + i * 2.1));
    if (this.layerAlpha.honeycomb > 0.005)
      this.honeycomb(t, weight(0) * this.layerAlpha.honeycomb);
    if (this.layerAlpha.mesh > 0.005)
      this.mesh(t, weight(1) * this.layerAlpha.mesh);
    if (this.layerAlpha.orbits > 0.005)
      this.orbits(t, weight(2) * this.layerAlpha.orbits);
    if (this.layerAlpha.wave > 0.005) {
      c.globalAlpha = this.layerAlpha.wave;
      this.wave(t);
      c.globalAlpha = 1;
    }
    this.dust(t);
    if (f.pulse > 0.02) {
      c.beginPath();
      c.arc(cx, cy, (1 - f.pulse) * Math.max(w, h) * 0.8 + 40, 0, Math.PI * 2);
      c.strokeStyle = this.color(0, f.pulse * 0.3);
      c.lineWidth = 1 + f.bass * 2;
      c.stroke();
    }
    c.restore();
  }
  honeycomb(t, a) {
    const c = this.ctx,
      r = 48 - this.config.density * 24,
      dx = r * 1.732,
      dy = r * 1.5;
    c.lineWidth = 0.7;
    for (let row = -2; row < this.h / dy + 2; row++)
      for (let col = -2; col < this.w / dx + 2; col++) {
        const x = col * dx + ((row % 2) * dx) / 2,
          y = row * dy;
        const wave = 0.5 + 0.5 * Math.sin(x * 0.004 + y * 0.003 - t * 0.3);
        c.strokeStyle = this.color(0, a * (0.05 + wave * 0.19));
        c.beginPath();
        for (let k = 0; k < 6; k++) {
          const ang = ((k * 60 - 30) * Math.PI) / 180;
          const rr = r * (1 + this.features.bass * 0.15);
          const p = this.point(
            x + Math.cos(ang) * rr,
            y + Math.sin(ang) * rr,
            t,
          );
          k ? c.lineTo(...p) : c.moveTo(...p);
        }
        c.closePath();
        c.stroke();
      }
  }
  mesh(t, a) {
    const c = this.ctx,
      s = 120 - this.config.density * 65,
      cols = Math.ceil(this.w / s) + 3,
      rows = Math.ceil(this.h / s) + 3,
      points = [];
    for (let j = 0; j < rows; j++) {
      points[j] = [];
      for (let i = 0; i < cols; i++) {
        let x = (i - 1) * s + (j % 2) * s * 0.5,
          y = (j - 1) * s;
        const p = this.point(
          x + Math.sin(j * 2 + i + t * 0.2) * s * 0.17,
          y + Math.cos(i * 2 + j + t * 0.16) * s * 0.18,
          t + 3,
        );
        points[j][i] = p;
      }
    }
    c.lineWidth = 0.6;
    for (let j = 0; j < rows - 1; j++)
      for (let i = 0; i < cols - 1; i++) {
        const p = points[j][i],
          q = points[j][i + 1],
          r = points[j + 1][i];
        const glow = 0.5 + 0.5 * Math.sin(i * 0.7 + j * 0.8 - t * 0.25);
        c.strokeStyle = this.color(
          1,
          a * (0.06 + glow * 0.23 + this.features.high * 0.16),
        );
        c.beginPath();
        c.moveTo(...p);
        c.lineTo(...q);
        c.lineTo(...r);
        c.closePath();
        c.stroke();
        if (glow > 0.9) {
          c.fillStyle = this.color(1, 0.4 + this.features.high * 0.4);
          c.beginPath();
          c.arc(...p, 1 + this.features.high * 1.5, 0, Math.PI * 2);
          c.fill();
        }
      }
  }
  orbits(t, a) {
    const c = this.ctx,
      cx = this.w * 0.65,
      cy = this.h * 0.5,
      size = Math.min(this.w, this.h) * 0.35,
      count = 12 + Math.floor(this.config.density * 28);
    c.save();
    c.translate(cx, cy);
    c.rotate(t * 0.045);
    for (let i = 0; i < count; i++) {
      const k = i / count,
        r = size * (0.35 + k * 0.85) * (1 + this.features.bass * 0.14),
        tilt = Math.sin(t * 0.13 + k * 3) * 0.6;
      c.beginPath();
      for (let n = 0; n <= 120; n++) {
        const ang = (n / 120) * Math.PI * 2;
        const wobble =
          1 +
          Math.sin(ang * 3 + t * 0.4 + k * 6) * this.config.distortion * 0.08;
        const x = Math.cos(ang) * r * wobble,
          y =
            Math.sin(ang) *
            r *
            (0.4 + 0.2 * Math.sin(k * 4 + t * 0.09)) *
            wobble;
        const xx = x * Math.cos(tilt) - y * Math.sin(tilt),
          yy = x * Math.sin(tilt) + y * Math.cos(tilt);
        n ? c.lineTo(xx, yy) : c.moveTo(xx, yy);
      }
      c.strokeStyle = this.color(i % 3, a * (0.12 + (1 - k) * 0.25));
      c.lineWidth = i % 7 === 0 ? 1.4 : 0.65;
      c.stroke();
    }
    c.restore();
  }
  wave(t) {
    const c = this.ctx;
    c.beginPath();
    for (let i = 0; i <= 512; i++) {
      const x = (i / 512) * this.w;
      const v =
        this.audioActive && this.waveform
          ? (this.waveform[
              Math.min(
                this.waveform.length - 1,
                Math.floor((i / 512) * this.waveform.length),
              )
            ] -
              128) /
            128
          : Math.sin(i * 0.035 + t) * 0.35 * Math.sin(i * 0.007 + t * 0.2);
      const y = this.h * 0.52 + v * this.h * 0.2;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.strokeStyle = this.color(0, 0.8);
    c.shadowColor = this.color(0);
    c.shadowBlur = 12;
    c.lineWidth = 1.5;
    c.stroke();
    c.shadowBlur = 0;
  }
  dust(t) {
    const c = this.ctx;
    for (let i = 0; i < 65 + this.config.density * 90; i++) {
      const x =
          ((((Math.sin(i * 127.1) * 43758.5) % 1) + 1) * this.w +
            t * (2 + (i % 4))) %
          this.w,
        y =
          ((((Math.sin(i * 311.7) * 19341.3) % 1) + 1) * this.h +
            Math.sin(t * 0.1 + i) * 18) %
          this.h;
      c.fillStyle = this.color(
        i % 3,
        (0.15 + 0.2 * Math.sin(t * 0.5 + i) ** 2) * (1 + this.features.high),
      );
      c.beginPath();
      c.arc(x, y, i % 9 === 0 ? 1.3 : 0.6, 0, Math.PI * 2);
      c.fill();
    }
  }
};
