# How we work

Rules for every agent in this repo. Same file in every repo.
Owner: Andres. Board: Linear workspace `peri-doto`, team PER.

## Start

- No issue, no work. Start only from a PER issue.
- Only issues in **Todo**. Backlog is not released.
- Move the issue to **In Progress** when you start.
- Read the issue's **Done when** first. That is the contract.
- Before filing a new issue, search for duplicates.

## Limits

- Max 2 agents working at once. Max 1 per repo.
- One issue = one agent = one branch = one PR.
- Time box: 45 minutes per issue. Then stop and report.
- Stay inside Done when. New ideas become a Backlog issue, not code.

## Stop and ask

- Stuck, or a decision is needed? Stop.
- Comment on the issue: what you tried, one question.
- Add the `needs-you` label. Do not guess.
- Always ask before touching: money, secrets, data schema, deletes.

## Branch, commit, PR

- Branch name starts with the issue ID: `PER-12-short-name`.
- Commit under your own agent name. Never as the owner.
- Never weaken or delete a test to pass.
- Open the PR yourself. PR title starts with the issue ID.
- PR body follows `.github/pull_request_template.md`: PER ID, `## Summary`, `## Evidence`,
  `## Merge Danger` with `**Door:**`, `**Blast radius:**` and `**Needs your decision:**`.
  The `PR format` check fails anything else. Full guide: the `pr` skill in ammtz/skills.
- Comment the PR link on the issue.

## Review and merge

- Only Nightcrawler merges. Nightly, about 1:50am ET.
- It merges small PRs that pass every check.
- It sends money, secrets, budgets, schema work to Andres.
- Done means merged with checks green. Not "pushed".

## Style

- Ponytail: smallest change that fully solves the issue.
- Short words. No filler in code, comments, or PRs.
