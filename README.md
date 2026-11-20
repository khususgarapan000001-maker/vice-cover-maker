# Leonida Nights — GTA 6 Cover Studio

Turn your photos into GTA 6-style multi-panel poster cover art, exported as PNG — offline, in your browser.

[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/khususgarapan000001-maker/vice-cover-maker/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/khususgarapan000001-maker/vice-cover-maker/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Entry for the [make.fun bounty "Make GTA 6 Cover Art"](https://make.fun/bounty/gta6-cover-art-01) ($250, 50 places paid).

## What it does

Leonida Nights is a static offline web app (no network requests, photos never leave your machine). Load your own photos or the three built-in samples, pick one of 6 layouts (Hero + 4, Split Duo, Full Bleed Hero, Triptych, Grid 2×2, Filmstrip), apply one of 6 canvas colour grades (Vice Sunset, Neon Nights, Palm Gold, Mono Noir, Ocean Drive, Heat Haze) with an intensity slider, then letter it like a real poster: stacked-white block title (default), script subtitle, tagline strip, billing block, seal stamp, callouts with leader lines, star-burst badge, corner ribbon and halftone texture — all text editable. Click any panel to assign a photo, drag to position it, zoom to crop, or fill every panel with one photo. One click exports an exact-size PNG: 1080×1080, 1080×1350 or 1920×1080.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no dependencies. Fonts (Anton, Caveat, Archivo) are vendored under `app/fonts/` under the SIL Open Font License (`OFL.txt`). Sample photos are AI-made / kit assets. Fan-made poster studio — not affiliated with Rockstar Games.

## License

MIT — see [LICENSE](LICENSE).
