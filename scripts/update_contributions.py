#!/usr/bin/env python3
"""Update the profile README from public merged GitHub PRs (stdlib only)."""
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

def format_row(repo):
    full = repo["full"]
    project_url = escape(repo["url"])
    owner = urllib.parse.quote(full.split("/")[0], safe="")
    logo = f'<img src="https://github.com/{owner}.png?size=32" width="18" height="18" alt="" />'
    project = f'{logo} <a href="{project_url}"><b>{escape(full)}</b></a>'
    description = escape(repo["description"])
    if description:
        project += f"<br/><sub>{description[:160]}</sub>"
    query = urllib.parse.urlencode({"q": "is:pr is:merged author:" + os.environ.get("GH_USERNAME", "Jun516")})
    prs = "https://github.com/" + urllib.parse.quote(full, safe="/") + "/pulls?" + query
    return (f'| {project} | {stars_text(repo["stars"])} | '
            f'{lang_badge(repo["language"])} | [{repo["merged"]}]({prs}) |')

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
    table_header = ["| Project | ★ Stars | Language | Merged |", "|:---|---:|:---:|---:|"]
    if not rows:
        result = "暂无符合条件的已合并公开 PR。"
    else:
        result = "\n".join(table_header + [format_row(r) for r in rows[:5]])
        if len(rows) > 5:
            more = "\n".join(table_header + [format_row(r) for r in rows[5:]])
            result += f"\n\n<details>\n<summary>展开其余 {len(rows)-5} 个项目</summary>\n\n{more}\n\n</details>"
        result += f"\n\n*共 {len(rows)} 个项目，{sum(r['merged'] for r in rows)} 个已合并公开 PR；按 Star 排序。*"
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
