#!/usr/bin/env python3
"""Render a GitHub-contributions activity overview using the account's own GraphQL data."""
import html
import json
import os
import urllib.request
from pathlib import Path

USER = "Jun516"
DESTINATION = Path("assets/metrics/contribution-overview.svg")
QUERY = """
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalPullRequestReviewContributions
    }
  }
}
"""

def main():
    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        raise RuntimeError("GITHUB_TOKEN is required")
    request = urllib.request.Request(
        "https://api.github.com/graphql",
        data=json.dumps({"query": QUERY, "variables": {"login": USER}}).encode("utf-8"),
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
            "User-Agent": "Jun516-github-profile-overview",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        result = json.load(response)
    if result.get("errors"):
        raise RuntimeError("GitHub GraphQL error: " + str(result["errors"])[:400])
    collection = result["data"]["user"]["contributionsCollection"]
    names = [
        ("Commits", "totalCommitContributions"),
        ("Pull requests", "totalPullRequestContributions"),
        ("Issues", "totalIssueContributions"),
        ("Code reviews", "totalPullRequestReviewContributions"),
    ]
    values = [int(collection[key]) for _, key in names]
    if any(value < 0 for value in values):
        raise ValueError("Negative contribution count")
    total = sum(values)
    shares = [value / total if total else 0 for value in values]
    # Four cardinal axes: code reviews (top), issues (right),
    # pull requests (bottom), commits (left).
    radius = 99
    cx, cy = 523, 193
    axes = [
        (cx - radius * shares[0], cy),
        (cx, cy + radius * shares[1]),
        (cx + radius * shares[2], cy),
        (cx, cy - radius * shares[3]),
    ]
    polygon = " ".join(f"{x:.1f},{y:.1f}" for x, y in axes)
    labels = [
        ("Commits", values[0], shares[0], 347, 205, "end"),
        ("Pull requests", values[1], shares[1], 523, 342, "middle"),
        ("Issues", values[2], shares[2], 700, 205, "start"),
        ("Code reviews", values[3], shares[3], 523, 65, "middle"),
    ]
    label_svg = "\n".join(
        f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-size="14" fill="#59636E">'
        f'{html.escape(name)} {round(share * 100)}% ({value})</text>'
        for name, value, share, x, y, anchor in labels
    )
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="760" height="370"
         viewBox="0 0 760 370" role="img"
         aria-label="GitHub contribution types for {USER} over the past year">
 <rect x="1" y="1" width="758" height="368" rx="13" fill="#FFFFFF" stroke="#D0D7DE"/>
 <text x="27" y="45" font-size="22" font-weight="600"
       font-family="Arial, sans-serif" fill="#24292F">Contribution activity</text>
 <text x="27" y="73" font-size="14" font-family="Arial, sans-serif"
       fill="#59636E">Last year · GitHub contributionsCollection</text>
 <text x="27" y="164" font-size="44" font-weight="700"
       font-family="Arial, sans-serif" fill="#1F883D">{total}</text>
 <text x="27" y="186" font-size="14" font-family="Arial, sans-serif"
       fill="#59636E">Recorded contributions by type</text>
 <text x="27" y="232" font-size="13" font-family="Arial, sans-serif"
       fill="#59636E">Commits: {values[0]}   PRs: {values[1]}</text>
 <text x="27" y="255" font-size="13" font-family="Arial, sans-serif"
       fill="#59636E">Issues: {values[2]}   Reviews: {values[3]}</text>
 <text x="27" y="325" font-size="11" font-family="Arial, sans-serif"
       fill="#8C959F">Data visibility depends on GitHub permissions.</text>
 <line x1="315" y1="193" x2="654" y2="193" stroke="#D0D7DE"/>
 <line x1="523" y1="81" x2="523" y2="305" stroke="#D0D7DE"/>
 <circle cx="523" cy="193" r="99" fill="none" stroke="#D0D7DE" stroke-dasharray="4 5"/>
 <circle cx="523" cy="193" r="49" fill="none" stroke="#EAECEF" stroke-dasharray="4 5"/>
 <polygon points="{polygon}" fill="#2DA44E" fill-opacity=".18"
          stroke="#1F883D" stroke-width="2.6" stroke-linejoin="round"/>
 {''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="#1F883D"/>' for x,y in axes)}
 {label_svg}
</svg>
"""
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    DESTINATION.write_text(svg, encoding="utf-8")
    print(f"Rendered contribution overview: {total} category events; counts={values}")

if __name__ == "__main__":
    main()
