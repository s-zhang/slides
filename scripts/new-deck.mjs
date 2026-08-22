// Scaffold a new deck: node scripts/new-deck.mjs <name>
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
const name = process.argv[2]
if (!name || !/^[a-z0-9-]+$/.test(name)) { console.error('usage: pnpm new <kebab-name>'); process.exit(1) }
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'decks', name)
if (existsSync(dir)) { console.error(`decks/${name} already exists`); process.exit(1) }
mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, 'package.json'), JSON.stringify({
  name: `@decks/${name}`, type: 'module', private: true,
  dependencies: { '@slidev/cli': '^52.19.1', '@slidev/theme-seriph': 'latest', vue: '^3.5.33' },
  scripts: { dev: 'slidev --open', build: 'slidev build', export: 'slidev export' }
}, null, 2) + '\n')
writeFileSync(join(dir, 'slides.md'), `---\ntheme: seriph\ntitle: ${name}\n---\n\n# ${name}\n\nNew deck. Edit decks/${name}/slides.md\n`)
console.log(`✓ created decks/${name}. Run: pnpm install && pnpm -C decks/${name} dev`)
