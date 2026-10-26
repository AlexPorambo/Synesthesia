# Synesthesia

A browser music visualizer with two procedural animation modes: Radial Wave and Aurora. Connect an audio source, choose a palette, and adjust the motion and sensitivity. The app also runs ambient animations without audio.

Built by Alex Porambo with HTML, CSS, JavaScript, Canvas 2D, and the Web Audio API. No framework, build step, model, API key, or paid service is required.

## Visuals

- **Radial Wave:** a glowing, continuous outline with mirrored frequency-driven waves. Two opposite swells rotate clockwise during idle.
- **Aurora:** a soft cloud field during idle. Music brings in three separate cloud ribbons with movement, expansion, and ripples driven by bass, mids, and treble.
- Five color palettes, smooth palette and scene transitions, and manual selection of visual modes.
- Controls for motion speed, pattern density, and audio sensitivity.
- Fullscreen, collapsible controls, visual pause/resume, and bass/mid/treble meters.

## Run locally

Save the project files in the same folder. Open a terminal in that folder and run:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Open **http://localhost:8080/** in your browser. Keep the terminal open while using the app; press **Ctrl+C** to stop the server.

On Windows, you can instead double-click `start-local.bat` and open the address it displays. It tries the Python launcher first, then `python`.

Python 3 is used only to serve the files locally. There are no Python packages to install, so this version does not need `requirements.txt`, a virtual environment, or the earlier FastAPI backend. Any other static web server can also serve the app.

## Connect audio

### Local music file

Choose **Open a music file**, select an audio file supported by your browser, and use the built-in player. The file is played and analyzed locally.

### Music from a browser tab

1. Start music in another browser tab.
2. Select **Capture tab / system audio** in Synesthesia.
3. Choose the tab in the browser's sharing picker and enable **Share audio**, if offered.
4. Return to Synesthesia and choose a visual mode.

The app analyzes the audio shared by the browser. It does not connect to streaming-service accounts or control their playback. Audio sharing depends on your browser, operating system, and the source; some protected playback cannot be captured.

### Microphone

Choose **Use microphone** and grant permission. The app analyzes the input without playing it back through the speakers.

### Ambient mode

Choose **Ambient / disconnect** to release the connected capture or microphone stream and return to ambient animation. This also stops playback of an opened music file.

Use localhost for local development or HTTPS when hosting. Browser capture and microphone permissions may be unavailable in other contexts. Desktop Chrome or Edge can be used to try tab capture; available audio-sharing options vary. Local file playback is an alternative when capture is unavailable.

## Controls

| Control | Function |
| --- | --- |
| Radial wave / Aurora | Select the visual mode manually |
| Palette swatches | Change the colors |
| Motion speed | Adjust animation speed |
| Pattern density | Adjust Aurora's spatial detail |
| Audio sensitivity | Adjust the response to audio energy |
| Pause / Resume | Freeze or resume visuals; audio playback continues |
| Hide / Show controls | Toggle the sidebar |
| Fullscreen | Expand the visualizer stage |

| Shortcut | Function |
| --- | --- |
| M | Toggle controls |
| F | Toggle fullscreen |
| N | Switch to the next visual mode |
| Space | Pause or resume visuals |

Shortcuts are ignored while interacting with inputs, buttons, or the audio player. Click an empty part of the page before using them.

## How it works

The Web Audio API routes the selected source through an `AnalyserNode`. The app measures frequency energy in bass, mid, and treble ranges, along with overall signal level. Smoothed envelopes and changes in bass energy shape the animation. These are audio-reactive effects, rather than BPM estimation or song recognition.

Canvas 2D draws the radial outline with closed curves and layered color. Aurora generates a small pixel field, then scales and blurs it for softer clouds. Independent ribbons provide its music response. `requestAnimationFrame` updates the visuals, and an offscreen canvas handles scene transitions.

All application code and styling are contained in `index.html`.

## Privacy

The application processes audio in the browser and contains no analytics or audio-upload requests. Local music files are opened using browser object URLs. Capture requires the browser's sharing permission; the app requests a display stream to obtain shared audio, but does not draw, record, or transmit its video track. Disconnecting stops the capture tracks.

## Troubleshooting

- **No response to music:** confirm that the player is running, or that the shared source includes audio. Check the meters and try increasing sensitivity.
- **Capture has no audio:** choose a tab and enable Share audio if available. If your browser or source does not offer it, try opening a local music file.
- **Permission denied:** allow access in the browser's site permissions and select the source again.
- **Blank canvas after an edit:** open the browser's developer console and inspect the first JavaScript error. Removed HTML controls must also be removed from JavaScript references.
- **Old code still appears:** save the file and hard-refresh with Ctrl+F5.
- **Port 8080 is busy:** use `python -m http.server 8081 --bind 127.0.0.1` and open http://localhost:8081/.
- **Slow animation:** reduce pattern density or leave fullscreen. Performance depends on canvas size and device capability.

## Repository files

| File | Purpose |
| --- | --- |
| `index.html` | Complete application |
| `README.md` | Setup and usage documentation |
| `.gitignore` | Excludes local environments, temporary files, and test audio |
| `.gitattributes` | Keeps text line endings consistent |
| `start-local.bat` | Optional Windows local-server launcher |

The app is static and can be served by a static hosting service. Serve `index.html` at the site root and use HTTPS for audio permissions. No backend deployment or environment variables are required.
