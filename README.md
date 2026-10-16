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

## Readability lint

Is the deck legible from the back row? `slide-lint` measures what the audience
sees rather than what the markdown says, and exits 1 on a failure so it works
as a gate.

```
pnpm lint cyber-week                 # starts its own dev server
pnpm lint cyber-week --url http://localhost:3030   # reuse one you already have
pnpm lint cyber-week --json          # machine readable
pnpm lint cyber-week --no-ocr        # skip images, much faster
```

Three checks:

| Check | What it catches |
|---|---|
| `overflow` | An element sticks out past the slide edge. Objective, always a failure |
| `text` | Slide text too small, as projected height at 1080p |
| `image` | Text *inside* an image too small, found by OCR |

Images are the hard case: a figure authored at 1900px wide and drawn 600px wide
on the slide has text a third the size you think it does. The number reported is

```
projected_px = native_text_height * (rendered_h / natural_h) / slide_h * 1080
```

measured against the slide container, never the viewport, because the viewport
is letterboxed. The 5th percentile text height is reported, not the median,
since the axis labels are what fail, not the title.

Defaults are `FAIL` under 20px and `WARN` under 32px at 1080p; change with
`--fail-px` / `--warn-px`. Every finding prints its measured number so you can
argue with the threshold.

Each failure carries a fix. When the image is drawn at under 40% of its natural
width, the advice is to crop or split rather than scale up, because scaling a
small rendering of a big image just makes a blurry big one.

OCR is PaddleOCR via `scripts/ocr-image.py`, cached by file hash under
`decks/<deck>/.slide-lint-cache/` (gitignored). The first run costs a model
load, later runs are seconds. `enable_mkldnn=False` is required: oneDNN crashes
PaddleOCR 3.7 on this box.
