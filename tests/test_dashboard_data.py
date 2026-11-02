import importlib.util
import unittest
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "scripts/build_dashboard_data.py"
spec = importlib.util.spec_from_file_location("dashboard_data", p)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def item(number, repo, state):
    return {
        "html_url": f"https://github.com/{repo}/pull/{number}",
        "repository_url": f"https://api.github.com/repos/{repo}",
        "number": number,
        "title": "Check <unsafe> & \"quotes\"",
        "created_at": f"2026-10-{number:02d}T00:00:00Z",
        "updated_at": "2026-11-01T00:00:00Z",
        "closed_at": None if state == "open" else "2026-11-01T00:00:00Z",
        "pull_request": {"merged_at": "2026-11-01T00:00:00Z" if state == "merged" else None},
    }


class DashboardDataTest(unittest.TestCase):
    def test_all_three_statuses_and_upstream_repo(self):
        groups = {s: [item(i, "someorg/project", s)] for i, s in enumerate(("open", "merged", "closed"), 1)}
        prs = module.parse_prs(groups)
        self.assertEqual({p["state"] for p in prs}, {"open", "merged", "closed"})
        self.assertEqual(len(prs), 3)
        self.assertEqual(prs[0]["repo"], "someorg/project")
        self.assertIsNotNone(next(p for p in prs if p["state"] == "merged")["mergedAt"])

    def test_overlapping_status_rejected(self):
        x = item(1, "org/project", "open")
        with self.assertRaises(module.ApiError):
            module.parse_prs({"open": [x], "merged": [x]})

    def test_graphql_parsing(self):
        d = {"data": {"user": {"contributionsCollection": {
            "totalCommitContributions": 3,
            "totalPullRequestContributions": 2,
            "totalIssueContributions": 1,
            "totalPullRequestReviewContributions": 0,
            "contributionCalendar": {"weeks": [{"contributionDays": [
                {"date": "2026-11-01", "contributionCount": 3}
            ]}]}
        }}}}
        days, totals = module.calendar_from_graphql(d)
        self.assertEqual(days, [{"date": "2026-11-01", "count": 3}])
        self.assertEqual(totals["pullRequests"], 2)

    def test_no_fake_calendar_on_errors(self):
        with self.assertRaises(module.ApiError):
            module.calendar_from_graphql({"errors": [{"message": "not authorized"}]})


if __name__ == "__main__":
    unittest.main()
