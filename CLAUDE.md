# Kara Duo reels — project memory (read this first)

This repo is a code-only motion-design studio for **Kara Duo** (كارا دو), a Saudi beauty brand (karaduo.com, Zid store).
Every video is an HTML canvas page whose `window.seek(t)` paints frame *t*; Playwright screenshots every frame and ffmpeg
encodes it; music/SFX are synthesized in code; the voice is ElevenLabs. Six reels are done (see "Reels so far").

The owner talks in **Egyptian Arabic**; answer in Egyptian Arabic, short and clear. Voice-overs are **Saudi Najdi** dialect.

---

## 1. How the owner works (her preferences — follow them)

- She sends a product link (karaduo.com/…/products/…) and asks for a "فكرة فيديو احترافية / كريتف". She wants it to impress her manager.
- **Every reel must include**: the product's real uses, its shades/درجات (if any), and **how to order from the website** (طريقة الطلب).
- **Different look per reel**: different opening, different ending, different visual idea. Do not repeat the pixel-game style unless asked.
- **Ending**: the voice says **«كارا دو… صُنع ليعتني بجمالك»** (Kara Duo said BEFORE the slogan); the logo lands on the words "كارا دو".
  The slogan sits **centred** (e.g. inside the circle/under the logo). CTA button: «اطلبيها من karaduo.com» + small path text (e.g. «البكجات ← …»).
- **Voice louder than music**; music ducks under voice. No whispering voice (she rejected a whispered opening).
- **Product images must look clear and real** — real store photos, never redrawn, never pixelated (she rejected "3D pixel" products).
- **Backgrounds in brand colours** (lavender / mauve / Kara pink), "أحلى" — not plain white, not black.
- **Reviews**: when a product has written reviews on the store, show them — she liked them **raining down like rain** (many cards). Real text only, no names, drop negatives/English, strip emojis.
- **Avatar**: one fixed expression per scene, never swap mouth images while talking (looked like a glitch). Not in the final lockup.
  Current avatar = black abaya sheet `reels/03-makeup-bag/assets/avatar_sheet.png` (cut files in `reels/03-makeup-bag/assets/avatar/`).
  Older avatar (brown hijab) is in `reels/01-palette-quest/assets/avatar/`. Editorial/luxury reels may skip the avatar.
- Flow she accepts: research the product page → propose idea + Najdi script in a table (Arabic) → she says تمام → generate VO → build → review → send.
  For small edit requests just do them and resend.
- After each delivery: send the mp4 with `SendUserFile`, commit + push, summarize in Egyptian Arabic (what changed, credits used).

## 2. Brand rules (full notes: `docs/kara-duo-brand.md`)

- Colours: ivory `#FAF7F8`, lavender `#D0B9D9` (+ `#E7DAEC`, `#F3ECF6`, `#A98BB5`), mauve `#654A70` (dark `#4F3859`, ink `#2B1C33`), Kara pink `#DD4E94` (`#E98ABC`, `#F8D7E8`).
- Fonts (local in each reel's `fonts/`): Cairo (Arabic display), Tajawal (Arabic text), Montserrat (Latin, spaced eyebrows), Playfair Display (elegant numerals/italics), Allura (signature), Press Start 2P (pixel reels only).
- Logo: `reels/*/assets/logo.webp` (transparent). Recolour with a `tint()` helper; never retype it. Logo must appear within the first 2 seconds.
- Khuzama flower (4 petals) + 4-point sparkle are the brand motifs. Arabic is RTL; Arabic-Indic digits in Arabic text (Latin digits are fine in times like 6:00PM — Arabic digits flipped order inside RTL).
- **No price / discount talk** in videos; mask prices on store screenshots (white rectangles). No ratings claims when the product has 0 reviews.
- Safe area for reels: keep key text out of the top ~250px and bottom ~340px of 1080×1920.

## 3. Environment & accounts

- Cloud environment **"Ccmoreel"** (personal) allows: karaduo.com, www.karaduo.com, fonts.googleapis.com, fonts.gstatic.com, static.zid.store, media.zid.store, img.zid.store, elevenlabsusercontent.com, kara-duo-play-and-win.lovable.app.
  Instagram / Google Drive are NOT reachable — ask her to upload files instead.
- Node-side `fetch`/`request` cannot resolve some hosts; **download images through the Playwright browser** (page.goto(imageUrl) → response.body(), or capture `response` events). Scripts in `tools/pipeline/` do this.
- Chromium + Playwright preinstalled: `require('playwright')` (ESM: `createRequire(import.meta.url)('playwright')`). ffmpeg, Python3 + PIL + numpy available (no scipy).
- Branch: `claude/new-session-70ngxz` (older work was on `claude/confident-davinci-kzhwfx`). Commit + push after each reel. `.gitignore` excludes big intermediates (silent.mp4, wav, overlays).

### ElevenLabs (MCP tools `mcp__ElevenLabs__*`, load with ToolSearch)
- Voice: **Nouf – Saudi Commercial & Documentary**, `voice_id = VjxKp6w1MCufETfW5zFM`, model `eleven_v4` (supports tags like `[warm]`, `[excited]`, `[elegant, slow]`). Avoid `[whispering]`.
- Pattern: `creative_create_flow` → `creative_generate_speech` (2 takes, ~6 credits/second of audio) → poll `creative_get_flow_run_status` → `curl` the `content_url` into `reels/NN/audio/`.
- Word timings: `creative_add_flow_asset_node(generation_id)` → `creative_transcribe_audio` (scribe, free) → per-word start/end. Also run `ffmpeg silencedetect` to find real pauses (transcript can be off by ~0.2 s).
- For a single new line (fix), generate just that line and splice it in via the VO segment list.
- Lip-sync (OmniHuman ~26k credits, MiniMax ~8–13k) was offered but she chose fixed expressions instead.

## 4. The pipeline (step by step)

1. **Research the product page** with Playwright (`tools/pipeline/prod.js`-style): name, description, features (المميزات), usage (طريقة الاستخدام), shades (الدرجه …), reviews (`rev3.js`), breadcrumb/category.
   Facts in the video must come from the page — never invent claims.
2. **Images**: `dlprod.js URL OUT` saves every product image the page loads; per-shade images come from the "الدرجه <NAME>" rows (`shades2.js` gets URLs, `dlurls.js` downloads). Full-size main photo = page `og:image` (`ba_og.js`).
   - Dark backgrounds → cut out white background: `python3 -I tools/pipeline/cutout.py SRC OUT ids…` (flood fill from edges; pale products lose edges).
   - Light backgrounds → keep the white and draw with `globalCompositeOperation='multiply'`: `whitecrop.py OUT key=path…` (tight crop + whites pushed to 255). On coloured stages put a soft white radial "spotlight"/moon disc behind the product.
   - `sheet.py DIR OUT.png` makes a contact sheet to look at images.
3. **Ordering screens** (طريقة الطلب): phone 430×932 @2x screenshots of the real path — home → category (البكجات / الوجه …) → product → (shade picker) → إضافة للسلة. Examples: `orderba.js`, `orderspray.js`, `picker.js`. Mask prices with PIL rectangles. Animate taps (pink ring) on the real button coordinates (CSS px × 2 × scale). Toast «أُضيفت للسلة ✓», delivery chip «الرياض خلال يومين · الخليج خلال ٥ أيام» (from the product page shipping line).
   Reused VO line: `reels/03-makeup-bag/audio/vo_order.mp3` = «تطلبينها من كارا دو دوت كوم… من البكجات، أضيفيها للسلة… وتوصلك لين بابك!» (only for products under البكجات).
4. **Script** (Najdi), ~30–38 s, scene table with timing. Generate VO, get word times, write the segment list `[src_start, src_end, dst_start, file]` leaving breathing gaps between lines.
5. **Build** `reels/NN-name/index.html`: one canvas 1080×1920, `window.seek(t)` pure function of t (seeded rng, closed-form springs, no timers), `window.__ready` after images + fonts load. Scenes = `[start, end, fn]` list + transitions (veil/flash/wipe).
6. **Audio**: `node audio/build.mjs` → `out/mix.wav` (VO placed by segments, synthesized music + SFX, sidechain duck, loudnorm −14 LUFS). Pixel reels use the timeline.json version (from reel 01–03), editorial reels use the reel 05/06 version (VO list with file per segment).
7. **Review loop** (always ≥2 rounds): `node render.mjs --stills 0.5,2.1,…` → `out/contact.png`; look at it; fix overlaps, cut-off text, unreadable labels, mistimed reveals. Fix, re-check only the affected frames.
8. **Render**: `node render.mjs --fps 30` → `out/silent.mp4`, then
   `ffmpeg -y -i out/silent.mp4 -i out/mix.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/final.mp4`.
   (`render.mjs` also takes `--page other.html --to 38.4 --out out/x.mp4`.) Check loudness with `ffmpeg -af ebur128`.
9. `SendUserFile` the final.mp4 (+ contact.png), commit, push, reply.

### Useful drawing patterns already written (copy from the reels)
- Pixel game kit (sprites, pixel text, panels, block wipes, wordLine, springs): `reels/03-makeup-bag/head.part` + `helpers.part`.
- Editorial luxury kit (revealText mask, product() with multiply, hairlines, light sweep, grain, brand stage with Khuzama watermark, phone mockup + touch rings): `reels/05-beauty-artist/index.html`.
- Night-sky kit (twinkling sky, nebula, deterministic stardust bursts, glowing moon discs with products, constellations over photo circles, particles converging into the logo, shimmer text): `reels/06-star-crossed/index.html`.
- Review rain (falling cards with real reviews): `reels/01-palette-quest/index.html` (`reviewRain`, `rainCard`).
- Real-app screen recording explainer (phone frame overlay, autopilot recording of a web game, EDL montage): `reels/04-play-and-win/` + `tools/pipeline/game_*.js`.

## 5. Reels so far (all 1080×1920, in `reels/`, final at `out/final.mp4`)

| # | Folder | Product | Style / idea | Notes |
|---|---|---|---|---|
| 01 | `01-palette-quest` | Smoky Rose palette ES25 | Pixel game, CRT title-screen opening, VS fight, rating counter + **review rain** | brown-hijab avatar; rating 4.99 / 455 reviews (454 five-star) |
| 02 | `02-body-glow` | Body Glow 4-shade liquid illuminator | Pixel game "treasure chest", 4 shade cards with real tube photos, review rain (labelled by product), phone lock-screen invitation opening, starry ending, how-to-order | shades: LUNAR GLOW فضي, GALAXY KISS برونزي, COSMIC SHINE ذهبي, MOON BEAM وردي |
| 03 | `03-makeup-bag` | Beauty Artist trolley bag | Pixel "makeup-artist mission": alarm opening, tetris dividers, clear-pouch inventory, walk cycle pulling the real bag, quest-log ordering, LEVEL CLEAR ending | black-abaya avatar introduced here |
| 04 | `04-play-and-win` | «العبي واربحي» web game | Real recorded gameplay in a phone frame + captions (brief from her); long 44.6 s + short 15 s ad cut | exact brief wording; no real codes/phones shown |
| 05 | `05-beauty-artist` | Complete bag 57 pieces | v2 = editorial luxury "لوك كامل" (8 makeup steps, 57 counter, features, ordering) in brand colours; `v1/` = pixel "collection" version | both have ordering + «كارا دو» before slogan |
| 06 | `06-star-crossed` | Star-Crossed Dreams shimmer spray | Night-sky film: shooting-star + stardust hook, moon hero, constellations over face/hair/body photos, day/night, 4 shade moons, ordering via الوجه + shade picker, stardust→logo ending | shades: FIRST LOVE #EDC5B6, STARRY NIGHT #F7D484, MOONDUST #E5E5E5, MIDNIGHT KISS #F8CDEE |

Shot lists for early reels: `docs/reel0*-shotlist.md`. Reference-reel analysis: `docs/reference-style.md`. Store snapshot: `docs/store.md`. Installed third-party skills: `docs/skills-sources.md` (skills in `.claude/skills/`, incl. `motion-reel`).

## 6. Gotchas learned

- Arabic-Indic digits inside RTL text can display in the wrong order → render clocks/ratios with Latin digits or force `direction='ltr'` for digit-only strings.
- `ptext`/canvas: set `direction='rtl'` only when the string has Arabic letters.
- Product photos from the store often have a faint grey box → push near-whites to white before multiply.
- Store screenshots: prices appear in several places (cards, product title area, sticky bottom bar) — check every frame you use and mask.
- Shade images: the main gallery image does NOT change when clicking a shade; use the per-shade rows at the bottom of the page.
- The bash safety check blocks `rm` on unresolved paths/globs after `cd` — write files to new folders instead of deleting.
- Long renders (>10 min) should run with `run_in_background`; a 30–37 s reel at 30 fps renders in ~1.5–3 min.
- Credits used per reel ≈ 400–900 ElevenLabs credits (2 takes of ~25–28 s VO + fixes).
