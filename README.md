# SYNESTHESIA

An endless, browser-based audio-reactive visualizer. Layer honeycomb fields, triangular meshes, orbital circles, and an oscilloscope over a shared animated flow field. Ambient mode works immediately; music adds smoothed motion, deformation, shimmer, and energy pulses without stopping the underlying composition.

## Run

No packages, build, Python API, model, or credentials are required for the visualizer. From this directory:

```sh
python -m http.server 8080 --bind 127.0.0.1
```

Open the server in a modern browser. Microphone input requires HTTPS or localhost and browser permission. Serve the files on any static web host for deployment. The interface uses locally available font fallbacks and makes no external requests.

## Use

- **Ambient** starts immediately. Choose one or more geometry layers and one of five palettes. Adjust speed, density, distortion, and evolution rate. Settings persist locally.
- **Music reactive** accepts local audio files supported by your browser (MP3, WAV, FLAC, M4A, etc.) or microphone input. Files stay on your device. Playback supports seek, volume, and loop. Microphone audio is never sent to the speakers; switching to Ambient or disconnecting releases the microphone.
- Bass expands geometry and distorts the flow field, mids bend the shared field, treble illuminates fine details, and sudden energy increases emit expanding pulses. Frequency features use time-based attack/release smoothing. Slow crossfades keep the scene evolving with or without audio.
- Toggle the waveform layer for an oscilloscope. Pause freezes visuals independently of playback. Save frame exports a full-resolution PNG.
- **F** toggles fullscreen, **H** hides/shows controls, and **Space** pauses visuals (outside focused controls). Reduced-motion preferences select a gentler initial speed.

Audio analysis uses the Web Audio API in the browser. There are no streaming-service integrations. Browser codec and microphone support vary. Tab audio capture is not implemented.

The older `api.py`, `semantic_mapping.py`, `concepts.json`, `interpreter.js`, and Python requirements remain as legacy concept-art tooling; the visualizer does not load or depend on them.

## Validation

`python tests/browser_smoke.py` runs the browser integration checks with Python Playwright and Chromium (`CHROMIUM_PATH` overrides `/usr/bin/chromium`). It starts its own temporary static server, generates an audio fixture, and checks canvas animation, pause, palettes, controls, exports, file audio frequency analysis, seeking, volume, looping, simulated microphone input, fullscreen, reset, and mobile overflow. Screenshots and downloads are saved to a temporary directory. The test uses Chromium's fake microphone; real hardware permission and input should also be checked on your target device.
