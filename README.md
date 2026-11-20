# Leonida Nights — GTA 6 Cover Studio

Turn your photos into GTA 6-style multi-panel poster cover art, exported as PNG.

[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/khususgarapan000001-maker/vice-cover-maker/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/khususgarapan000001-maker/vice-cover-maker/reward.svg)](https://make.fun/c/gta6-cover-art-01)

Entry for the [make.fun bounty "Make GTA 6 Cover Art"](https://make.fun/bounty/gta6-cover-art-01) ($250, 50 places paid).

## What it does

Leonida Nights is a static, fully offline web app under `app/`. Pick your own photos (or the three AI-made samples), drop them into one of six poster layouts (Hero + 4, Split Duo, Full Bleed Hero, Triptych, Grid 2×2, Filmstrip), grade the cover with one of six Vice City colour grades (Vice Sunset, Neon Nights, Palm Gold, Mono Noir, Ocean Drive, Heat Haze) plus an intensity slider, then set the stacked-white block title, script subtitle, tagline strip, billing block, callouts, seal stamp, star-burst and corner ribbon — and export a PNG in 1080×1080, 1080×1350 or 1920×1080.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: every font (Anton, Caveat, Archivo — SIL OFL, see `app/fonts/OFL.txt`) and image is a file under `app/`. Photos are read on your own machine and never uploaded.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.
