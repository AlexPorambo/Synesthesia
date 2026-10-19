"""Browser integration smoke test. Requires Playwright and a Chromium executable.
Run: python tests/browser_smoke.py
"""
import wave, math, struct, os, tempfile, threading
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = Path(__file__).resolve().parents[1]
artifacts = Path(tempfile.mkdtemp(prefix="synesthesia-smoke-"))
server = ThreadingHTTPServer(("127.0.0.1", 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{server.server_port}"

from playwright.sync_api import sync_playwright
with wave.open(str(artifacts / 'tone.wav'),'wb') as f:
 f.setparams((1,2,44100,0,'NONE','not compressed'))
 f.writeframes(b''.join(struct.pack('<h',int(11000*math.sin(2*math.pi*(90 if i<220500 else 900)*i/44100))) for i in range(441000)))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required'])
 page=browser.new_page(viewport={'width':1440,'height':1080},accept_downloads=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL);page.wait_for_timeout(500)
 first=page.locator('#art').evaluate('(c)=>c.toDataURL()');page.wait_for_timeout(300)
 assert first!=page.locator('#art').evaluate('(c)=>c.toDataURL()')
 page.locator('#pause').click();page.wait_for_timeout(100)
 first=page.locator('#art').evaluate('(c)=>c.toDataURL()');page.wait_for_timeout(200);assert first==page.locator('#art').evaluate('(c)=>c.toDataURL()');page.locator('#pause').click()
 page.get_by_role('button',name='Afterglow palette').click();assert page.locator('#paletteName').inner_text()=='Afterglow'
 page.locator('#density').evaluate("e=>{e.value=.8;e.dispatchEvent(new Event('input'))}");assert page.locator('#densityValue').inner_text()=='80%'
 page.locator('[data-pattern=wave]').click();assert page.locator('[data-pattern=wave]').get_attribute('aria-pressed')=='true'
 with page.expect_download() as info:page.locator('#snapshot').click()
 info.value.save_as(str(artifacts / 'visualizer.png'))
 page.locator('#music').click();page.locator('#file').set_input_files(str(artifacts / 'tone.wav'))
 page.wait_for_function("!document.querySelector('#audio').paused")
 page.wait_for_function("parseFloat(document.querySelector('#bassMeter').style.width)>10")
 print('Audio bass:',page.locator('#bassMeter').get_attribute('style'))
 page.locator('#seek').evaluate("e=>{e.value=60;e.dispatchEvent(new Event('input'))}");page.wait_for_function("document.querySelector('#audio').currentTime>5")
 page.locator('#volume').evaluate("e=>{e.value=.2;e.dispatchEvent(new Event('input'))}");assert page.locator('#audio').evaluate('(a)=>a.volume')==.2
 page.locator('#loop').click();assert not page.locator('#audio').evaluate('(a)=>a.loop')
 page.locator('#play').click();assert page.locator('#audio').evaluate('(a)=>a.paused')
 page.locator('#microphone').click();page.wait_for_function("document.querySelector('#microphone').textContent.includes('active')")
 page.locator('#disconnect').click();assert page.locator('#disconnect').is_hidden()
 page.locator('#ambient').click();assert page.locator('#audioPanel').is_hidden()
 page.locator('#hide').click();assert page.locator('#controls').is_hidden();page.locator('#show').click()
 page.locator('#fullscreen').click();page.wait_for_function('!!document.fullscreenElement');page.locator('#fullscreen').click();page.wait_for_function('!document.fullscreenElement')
 page.locator('#reset').click();assert page.locator('#paletteName').inner_text()=='Aurora'
 page.screenshot(path=str(artifacts / 'desktop.png'))
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(artifacts / 'mobile.png'),full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 print('PASS: animation, pause, palettes, sliders, layers, export, uploaded audio analysis, seeking, volume, loop, microphone, disconnect, ambient, fullscreen, hide, reset, mobile layout')
 browser.close()

server.shutdown()
print(f"Artifacts: {artifacts}")
