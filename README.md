# slidev-workspace

Monorepo for Slidev decks with shared packages.

```
decks/<name>/slides.md   one deck each
packages/<name>/         shared theme / addon / components (local pnpm packages)
scripts/build-all.mjs    builds every deck -> dist/<name>/ + dist/index.html
```

## Commands
```
pnpm install                 # once
pnpm -C decks/demo dev       # author/present a deck (add --remote --bind <ip> to expose)
pnpm new my-talk             # scaffold decks/my-talk
pnpm build                   # build all decks into dist/ (BASE_PATH env for subpath hosting)
```

## Hosting
Push to GitHub `main` → `.github/workflows/deploy.yml` builds all decks and publishes to
GitHub Pages at `https://<user>.github.io/<repo>/` (index links each deck).
One-time: repo Settings → Pages → Source = "GitHub Actions".

## Shared components / theme
- One-off, single deck: drop a `.vue` in that deck's `components/`.
- Reused across decks: make a package in `packages/` (a Slidev theme or addon) and
  reference it from a deck's frontmatter (`theme:` or `addons:`).
