// Build every deck in decks/* into dist/<name>/ and write a dist/index.html listing them.
// BASE_PATH (e.g. "/reponame/") is prepended so project-page hosting (GitHub Pages) works.
import { readdirSync, statSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const decksDir = join(root, 'decks')
const dist = join(root, 'dist')
const base = (process.env.BASE_PATH || '/').replace(/\/?$/, '/')

rmSync(dist, { recursive: true, force: true })
mkdirSync(dist, { recursive: true })

const decks = readdirSync(decksDir).filter(n => {
  try { return statSync(join(decksDir, n)).isDirectory() } catch { return false }
})

const built = []
for (const name of decks) {
  const deckBase = `${base}${name}/`
  const out = join(dist, name)
  console.log(`\n▸ building "${name}"  base=${deckBase}`)
  execFileSync('pnpm', ['-C', join('decks', name), 'exec', 'slidev', 'build', '--base', deckBase, '--out', out],
    { cwd: root, stdio: 'inherit' })
  built.push({ name, href: `./${name}/` })
}

const links = built.map(d => `      <li><a href="${d.href}">${d.name}</a></li>`).join('\n')
writeFileSync(join(dist, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Slide decks</title>
<style>
  body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#0f1319;color:#e7eaef;
       display:grid;place-items:center;min-height:100vh;margin:0}
  main{max-width:36rem;padding:2rem}
  h1{font-weight:800;letter-spacing:-.02em}
  ul{list-style:none;padding:0}
  li{margin:.6rem 0}
  a{color:#f0a86a;text-decoration:none;font-size:1.2rem}
  a:hover{text-decoration:underline}
  .k{color:#7d8aa0;font-size:.8rem;letter-spacing:.15em;text-transform:uppercase}
</style></head>
<body><main>
  <div class="k">Slide decks</div>
  <h1>Decks</h1>
  <ul>
${links}
  </ul>
</main></body></html>
`)
console.log(`\n✓ built ${built.length} deck(s) into dist/ (index.html + ${built.map(d=>d.name).join(', ')})`)
