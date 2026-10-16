#!/usr/bin/env python3
"""Update the profile README from public merged GitHub PRs (stdlib only)."""
import hashlib
import html
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

BASE = "https://api.github.com"
START = "<!-- CONTRIBUTIONS:START -->"
END = "<!-- CONTRIBUTIONS:END -->"
README = Path("README.md")

def api_get(path):
    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        raise RuntimeError("GITHUB_TOKEN is missing")
    url = path if path.startswith("https://") else BASE + path
    request = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "jun516-contribution-leaderboard",
    })
    try:
        with urllib.request.urlopen(request, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        details = e.read(300).decode("utf-8", "replace")
        raise RuntimeError(f"GitHub API HTTP {e.code}: {details}") from e

def count_merged_prs(username):
    counts = Counter()
    first_total = 0
    query = "is:pr is:merged author:" + username
    for page in range(1, 11):
        params = urllib.parse.urlencode({"q": query, "per_page": 100, "page": page,
                                         "sort": "updated", "order": "desc"})
        data = api_get("/search/issues?" + params)
        if data.get("incomplete_results"):
            raise RuntimeError("GitHub returned incomplete search results; keep old README")
        if page == 1:
            first_total = int(data.get("total_count", 0))
        items = data.get("items", [])
        for item in items:
            if "pull_request" not in item:
                continue
            m = re.fullmatch(r"https://api\.github\.com/repos/([^/]+/[^/]+)",
                             item.get("repository_url", ""))
            if m:
                counts[m.group(1)] += 1
        if len(items) < 100 or page * 100 >= min(first_total, 1000):
            break
    return counts, first_total

LANG_COLORS = {
    "Python": "3776AB", "TypeScript": "3178C6", "JavaScript": "D4B500",
    "Go": "00ADD8", "Rust": "A45024", "Java": "B07219",
    "C++": "00599C", "C#": "239120", "Shell": "64748B",
    "HTML": "E34F26",
}

def escape(value):
    return html.escape(str(value or "")).replace("|", "&#124;").replace("\n", " ").replace("\r", " ")

def stars_text(value):
    return f"{value / 1000:.1f}k" if value >= 1000 else str(value)

def lang_badge(language):
    if not language:
        return "—"
    color = LANG_COLORS.get(language, "607D8B")
    safe = urllib.parse.quote(language.replace("-", "--"), safe="")
    return f'<img alt="{escape(language)}" src="https://img.shields.io/badge/{safe}-{color}" />'

def _unique_repo_icon(full):
    """Stable per-repository fallback, used only for repeated organization logos."""
    digest = hashlib.sha256(full.encode("utf-8")).digest()
    accent = "#%02X%02X%02X" % tuple(65 + (x % 145) for x in digest[:3])
    shade = "#%02X%02X%02X" % tuple(50 + (x % 125) for x in digest[3:6])
    repo = full.split("/", 1)[1]
    initials = "".join(c for c in repo if c.isalnum())[:2].upper() or "GH"
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">\n'
        f'  <title>{html.escape(full, quote=True)}</title>\n'
        '  <rect width="64" height="64" rx="14" fill="#172334"/>\n'
        f'  <path d="M0 44 L64 16 L64 64 L0 64 Z" fill="{shade}" opacity=".85"/>\n'
        f'  <rect x="6" y="6" width="52" height="52" rx="11" fill="{accent}" opacity=".28"/>\n'
        f'  <text x="32" y="40" fill="#FFFFFF" text-anchor="middle" font-family="Arial, sans-serif" font-size="23" font-weight="700">{html.escape(initials)}</text>\n'
        f'  <rect x="{9 + digest[6] % 35}" y="52" width="{6 + digest[7] % 12}" height="4" rx="2" fill="#FFFFFF" opacity=".75"/>\n'
        "</svg>\n"
    )
    path = Path("assets/repo-icons") / (full.replace("/", "__") + ".svg")
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.read_text(encoding="utf-8") != svg:
        path.write_text(svg, encoding="utf-8")
    return "https://raw.githubusercontent.com/Jun516/Jun516/main/" + urllib.parse.quote(path.as_posix(), safe="/")


def _stats_panel(repo, kind, theme):
    """Generate compact theme-aware SVG stat panels, with each half linkable."""
    full = repo["full"]
    slug = full.replace("/", "__")
    width = 154 if kind == "stars" else 170
    label = "Stars" if kind == "stars" else "Merged PRs"
    number = stars_text(repo["stars"]) if kind == "stars" else str(repo["merged"])
    if theme == "dark":
        background, border, foreground, muted = "#232735", "#45475D", "#F4F5F9", "#B1B5C8"
    else:
        background, border, foreground, muted = "#F8F8FD", "#DCDDED", "#20253A", "#6A7087"
    if kind == "stars":
        icon = '  <path d="M16 9.5 19.1 15.7 25.9 16.7 21 21.5 22.2 28.3 16 25.1 9.8 28.3 11 21.5 6.1 16.7 12.9 15.7Z" fill="#F5B424"/>'
    else:
        icon = '  <path d="M11 12v17m0-9h11m0 0v-5m0 5v10" fill="none" stroke="#23A065" stroke-width="2.4" stroke-linecap="round"/><circle cx="11" cy="12" r="3.2" fill="#23A065"/><circle cx="22" cy="15" r="3.2" fill="#23A065"/><circle cx="22" cy="30" r="3.2" fill="#23A065"/>'
    svg = "\n".join([
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="56" viewBox="0 0 {width} 56" role="img">',
        f'  <title>{html.escape(full)} {label}: {html.escape(number)}</title>',
        f'  <rect x=".5" y=".5" width="{width-1}" height="55" rx="9" fill="{background}" stroke="{border}"/>',
        icon,
        f'  <text x="36" y="21" font-family="Arial, sans-serif" font-size="12" fill="{muted}">{label}</text>',
        f'  <text x="36" y="42" font-family="Arial, sans-serif" font-weight="700" font-size="18" fill="{foreground}">{html.escape(number)}</text>',
        "</svg>",
        "",
    ])
    asset = Path("assets/contribution-stats") / f"{slug}__{kind}__{theme}.svg"
    asset.parent.mkdir(parents=True, exist_ok=True)
    if not asset.exists() or asset.read_text(encoding="utf-8") != svg:
        asset.write_text(svg, encoding="utf-8")
    return "https://raw.githubusercontent.com/Jun516/Jun516/main/" + urllib.parse.quote(asset.as_posix(), safe="/")


def format_project(repo, seen_owners):
    """Render one full-width README row with a linked, two-part stats panel."""
    full = repo["full"]
    owner = full.split("/", 1)[0]
    if owner.lower() not in seen_owners:
        seen_owners.add(owner.lower())
        src = f"https://github.com/{urllib.parse.quote(owner, safe='')}.png?size=64"
    else:
        src = _unique_repo_icon(full)

    project_url = escape(repo["url"])
    description = repo["description"].strip()
    tagline = description[:78] + ("…" if len(description) > 78 else "")
    details = " · ".join(v for v in (escape(repo["language"]), escape(tagline)) if v)

    query = urllib.parse.urlencode({"q": "is:pr is:merged author:" + os.environ.get("GH_USERNAME", "Jun516")})
    prs = "https://github.com/" + urllib.parse.quote(full, safe="/") + "/pulls?" + query
    stars = stars_text(repo["stars"])

    def linked_picture(url, kind, width, alt):
        light = escape(_stats_panel(repo, kind, "light"))
        dark = escape(_stats_panel(repo, kind, "dark"))
        return (
            f'  <a href="{escape(url)}"><picture>'
            f'<source media="(prefers-color-scheme: dark)" srcset="{dark}">'
            f'<img align="right" src="{light}" width="{width}" height="56" alt="{escape(alt)}" />'
            f'</picture></a>'
        )

    return "\n".join([
        "<p>",
        f'  <a href="{project_url}"><img align="left" src="{escape(src)}" width="36" height="36" alt="{escape(full)} logo" /></a>',
        linked_picture(prs, "merged", 170, f'{repo["merged"]} merged PRs'),
        linked_picture(repo["url"], "stars", 154, f'{stars} stars'),
        f'  <a href="{project_url}"><strong>{escape(full)}</strong></a><br />',
        f'  <sub>{details}</sub>' if details else "  <sub>Open-source project</sub>",
        "</p>",
    ])


def generate(username, min_stars):
    counts, total = count_merged_prs(username)
    rows = []
    for full, merged in counts.items():
        try:
            d = api_get("/repos/" + urllib.parse.quote(full, safe="/"))
        except RuntimeError as exc:
            print(f"Skipping unavailable repository {full}: {exc}", file=sys.stderr)
            continue
        if d.get("private"):
            continue
        stars = int(d.get("stargazers_count", 0) or 0)
        if stars < min_stars:
            continue
        rows.append({"full": full, "merged": merged, "stars": stars,
                     "language": d.get("language") or "", "description": d.get("description") or "",
                     "url": d.get("html_url") or "https://github.com/" + full})
    rows.sort(key=lambda x: (-x["stars"], -x["merged"], x["full"].lower()))
    seen_owners = set()
    formatted_rows = [format_project(row, seen_owners) for row in rows]
    if not rows:
        result = "暂无符合条件的已合并公开 PR。"
    else:
        result = "\n\n<hr />\n\n".join(formatted_rows[:5])
        if len(rows) > 5:
            more = "\n\n<hr />\n\n".join(formatted_rows[5:])
            result += f"\n\n<details>\n<summary>展开其余 {len(rows)-5} 个项目</summary>\n\n{more}\n\n</details>"
        result += f"\n\n<sub>共 {len(rows)} 个项目 · {sum(r['merged'] for r in rows)} 个已合并公开 PR · 按 Star 排序</sub>"
    if total > 1000:
        result += "\n\n*GitHub Search 最多返回 1,000 条结果，数据可能不完整。*"
    if min_stars:
        result += f"\n\n*只显示 Star ≥ {min_stars:,} 的项目。*"
    return result

def main():
    username = os.environ.get("GH_USERNAME", "Jun516").strip()
    if not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?", username):
        raise ValueError("Invalid username")
    min_stars = int(os.environ.get("MIN_STARS", "0"))
    if min_stars < 0:
        raise ValueError("MIN_STARS cannot be negative")
    text = README.read_text(encoding="utf-8")
    if text.count(START) != 1 or text.count(END) != 1 or text.index(START) >= text.index(END):
        raise ValueError("README must have exactly one correctly ordered marker pair")
    left = text.index(START) + len(START)
    right = text.index(END)
    updated = text[:left] + "\n" + generate(username, min_stars) + "\n" + text[right:]
    if updated != text:
        README.write_text(updated, encoding="utf-8")
        print("README updated")
    else:
        print("Nothing changed")

if __name__ == "__main__":
    main()
