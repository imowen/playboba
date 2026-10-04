# 🧋 PlayBoba

**PlayBoba** — *Free Online Games*. A fast, free, unblocked mini-game portal that plays right in the browser. No downloads, no sign-up.

Live target: **playboba.com** (GitHub: `imowen/playboba`, deploy via Cloudflare Pages).

## Games (MVP)

| Game | Category | File |
|------|----------|------|
| 2048 | Puzzle | `static/js/games/2048.js` |
| Snake | Arcade | `static/js/games/snake.js` |
| Breakout | Arcade | `static/js/games/breakout.js` |
| Memory Match | Puzzle | `static/js/games/memory.js` |
| Tic-Tac-Toe (vs AI) | Classic | `static/js/games/tictactoe.js` |

All games are original implementations in plain HTML/CSS/JS + Canvas — no libraries, no copyrighted assets. Keyboard **and** touch controls on every game.

## Quick start

```bash
pip install -r requirements.txt   # jinja2
python3 build.py                  # renders everything into dist/
cd dist && python3 -m http.server 8000   # preview at http://localhost:8000
```

## How it works

`build.py` (Python 3 + Jinja2) reads `games.json` + `templates/` and renders a fully static site into `dist/`:

- `/` — home with game grid
- `/game/{slug}/` — game page: playable canvas + description + how-to + tips + FAQ + JSON-LD `VideoGame` schema
- `/category/{slug}/` — puzzle / arcade / classic
- `/about/`, `/contact/`, `/privacy-policy/`, `/terms-of-service/`
- `sitemap.xml`, `robots.txt`

## Adding a new game

1. Write the game as `static/js/games/mygame.js`. It must hook into the standard page chrome:
   - render into `#game-container`
   - update `#game-score` text
   - start/restart via `#game-start-btn` and `#game-restart-btn`
   - show game over via `#game-over` (remove `.hidden`) and set `#final-score`
   - support keyboard **and** touch controls
2. Add one entry to the `games` array in `games.json` (slug, title, category, emoji, description, how_to_play, controls, tips[3], faq[4], js filename, tags). Write real, original copy — 300+ words of description/how-to/tips combined — it matters for SEO and AdSense approval. If the game needs extra scripts loaded before its main file (shared logic, level data), list them in `js_extra` (e.g. Crumb Trail's `["crumb-trail-levels.js", "crumb-trail-core.js"]`).
3. Run `python3 build.py`.

That's it — the game page, category listing, sitemap, and nav all regenerate automatically.

## Crumb Trail (game 6)

Original ant color-sorting puzzle (same genre as viral "ant moving" games, 100% original assets/levels/text). Core sim lives in `static/js/games/crumb-trail-core.js` (UMD, no DOM) and is shared by the browser game and the Node solver, so solver-verified levels are guaranteed beatable in-game. Levels are ASCII-art + legend in `static/js/games/crumb-trail-levels.js`. Verify with `node scripts/solve.js` (BFS over deploy choices; exits non-zero if any level is unsolvable).

**Note on the tray rule:** the tray is an ordered queue and the player may take any of the 4 front ("glowing") boxes. A strict front-1 rule would leave zero player decisions (single forced action sequence), so the front-4 zone is the intended design — it preserves the "read the tray / don't clog the nest" tension.

Roadmap (out of scope for MVP): locks & keys, spider webs, power-ups, conveyor tray, linked boxes.

## Deploy to Cloudflare Pages

1. Push this repo to GitHub (`imowen/playboba`).
2. Cloudflare dashboard → Pages → Create project → connect the GitHub repo.
3. Build settings: framework preset **None**, build command `pip install -r requirements.txt && python3 build.py`, output directory `dist`.
4. Add custom domain `playboba.com` (and `www`) under the project's Custom domains.
5. When the site moves to a custom domain at the root, set `site.base_path` to `""` in `games.json` and rebuild. (While hosted at `imowen.github.io/playboba/`, keep it as `"/playboba"` so CSS, JS, and internal links resolve.)

## Monetization

Ad placeholders are in the templates as `div.ad-slot[data-ad-slot]` (header leaderboard 728×90, below-game 336×280, sidebar 300×250). When AdSense (or a game ad network like AdinPlay/Venatus) is approved, paste the ad code into those divs — no template changes needed.
