# Jun516 · Open Source Observatory

An independent, static, interactive companion to the existing [GitHub profile](https://github.com/Jun516). It preserves the original README's bilingual toggle, profile graphics, Metrics output, and upstream contributions list.

## Capabilities

1. **PR intelligence** — Open/Merged/Closed-unmerged counts, title/repository/number search, project-focus, repository, status and 90-day/year filters, sorting, and removable filter tokens. Repository charts retain other repositories for comparison; the month chart retains other months.
2. **Contribution calendar** — 7/30/90/365 day view, hover/focus tooltips, native GitHub GraphQL contribution counts. Selecting a day or month filters PR current-state events in UTC, and selecting it again clears the date filter. Calendar totals include other activity, so a day can have contributions but no matching PR events.
3. **Project constellation** — interactive SVG repository nodes, keyboard navigation, filtering across panels.
4. **Contribution timeline** — Each PR's current-state event timestamp and links to upstream activity; this is not a full lifecycle history.
5. **Selected engineering cases** — Four bilingual records link problems, changes, and reported verification to original upstream PRs. Validation text attributes historical evidence to the PR, rather than claiming those suites were rerun for this site. Case topics are independently curated; project-focus filters use an explicit repository taxonomy, not an inference about each PR or skill level. Case status comes from the snapshot, with a live-link fallback.
6. **Light particles** — Bounded canvas rendering at ~30fps, reduced-motion support, fewer particles on mobile, a persistent motion toggle, and no animation loop while the hero is offscreen or the tab is hidden.

The dashboard also includes bilingual UI, a theme toggle, responsive layout, keyboard-focus states, and explicit data freshness. SVG/Canvas visualizations are implemented without third-party runtime packages for repeatable builds and small download size. No GitHub token is delivered to the browser.

## Data and limitations

- `scripts/build_dashboard_data.py` runs in GitHub Actions and uses the built-in `GITHUB_TOKEN` to search **global upstream PRs** for `author:Jun516 is:pr`, separately by `is:open`, `is:merged`, and `is:closed is:unmerged`. It aborts on incomplete search, pagination limits, or API failure.
- Uses GitHub GraphQL `contributionsCollection.contributionCalendar` for the public activity heatmap. GraphQL results follow GitHub's visibility rules. The calendar counts all recorded GitHub contributions for the day, not merely PRs.
- The PR timeline represents each PR's **current state event date** (opened, merged, or closed), not a complete historical event stream with every review and commit.
- The data is a scheduled snapshot, not real-time. GitHub Pages rebuilds daily and on relevant pushes/manual dispatch. The built-in placeholder JSON **never shows invented metrics**.
- GitHub PR search is capped at 1,000 results per individual state query; the generator fails rather than silently truncating if the limit is reached.

## Deploy

1. In `Jun516/Jun516` → **Settings → Pages**, choose **GitHub Actions** as the build-and-deployment source (this is a manual repository setting).
2. Open **Actions → Deploy interactive dashboard → Run workflow** on `main`. The workflow runs Python and Node tests, generates the snapshot, then deploys the static `dashboard/` folder.
3. Verify the final URL returned in the deploy job; for the `Jun516/Jun516` project site it is ordinarily `https://jun516.github.io/Jun516/`.
4. If the GraphQL API fails or Pages approval is required, inspect the failing job. Do not insert mock metrics to mask a failed deployment.

## Run locally

```bash
python -m unittest discover -s tests -p 'test_dashboard_data.py' -v
node --test tests/test_model.mjs
GITHUB_TOKEN=YOUR_TOKEN python scripts/build_dashboard_data.py
python -m http.server 8080 -d dashboard
```

Then visit `http://localhost:8080`. This only requires Python 3 and Node 22 for tests; the static UI itself requires no packages. Never commit a personal access token.
