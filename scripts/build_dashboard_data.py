#!/usr/bin/env python3
"""Generate a public-only dashboard snapshot from GitHub APIs.

Requires GITHUB_TOKEN. The token is used at build time and never emitted in artifacts.
Fetches all author PRs across upstream repos, including closed-unmerged PRs.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

USER = "Jun516"
ENDPOINT = "https://api.github.com"
OUT = Path(__file__).resolve().parents[1] / "dashboard/data/github.json"
STATES = {"open": "is:open", "merged": "is:merged", "closed": "is:closed is:unmerged"}


class ApiError(RuntimeError):
    pass


def gh_request(url: str, token: str, payload: dict | None = None) -> dict:
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "User-Agent": "Jun516-public-dashboard-builder",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers, method="POST" if data else "GET")
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=35) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            # Auth / permissions errors must fail explicitly; don't publish empty stats.
            if exc.code not in (502, 503, 504) or attempt == 2:
                raise ApiError(f"GitHub API returned HTTP {exc.code} for {url.split('?')[0]}") from exc
            time.sleep(2 ** attempt)
        except (TimeoutError, urllib.error.URLError) as exc:
            if attempt == 2:
                raise ApiError(f"GitHub request failed: {url.split('?')[0]}") from exc
            time.sleep(2 ** attempt)
    raise AssertionError("unreachable")


def search_all(token: str, qualifier: str) -> list[dict]:
    """Issue search is global; split by state for reliable merged classification."""
    query = f"author:{USER} is:pr {qualifier}"
    found: list[dict] = []
    page = 1
    while True:
        url = ENDPOINT + "/search/issues?" + urllib.parse.urlencode({
            "q": query, "sort": "created", "order": "desc", "per_page": 100, "page": page
        })
        response = gh_request(url, token)
        if response.get("incomplete_results"):
            raise ApiError(f"Incomplete GitHub search for {query}")
        if int(response.get("total_count", 0)) > 1000:
            raise ApiError(f"Search exceeds GitHub's 1000 result cap: {query}")
        batch = response.get("items", [])
        if not isinstance(batch, list):
            raise ApiError("Malformed GitHub search response")
        found.extend(batch)
        if len(batch) < 100:
            if len(found) != int(response.get("total_count", 0)):
                raise ApiError(f"Incomplete pagination for {query}: {len(found)} results")
            return found
        page += 1
        if page > 10:
            raise ApiError("Exceeded search pagination limit")


def parse_prs(groups: dict[str, list[dict]]) -> list[dict]:
    prs = {}
    for state, items in groups.items():
        for item in items:
            # issue search exposes pull_request + repository_url for upstream PRs.
            url = item.get("html_url", "")
            repo_api = item.get("repository_url", "")
            repo = repo_api.split("/repos/", 1)[-1]
            if (not url.startswith("https://github.com/") or
                    "/pull/" not in url or "/" not in repo or
                    not isinstance(item.get("number"), int)):
                raise ApiError(f"Invalid PR search item {url!r}")
            if url in prs and prs[url]["state"] != state:
                raise ApiError(f"Overlapping PR states for {url}")
            prs[url] = {
                "repo": repo,
                "number": item["number"],
                "title": str(item.get("title", ""))[:300],
                "url": url,
                "state": state,
                "createdAt": item.get("created_at"),
                "updatedAt": item.get("updated_at"),
                "closedAt": item.get("closed_at"),
                "mergedAt": item.get("pull_request", {}).get("merged_at") if state == "merged" else None,
            }
    return sorted(prs.values(), key=lambda p: p["createdAt"] or "", reverse=True)


def calendar_from_graphql(result: dict) -> tuple[list[dict], dict]:
    if result.get("errors"):
        raise ApiError("GraphQL returned errors: " + str(result["errors"])[:400])
    try:
        collection = result["data"]["user"]["contributionsCollection"]
        weeks = collection["contributionCalendar"]["weeks"]
        days = [
            {"date": day["date"], "count": int(day["contributionCount"])}
            for week in weeks for day in week["contributionDays"]
        ]
        counts = {
            "commits": collection["totalCommitContributions"],
            "pullRequests": collection["totalPullRequestContributions"],
            "issues": collection["totalIssueContributions"],
            "reviews": collection["totalPullRequestReviewContributions"],
        }
    except (KeyError, TypeError, ValueError) as exc:
        raise ApiError("Malformed GraphQL contributions response") from exc
    if any(d["count"] < 0 for d in days) or any(v < 0 for v in counts.values()):
        raise ApiError("Negative contributions value")
    return sorted(days, key=lambda d: d["date"]), counts


def build(token: str) -> dict:
    groups = {state: search_all(token, q) for state, q in STATES.items()}
    prs = parse_prs(groups)
    query = """query($login:String!) {
      user(login:$login) {
        contributionsCollection {
          totalCommitContributions totalPullRequestContributions
          totalIssueContributions totalPullRequestReviewContributions
          contributionCalendar { weeks { contributionDays { date contributionCount } } }
        }
      }
    }"""
    days, counts = calendar_from_graphql(gh_request(ENDPOINT + "/graphql", token, {
        "query": query, "variables": {"login": USER}
    }))
    repos = {}
    for pr in prs:
        item = repos.setdefault(pr["repo"], {"name": pr["repo"], "open": 0, "merged": 0, "closed": 0})
        item[pr["state"]] += 1
    return {
        "schemaVersion": 1,
        "user": USER,
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "source": "GitHub REST search/issues (author PRs by state) + GraphQL contributionsCollection",
        "prs": prs,
        "repos": sorted(repos.values(), key=lambda r: (-r["merged"], -sum(r[k] for k in STATES), r["name"])),
        "calendar": days,
        "contributions": counts,
    }


def main() -> int:
    token = os.getenv("GITHUB_TOKEN", "")
    if not token:
        print("GITHUB_TOKEN is required. Refusing to generate invented data.", file=sys.stderr)
        return 2
    try:
        data = build(token)
    except (ApiError, KeyError) as exc:
        print(f"Data generation failed; existing data left intact: {exc}", file=sys.stderr)
        return 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    # Write only after every API request succeeds.
    tmp = OUT.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(OUT)
    counts = {state: sum(p["state"] == state for p in data["prs"]) for state in STATES}
    print(f"Generated {len(data['prs'])} authored PRs, {len(data['calendar'])} contribution days: {counts}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
