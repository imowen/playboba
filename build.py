#!/usr/bin/env python3
"""PlayBoba static site generator.

Reads games.json + templates/, renders everything into dist/.
Adding a game later = one entry in games.json + one JS file in
static/js/games/, then re-run this script.

Usage:  python3 build.py
Preview: cd dist && python3 -m http.server 8000
"""
import json
import shutil
from datetime import date
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"


def main():
    data = json.loads((ROOT / "games.json").read_text(encoding="utf-8"))
    site = data["site"]
    categories = data["categories"]
    games = data["games"]
    pages = data["pages"]
    category_names = {c["slug"]: c["name"] for c in categories}
    games_by_cat = {c["slug"]: [g for g in games if g["category"] == c["slug"]] for c in categories}

    env = Environment(loader=FileSystemLoader(str(ROOT / "templates")), autoescape=True)
    ctx = {"site": site, "categories": categories, "games": games,
           "category_names": category_names}

    # page body_html is data (not re-rendered by Jinja), so rewrite its
    # absolute links with base_path here. Set base_path to "" when the
    # site moves to a custom domain at the root.
    bp = site.get("base_path", "")
    for p in pages:
        p["body_html"] = p["body_html"].replace('href="/', f'href="{bp}/')

    # fresh dist (keep it out of git via .gitignore)
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    def write(rel, content):
        p = DIST / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")
        print("  wrote", rel)

    print("building PlayBoba ->", DIST)
    write("index.html", env.get_template("index.html").render(**ctx))

    for g in games:
        write(f"game/{g['slug']}/index.html",
              env.get_template("game.html").render(**ctx, game=g))
    for c in categories:
        cat_ctx = dict(ctx, category=c, games=games_by_cat[c["slug"]])
        write(f"category/{c['slug']}/index.html",
              env.get_template("category.html").render(**cat_ctx))
    for p in pages:
        write(f"{p['slug']}/index.html",
              env.get_template("page.html").render(**ctx, page=p))

    # sitemap.xml
    urls = ["", "about/", "contact/", "privacy-policy/", "terms-of-service/"]
    urls += [f"category/{c['slug']}/" for c in categories]
    urls += [f"game/{g['slug']}/" for g in games]
    today = date.today().isoformat()
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sm.append(f"  <url><loc>https://{site['domain']}/{u}</loc>"
                  f"<lastmod>{today}</lastmod><changefreq>weekly</changefreq></url>")
    sm.append("</urlset>")
    write("sitemap.xml", "\n".join(sm))

    # robots.txt
    write("robots.txt",
          f"User-agent: *\nAllow: /\n\nSitemap: https://{site['domain']}/sitemap.xml\n")

    # static assets
    shutil.copytree(ROOT / "static", DIST / "static")
    print("  copied static/")

    n = sum(1 for _ in DIST.rglob("*") if _.is_file())
    print(f"done: {n} files in dist/")


if __name__ == "__main__":
    main()
