"use strict";
const $ = (id) => document.getElementById(id),
  engine = new Visualizer($("art")),
  audio = $("audio");
const defaults = {
  speed: 0.7,
  density: 0.55,
  distortion: 0.45,
  transition: 0.35,
  palette: 0,
  patterns: ["honeycomb", "mesh", "orbits"],
};
const palettes = [
  ["Aurora", "#9de6bc", "#5c9fdd", "#8270d8"],
  ["Afterglow", "#efaf69", "#e779a6", "#9c61d5"],
  ["Deep space", "#599adf", "#9365d5", "#4bbfa5"],
  ["Ultraviolet", "#bc78e2", "#ec8cb9", "#6c9cdd"],
  ["Solar", "#f1cc69", "#ed805f", "#c2699c"],
];
let mode = "ambient",
  context,
  analyser,
  mediaSource,
  micSource,
  stream,
  objectURL,
  sourceKind = null,
  sourceEpoch = 0,
  toastTimer,
  previousEnergy = 0,
  slowEnergy = 0,
  fullscreenPending = false;
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem("synesthesia-v3") || "{}");
} catch {}
for (const key of ["speed", "density", "distortion", "transition"])
  if (Number.isFinite(saved[key]))
    engine.config[key] = Math.max(0, Math.min(1, saved[key]));
if (
  Number.isInteger(saved.palette) &&
  saved.palette >= 0 &&
  saved.palette < palettes.length
)
  engine.config.palette = saved.palette;
if (
  Array.isArray(saved.patterns) &&
  saved.patterns.some((x) =>
    ["honeycomb", "mesh", "orbits", "wave"].includes(x),
  )
)
  engine.config.patterns = new Set(
    saved.patterns.filter((x) =>
      ["honeycomb", "mesh", "orbits", "wave"].includes(x),
    ),
  );
function persist() {
  try {
    localStorage.setItem(
      "synesthesia-v3",
      JSON.stringify({
        ...engine.config,
        patterns: [...engine.config.patterns],
      }),
    );
  } catch {}
}
function toast(text) {
  $("toast").textContent = text;
  $("toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 3500);
}
function selectPalette(i) {
  engine.config.palette = i;
  document.querySelectorAll(".swatch").forEach((b, j) => {
    b.classList.toggle("selected", j === i);
    b.setAttribute("aria-pressed", j === i);
  });
  $("paletteName").textContent = palettes[i][0];
  $("sceneName").textContent =
    palettes[i][0].toUpperCase() + " / LIVING GEOMETRY";
  persist();
}
palettes.forEach((p, i) => {
  const b = document.createElement("button");
  b.className = "swatch";
  b.title = p[0];
  b.setAttribute("aria-label", p[0] + " palette");
  b.style.background = `linear-gradient(135deg,${p[1]},${p[2]},${p[3]})`;
  b.onclick = () => selectPalette(i);
  $("palettes").appendChild(b);
});
selectPalette(engine.config.palette);
for (const [key, label] of [
  ["speed", "Motion speed"],
  ["density", "Pattern density"],
  ["distortion", "Distortion"],
  ["transition", "Evolution rate"],
]) {
  const row = document.createElement("div");
  row.className = "control";
  row.innerHTML = `<label for="${key}">${label}<output id="${key}Value"></output></label><input id="${key}" type="range" min="0" max="1" step="0.01">`;
  $("sliders").appendChild(row);
  $(key).value = engine.config[key];
  $(key + "Value").textContent = Math.round(engine.config[key] * 100) + "%";
  $(key).oninput = () => {
    engine.config[key] = Number($(key).value);
    $(key + "Value").textContent = Math.round(engine.config[key] * 100) + "%";
    persist();
  };
}
function syncPatterns() {
  document.querySelectorAll("[data-pattern]").forEach((b) => {
    const on = engine.config.patterns.has(b.dataset.pattern);
    b.classList.toggle("selected", on);
    b.setAttribute("aria-pressed", on);
  });
}
document.querySelectorAll("[data-pattern]").forEach(
  (b) =>
    (b.onclick = () => {
      const name = b.dataset.pattern;
      if (engine.config.patterns.has(name)) {
        if (engine.config.patterns.size === 1)
          return toast("Keep at least one geometry layer.");
        engine.config.patterns.delete(name);
      } else engine.config.patterns.add(name);
      syncPatterns();
      persist();
    }),
);
syncPatterns();
function stopMic() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  if (micSource) micSource.disconnect();
  micSource = null;
  $("microphone").textContent = "◉ Microphone";
  $("disconnect").hidden = true;
}
function status(text) {
  $("audioStatus").textContent = text;
}
function setMode(next) {
  mode = next;
  for (const key of ["ambient", "music"]) {
    $(key).classList.toggle("selected", key === next);
    $(key).setAttribute("aria-pressed", key === next);
  }
  $("audioPanel").hidden = next !== "music";
  $("modeLabel").textContent =
    next === "music" ? "MUSIC SESSION" : "AMBIENT SESSION";
  $("sessionStatus").textContent =
    next === "music"
      ? "SOUND BECOMES SHAPE."
      : "NO SOUND REQUIRED. JUST BE HERE.";
  if (next === "ambient") {
    sourceEpoch++;
    audio.pause();
    stopMic();
    sourceKind = null;
    status("Choose a track or connect your microphone.");
  }
}
$("ambient").onclick = () => setMode("ambient");
$("music").onclick = () => setMode("music");
async function ensureAudio() {
  if (!context) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext)
      throw new Error("Web Audio is unavailable in this browser.");
    context = new AudioContext();
    analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.78;
    engine.waveform = new Uint8Array(analyser.fftSize);
    engine.waveform.fill(128);
    engine.bins = new Uint8Array(analyser.frequencyBinCount);
  }
  if (context.state === "suspended") await context.resume();
}
function attachFile() {
  if (!mediaSource) {
    mediaSource = context.createMediaElementSource(audio);
    mediaSource.connect(analyser);
    mediaSource.connect(context.destination);
  }
}
function errorMessage(error) {
  if (error.name === "NotAllowedError")
    return "Microphone access was denied. Allow it in your browser or upload a track.";
  if (error.name === "NotFoundError")
    return "No microphone was found. Try uploading a track.";
  if (error.name === "NotReadableError")
    return "The microphone is busy or unavailable. Try another input.";
  return error.message || "Audio could not start. Try another file or input.";
}
$("file").onchange = async () => {
  const file = $("file").files[0];
  if (!file) return;
  const epoch = ++sourceEpoch;
  setMode("music");
  audio.pause();
  stopMic();
  sourceKind = null;
  try {
    await ensureAudio();
    if (epoch !== sourceEpoch) return;
    attachFile();
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = URL.createObjectURL(file);
    audio.src = objectURL;
    audio.volume = Number($("volume").value);
    $("trackName").textContent = file.name;
    $("player").hidden = false;
    $("seek").value = 0;
    sourceKind = "file";
    await audio.play();
    if (epoch !== sourceEpoch) {
      audio.pause();
      return;
    }
    status("Listening to your track. Everything stays in your browser.");
  } catch (e) {
    if (epoch === sourceEpoch) status(errorMessage(e));
  } finally {
    $("file").value = "";
  }
};
$("microphone").onclick = async () => {
  const epoch = ++sourceEpoch;
  audio.pause();
  stopMic();
  sourceKind = null;
  if (!navigator.mediaDevices?.getUserMedia) {
    status(
      "Microphone input needs HTTPS or localhost and a supported browser.",
    );
    return;
  }
  status("Waiting for microphone permission…");
  try {
    await ensureAudio();
    if (epoch !== sourceEpoch || mode !== "music") return;
    const input = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    if (epoch !== sourceEpoch || mode !== "music") {
      input.getTracks().forEach((t) => t.stop());
      return;
    }
    stream = input;
    micSource = context.createMediaStreamSource(input);
    micSource.connect(analyser);
    sourceKind = "mic";
    $("microphone").textContent = "◉ Microphone active";
    $("disconnect").hidden = false;
    status(
      "Microphone connected. Input is analyzed locally and never played back.",
    );
    input.getAudioTracks()[0].onended = () => {
      if (stream === input) {
        stopMic();
        sourceKind = null;
        status("Microphone disconnected.");
      }
    };
  } catch (e) {
    if (epoch === sourceEpoch) status(errorMessage(e));
  }
};
$("disconnect").onclick = () => {
  sourceEpoch++;
  stopMic();
  sourceKind = null;
  status("Microphone disconnected. Choose another source.");
};
$("play").onclick = async () => {
  if (!audio.src) return;
  if (!audio.paused) {
    audio.pause();
    return;
  }
  const epoch = ++sourceEpoch;
  stopMic();
  try {
    await ensureAudio();
    if (epoch !== sourceEpoch || mode !== "music") return;
    attachFile();
    sourceKind = "file";
    await audio.play();
    if (epoch !== sourceEpoch) audio.pause();
    else status("Listening to your track.");
  } catch (e) {
    status(errorMessage(e));
  }
};
audio.onplay = () => {
  $("play").textContent = "Ⅱ";
  $("play").setAttribute("aria-label", "Pause audio");
};
audio.onpause = () => {
  $("play").textContent = "▶";
  $("play").setAttribute("aria-label", "Play audio");
};
audio.onerror = () => {
  status(
    "This audio file could not be decoded. Try MP3, WAV, or another supported format.",
  );
  sourceKind = null;
};
audio.onended = () =>
  status("Track finished. Play again or choose another track.");
function timeText(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  return (
    Math.floor(seconds / 60) +
    ":" +
    String(Math.floor(seconds % 60)).padStart(2, "0")
  );
}
audio.ontimeupdate = () => {
  $("time").textContent = timeText(audio.currentTime);
  if (Number.isFinite(audio.duration) && audio.duration > 0)
    $("seek").value = (audio.currentTime / audio.duration) * 100;
};
$("seek").oninput = () => {
  if (Number.isFinite(audio.duration) && audio.duration > 0)
    audio.currentTime = (Number($("seek").value) / 100) * audio.duration;
};
$("volume").oninput = () => (audio.volume = Number($("volume").value));
$("loop").onclick = () => {
  audio.loop = !audio.loop;
  $("loop").setAttribute("aria-pressed", audio.loop);
};
engine.analyze = (dt) => {
  const active =
    mode === "music" &&
    analyser &&
    (sourceKind === "mic" ||
      (sourceKind === "file" && !audio.paused && !audio.ended));
  engine.audioActive = Boolean(active);
  let bass = 0,
    mid = 0,
    high = 0;
  if (active) {
    analyser.getByteFrequencyData(engine.bins);
    analyser.getByteTimeDomainData(engine.waveform);
    const band = (lo, hi) => {
      const unit = context.sampleRate / analyser.fftSize;
      let sum = 0,
        count = 0;
      for (
        let i = Math.max(1, Math.floor(lo / unit));
        i < Math.min(engine.bins.length, Math.ceil(hi / unit));
        i++
      ) {
        sum += (engine.bins[i] / 255) ** 2;
        count++;
      }
      return count ? Math.sqrt(sum / count) : 0;
    };
    bass = band(30, 250);
    mid = band(250, 2500);
    high = band(2500, 14000);
  } else if (engine.waveform) engine.waveform.fill(128);
  const f = engine.features,
    energy = (bass + mid + high) / 3;
  slowEnergy += (energy - slowEnergy) * (1 - Math.exp(-dt * 0.7));
  f.mood = slowEnergy;
  if (
    active &&
    energy - previousEnergy > 0.055 &&
    energy > slowEnergy + 0.08 &&
    f.pulse < 0.4
  )
    f.pulse = 1;
  previousEnergy = energy;
  for (const [key, value] of Object.entries({ bass, mid, high, energy })) {
    const rate = value > f[key] ? 9 : 2.5;
    f[key] += (value - f[key]) * (1 - Math.exp(-dt * rate));
  }
  f.pulse = Math.max(0, f.pulse - dt * 0.65);
  $("bassMeter").style.width = f.bass * 100 + "%";
  $("midMeter").style.width = f.mid * 100 + "%";
  $("highMeter").style.width = f.high * 100 + "%";
};
$("pause").onclick = () => {
  engine.paused = !engine.paused;
  $("pause").textContent = engine.paused ? "▶ Resume" : "Ⅱ Pause";
  $("pause").setAttribute("aria-pressed", engine.paused);
};
function hideControls(hide) {
  document.body.classList.toggle("clean", hide);
  $("show").hidden = !hide;
  if (hide) $("show").focus();
  else $("hide").focus();
}
$("hide").onclick = () => hideControls(true);
$("show").onclick = () => hideControls(false);
$("fullscreen").onclick = async () => {
  if (fullscreenPending) return;
  fullscreenPending = true;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen)
      await document.documentElement.requestFullscreen();
    else
      toast(
        "Fullscreen is unavailable in this browser. Use Hide controls for an immersive view.",
      );
  } catch {
    toast("Fullscreen could not start. Try Hide controls.");
  } finally {
    fullscreenPending = false;
  }
};
document.addEventListener("fullscreenchange", () => {
  $("fullscreen").textContent = document.fullscreenElement ? "⛶" : "⛶";
  $("fullscreen").setAttribute(
    "aria-label",
    document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen",
  );
});
$("snapshot").onclick = () => {
  if (!engine.paused) engine.draw();
  $("art").toBlob((blob) => {
    if (!blob) return toast("Could not export this frame.");
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "synesthesia-" + Date.now() + ".png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Frame saved. A moment of the infinite.");
  }, "image/png");
};
$("reset").onclick = () => {
  Object.assign(engine.config, defaults, {
    patterns: new Set(defaults.patterns),
  });
  for (const key of ["speed", "density", "distortion", "transition"]) {
    $(key).value = defaults[key];
    $(key + "Value").textContent = Math.round(defaults[key] * 100) + "%";
  }
  selectPalette(0);
  syncPatterns();
  persist();
  toast("Composition reset.");
};
document.addEventListener("keydown", (event) => {
  if (
    event.target.closest("input,textarea,select,button") ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  )
    return;
  if (event.key.toLowerCase() === "h") {
    event.preventDefault();
    hideControls(!document.body.classList.contains("clean"));
  }
  if (event.key.toLowerCase() === "f") $("fullscreen").click();
  if (event.code === "Space") {
    event.preventDefault();
    $("pause").click();
  }
});
if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
  engine.config.speed = 0.12;
  $("speed").value = 0.12;
  $("speedValue").textContent = "12%";
  toast(
    "Gentle motion enabled for your reduced-motion preference. Pause anytime.",
  );
}
window.addEventListener("pagehide", (event) => {
  sourceEpoch++;
  stopMic();
  audio.pause();
  if (event.persisted) {
    if (context) context.suspend();
  } else {
    if (objectURL) URL.revokeObjectURL(objectURL);
    if (context) context.close();
  }
});
