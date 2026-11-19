# Vice Cover Maker

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/khususgarapan000001-maker/vice-cover-maker/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/khususgarapan000001-maker/vice-cover-maker/reward.svg)](https://make.fun/c/gta6-cover-art-01)

Turn your photos into GTA 6-style multi-panel cover art — offline, in the browser, exported as a PNG ready to post.

## What it does

Vice Cover Maker is a static web app (no build step, no network requests, photos never leave your machine) that turns your own photos plus a caption into a Vice City-style poster cover:

- **3 multi-panel layouts** — Hero + 4 (one big hero panel with four small panels), Split Duo (two tall panels over a strip), Full Bleed (one big photo with a caption band).
- **4 colour grades** — Vice Sunset, Neon Nights, Palm Gold and Mono Noir, each with an intensity slider, applied on canvas.
- **Any photo** — load photos from your machine, click a panel to select it, click a photo to fill it, drag to position and zoom per panel, or fill all panels with one photo. Four sample photos ship with the app.
- **Editable caption** — big gradient display title (default "SUNSET KEYS"), script subtitle, tagline strip, star-burst badge and heat stars, all editable.
- **One-click PNG export** — exact post sizes 1920×1080, 1080×1080 and 1080×1350.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Pick a layout and grade, load or click a sample photo, edit the caption, hit **Export PNG**.

## Originality

Everything is original: no Rockstar Games logo, wordmark, artwork, character or font. Display type is Anton, script is Caveat, UI is Archivo — all under the SIL Open Font License, shipped as files under `app/fonts/` with the licence text. Sample photos are AI-made (the kit's two starter samples plus two generated for this entry) — no real people, no GTA artwork.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, stdlib only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

## License

MIT — see [LICENSE](LICENSE).
