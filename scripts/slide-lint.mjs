#!/usr/bin/env node
/**
 * slide-lint: is this deck readable from the back row?
 *
 * Measures what the AUDIENCE sees, not what the markdown says. Three checks:
 *
 *   1. overflow  an element sticks out past the slide edge. Objective, always an error.
 *   2. text      slide text too small, as projected height at 1080p.
 *   3. image     text INSIDE an image too small. The image was authored at one
 *                size and is drawn at another, so its text shrinks by however
 *                much the image shrank. OCR finds the text, geometry does the rest.
 *
 * The number that matters:
 *
 *   projected_px = native_text_h * (rendered_h / natural_h) / slide_h * 1080
 *
 * All of it is measured against the SLIDE container (#slide-content), never the
 * viewport, because the viewport is letterboxed and the ratio would be wrong.
 *
 * Usage:
 *   node scripts/slide-lint.mjs <deck> [--url http://host:port] [--json]
 *                               [--fail-px 20] [--warn-px 32] [--no-ocr]
 *
 * Exit 1 if anything FAILs, so it works as a gate.
 */

import { execFile, spawn } from 'node:child_process'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileP = promisify(execFile)
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// playwright is not a dependency of this repo. Look in the usual places and
// say so clearly if it is nowhere, rather than failing with a cryptic import
// error.
const PLAYWRIGHT_CANDIDATES = [
  'playwright',
  '/home/dev/.nvm/versions/node/v24.18.0/lib/node_modules/@playwright/mcp/node_modules/playwright/index.js',
]

async function loadChromium() {
  for (const spec of PLAYWRIGHT_CANDIDATES) {
    try {
      const mod = await import(spec)
      const chromium = mod.chromium ?? mod.default?.chromium
      if (chromium) return chromium
    } catch { /* try the next one */ }
  }
  console.error('slide-lint needs playwright. Install it, or point PLAYWRIGHT_CANDIDATES at a copy.')
  process.exit(2)
}
const PY = '/home/dev/.venvs/paddleocr/bin/python'

// A 1080p projector is the reference. Everything is reported as the pixel
// height the text would have on that screen.
const PROJECTOR_H = 1080

const argv = process.argv.slice(2)
const deck = argv.find(a => !a.startsWith('-'))
const flag = (name, dflt) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : dflt
}
const has = name => argv.includes(name)

if (!deck) {
  console.error('usage: slide-lint.mjs <deck> [--url URL] [--json] [--fail-px N] [--warn-px N] [--no-ocr]')
  process.exit(2)
}

const FAIL_PX = Number(flag('--fail-px', 20))
const WARN_PX = Number(flag('--warn-px', 32))
const URL = flag('--url', 'http://localhost:3030').replace(/\/$/, '')
let SERVER_URL = URL
const deckDir = join(ROOT, 'decks', deck)
const cacheDir = join(deckDir, '.slide-lint-cache')

if (!existsSync(deckDir)) {
  console.error(`no such deck: decks/${deck}`)
  process.exit(2)
}
mkdirSync(cacheDir, { recursive: true })

/** Slide count straight from the source: headmatter is 2 fences, each later slide adds 2. */
function slideCount() {
  const md = readFileSync(join(deckDir, 'slides.md'), 'utf8')
  const fences = (md.match(/^---$/gm) || []).length
  return Math.floor(fences / 2)
}

async function measure(total) {
  const chromium = await loadChromium()
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const slides = []
  for (let n = 1; n <= total; n++) {
    // clicks=99 reveals every v-click, so nothing is missed just because it is
    // hidden at click 0.
    await page.goto(`${SERVER_URL}/${n}?clicks=99`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    const data = await page.evaluate(() => {
      const slide = document.querySelector('#slide-content')
      if (!slide) return null
      const S = slide.getBoundingClientRect()
      const visible = el => {
        const r = el.getBoundingClientRect()
        return r.width > 1 && r.height > 1
      }
      // Hidden slides collapse to a zero rect, so this also scopes us to the
      // slide actually on screen.
      const imgs = [...document.querySelectorAll('img')].filter(visible).map(i => {
        const r = i.getBoundingClientRect()
        return {
          src: i.getAttribute('src'),
          naturalW: i.naturalWidth, naturalH: i.naturalHeight,
          renderedW: r.width, renderedH: r.height,
        }
      })
      // Leaf elements that actually paint text.
      const texts = []
      for (const el of document.querySelectorAll('#slide-content *')) {
        if (!visible(el)) continue
        const ownText = [...el.childNodes]
          .filter(n => n.nodeType === 3)
          .map(n => n.textContent.trim())
          .join(' ')
          .trim()
        if (!ownText) continue
        const cs = getComputedStyle(el)
        texts.push({
          text: ownText.slice(0, 80),
          fontPx: parseFloat(cs.fontSize),
          tag: el.tagName.toLowerCase(),
        })
      }
      // Anything poking out past the slide edge.
      const overflow = []
      // Slack is free space below the lowest thing that actually PAINTS. Layout
      // wrappers stretch to the full slide, so counting them makes slack always
      // zero and the enlarge-to-fit advice useless.
      const paints = el =>
        el.tagName === 'IMG' ||
        [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
      let maxBottom = S.top
      for (const el of document.querySelectorAll('#slide-content *')) {
        if (!visible(el)) continue
        const r = el.getBoundingClientRect()
        if (paints(el)) maxBottom = Math.max(maxBottom, r.bottom)
        const overBottom = r.bottom - S.bottom
        const overRight = r.right - S.right
        if (overBottom > 2 || overRight > 2) {
          const ownText = (el.textContent || '').trim().slice(0, 60)
          overflow.push({
            tag: el.tagName.toLowerCase(),
            overBottomPx: Math.round(overBottom),
            overRightPx: Math.round(overRight),
            text: ownText,
          })
        }
      }
      return {
        slideH: S.height, slideW: S.width,
        slackPx: Math.max(0, S.bottom - maxBottom),
        imgs, texts, overflow,
      }
    })
    slides.push({ n, ...(data || { imgs: [], texts: [], overflow: [] }) })
  }
  await browser.close()
  return slides
}

/**
 * OCR every image in one child process. Loading the PaddleOCR model costs
 * roughly 40 seconds, so spawning per image turned a 20 second lint into eight
 * minutes. Results are cached by file hash, so this is only slow once.
 */
async function ocrAll(srcs) {
  const bySrc = new Map()
  const files = []
  for (const src of srcs) {
    const file = join(deckDir, 'public', src.replace(/^\//, ''))
    if (!existsSync(file)) { bySrc.set(src, { error: 'missing from public/' }); continue }
    files.push([src, file])
  }
  if (!files.length) return bySrc
  try {
    const { stdout } = await execFileP(
      PY, [join(ROOT, 'scripts', 'ocr-image.py'), '--cache', cacheDir, ...files.map(f => f[1])],
      { maxBuffer: 256 * 1024 * 1024, env: { ...process.env, FLAGS_use_mkldnn: '0' } },
    )
    const results = JSON.parse(stdout)
    for (const [src, file] of files) bySrc.set(src, results[file] || { error: 'no result' })
  } catch (e) {
    const msg = String(e.message || e).slice(0, 200)
    for (const [src] of files) bySrc.set(src, { error: msg })
  }
  return bySrc
}

const band = px => (px < FAIL_PX ? 'FAIL' : px < WARN_PX ? 'WARN' : 'ok')

function fixFor(f) {
  const need = (WARN_PX / f.projectedPx)
  if (f.fractionDisplayed < 0.4) {
    return `drawn at ${(f.fractionDisplayed * 100).toFixed(0)}% of its natural width. ` +
           `Crop to the part you actually need, or split this slide, rather than scaling up.`
  }
  const newH = Math.round(f.renderedH * need)
  if (f.slackPx > (newH - f.renderedH)) {
    return `${need.toFixed(1)}x bigger clears ${WARN_PX}px. There is ${Math.round(f.slackPx)}px of slack, ` +
           `so raise its max-height to about ${newH}px (slide units).`
  }
  return `needs ${need.toFixed(1)}x to clear ${WARN_PX}px but only ${Math.round(f.slackPx)}px of slack is free. ` +
         `Split the slide, or crop the image.`
}

/** Is something already serving this deck? */
async function reachable(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) })
    return res.ok
  } catch { return false }
}

/**
 * Start a dev server for the deck if one is not already up, so the lint is a
 * single command. Returns a stop() the caller must call.
 */
async function ensureServer() {
  if (await reachable(URL)) return { url: URL, stop: () => {} }
  if (argv.includes('--url')) {
    console.error(`nothing is serving ${URL}. Start it, or drop --url to let slide-lint run its own.`)
    process.exit(2)
  }
  const port = 3100 + (process.pid % 400)
  const child = spawn('pnpm', ['exec', 'slidev', '--port', String(port)], {
    cwd: deckDir, stdio: 'ignore', detached: false,
  })
  const url = `http://localhost:${port}`
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    if (await reachable(url)) return { url, stop: () => child.kill('SIGTERM') }
    await new Promise(r => setTimeout(r, 1000))
  }
  child.kill('SIGTERM')
  console.error('could not start a dev server for the deck within 90s.')
  process.exit(2)
}

const run = async () => {
  const server = await ensureServer()
  SERVER_URL = server.url
  const total = slideCount()
  const slides = await measure(total)
  const findings = []

  const allSrcs = [...new Set(slides.flatMap(s => s.imgs.map(i => i.src)))]
  const ocrBySrc = has('--no-ocr') ? new Map() : await ocrAll(allSrcs)

  for (const s of slides) {
    if (!s.slideH) continue
    const toProjected = px => (px / s.slideH) * PROJECTOR_H

    for (const o of s.overflow) {
      findings.push({
        slide: s.n, kind: 'overflow', level: 'FAIL',
        detail: `<${o.tag}> extends ${o.overBottomPx > 0 ? `${o.overBottomPx}px below` : `${o.overRightPx}px right of`} the slide edge`,
        text: o.text,
      })
    }

    for (const t of s.texts) {
      const projectedPx = toProjected(t.fontPx)
      const level = band(projectedPx)
      if (level === 'ok') continue
      findings.push({
        slide: s.n, kind: 'text', level,
        projectedPx: Math.round(projectedPx),
        detail: `slide text renders ${Math.round(projectedPx)}px at 1080p`,
        text: t.text,
      })
    }

    if (!has('--no-ocr')) {
      for (const img of s.imgs) {
        const o = ocrBySrc.get(img.src) || { error: 'not measured' }
        if (o.error || !o.p5_h) {
          findings.push({
            slide: s.n, kind: 'image', level: 'INFO',
            detail: `${img.src}: ${o.error ? `OCR failed (${o.error})` : 'no text detected'}`,
          })
          continue
        }
        const imgScale = img.renderedH / img.naturalH
        const projectedPx = toProjected(o.p5_h * imgScale)
        const level = band(projectedPx)
        const f = {
          slide: s.n, kind: 'image', level,
          src: img.src,
          projectedPx: Math.round(projectedPx),
          p50ProjectedPx: Math.round(toProjected(o.p50_h * imgScale)),
          fractionDisplayed: img.renderedW / img.naturalW,
          renderedH: img.renderedH, slackPx: s.slackPx,
          nRegions: o.n_regions,
          smallest: (o.regions || []).slice().sort((a, b) => a.h - b.h)[0]?.text?.slice(0, 50),
        }
        f.detail = `${img.src}: smallest text renders ${f.projectedPx}px at 1080p (median ${f.p50ProjectedPx}px)`
        if (level !== 'ok') f.fix = fixFor(f)
        findings.push(f)
      }
    }
  }

  if (has('--json')) {
    console.log(JSON.stringify({ deck, total, failPx: FAIL_PX, warnPx: WARN_PX, findings }, null, 2))
  } else {
    report(deck, total, findings)
  }
  server.stop()
  process.exit(findings.some(f => f.level === 'FAIL') ? 1 : 0)
}

function report(deck, total, findings) {
  const fails = findings.filter(f => f.level === 'FAIL')
  const warns = findings.filter(f => f.level === 'WARN')
  console.log(`\nslide-lint: ${deck}, ${total} slides`)
  console.log(`thresholds: FAIL under ${FAIL_PX}px, WARN under ${WARN_PX}px, projected at 1080p\n`)
  if (!findings.length) { console.log('  nothing to report.\n'); return }

  // Lead with the slides that need work. 130 warnings bury 20 failures
  // otherwise, and the failures are the ones worth your afternoon.
  const failSlides = [...new Set(fails.map(f => f.slide))].sort((a, b) => a - b)
  if (failSlides.length) {
    console.log(`  slides to fix: ${failSlides.join(', ')}\n`)
  }

  const bySlide = new Map()
  for (const f of findings) {
    if (!bySlide.has(f.slide)) bySlide.set(f.slide, [])
    bySlide.get(f.slide).push(f)
  }
  for (const [n, fs] of [...bySlide.entries()].sort((a, b) => a[0] - b[0])) {
    const worst = fs.some(f => f.level === 'FAIL') ? 'FAIL' : fs.some(f => f.level === 'WARN') ? 'WARN' : 'info'
    if (worst === 'info' && !has('--verbose')) continue
    console.log(`  slide ${n}  [${worst}]`)
    for (const f of fs) {
      if (f.level === 'ok' || (f.level === 'INFO' && !has('--verbose'))) continue
      console.log(`    ${f.level.padEnd(4)} ${f.kind.padEnd(8)} ${f.detail}`)
      if (f.text) console.log(`         "${f.text}"`)
      if (f.smallest) console.log(`         smallest: "${f.smallest}"`)
      if (f.fix) console.log(`         fix: ${f.fix}`)
    }
    console.log('')
  }
  console.log(`  ${fails.length} fail, ${warns.length} warn\n`)
}

run().catch(e => { console.error(e); process.exit(2) })
