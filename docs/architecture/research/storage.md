# Storage: where files live in the one folder

Date read for all prices and limits: 2026-10-04. Sprint S4, task P19.

The owner decided these points. This note works inside them.

- One person, one folder, one instance.
- The folder lives on one VPS.
- Specs (YAML) and blueprints (markdown) are tracked in git.
- The append-only SQLite event log sits in the same folder.
- Git and SQLite are both backed up.
- Keeping files on the owner's PC is not an option.

## Functions in this layer

Today the storage layer is split across places. This is the starting point, from the P14 inventory.

| Function | Where it lives today |
|---|---|
| Event file `events.jsonl` written by laptop jobs | A private folder on the owner's PC. Not on GitHub. The dev server in `vite.config.ts` reads it from disk by path. |
| Blueprint files `blueprints/*.toml` | In git, in the MERO repo. |
| Model tier list `models.toml` | In git, in the MERO repo. |
| Bench results `bench/results/*.jsonl` | In git, in the MERO repo. |
| SQLite ledger (default `~/.mero/ledger.db`) | A local file on the PC. Its backup is P18, out of scope. |
| Static assets in `public/` | In git, in the valley repo. Vercel serves them. |
| Browser save of the valley | `localStorage` in the browser. Not part of this folder. |

The target layer must do these jobs inside one folder on the VPS.

1. Hold specs and blueprints, with history.
2. Hold the append-only SQLite event log, with one writer.
3. Hold run results and assets.
4. Let the API read every file kind.
5. Let the laptop worker send in its work without a shared disk.
6. Push the tracked files to a git remote as a backup.

Out of scope: the ledger database and its backup method (P18), file formats (P21), building the backup jobs, hosting (P15), API (P16) and workers (P17).

## Options

All three options use one folder, `/srv/mero/`, on the VPS. The folder is a git working tree in A and C. In B the folder is a plain parent of one git repo. Each option holds the specs, the blueprints and the SQLite event log in this one folder.

### Option A: one repo, data folder ignored

```
/srv/mero/            (one git repo)
  specs/
  blueprints/
  results/
  assets/
  data/               (git ignores this)
  config/
```

Remote: a private GitHub repository.

### Option B: plain parent, content repo inside

```
/srv/mero/            (not a repo)
  content/            (the git repo)
    specs/
    blueprints/
    results/
    assets/
    config/
  data/               (outside the repo, never tracked)
  backups/            (outside the repo)
```

Remote: a private GitHub repository, for `content/` only.

### Option C: one repo on a different remote, results ignored

```
/srv/mero/            (one git repo)
  specs/
  blueprints/
  assets/
  runs/               (git ignores this: results and event log)
  config/
```

Remote: a private GitLab.com project.

### Comparison

Cost is the monthly USD cost of the git remote at one person's use. The VPS is common to all three and is priced in P15.

| Option | Git remote | Remote cost per month | Solo maintainer | Low ops | Cheap to run | Swappable parts | Fits Python backend and JS frontend |
|---|---|---|---|---|---|---|---|
| A: one repo, `data/` ignored | Private GitHub repo | $0 ([GitHub pricing](https://github.com/pricing): Free plan, $0, private repos included; read 2026-10-04) | Strong. One repo, one `git push`, one place to look. | Strong. One ignore file separates code from data. | Strong. $0 remote, no second service. | Medium. Content and data share a repo root, so splitting later means a move. | Strong. Python and JS both read plain paths under one root. |
| B: plain parent, `content/` repo | Private GitHub repo | $0 ([GitHub pricing](https://github.com/pricing): Free plan, $0, private repos included; read 2026-10-04) | Medium. Two levels to remember: the parent and the repo. | Strong. The repo cannot hold the database by mistake, but the parent needs its own backup. | Strong. $0 remote. | Strong. `content/` can move to any remote or host without touching `data/`. | Strong. Paths are plain, but every tool needs the `content/` prefix. |
| C: one repo, `runs/` ignored | Private GitLab.com project | $0 ([GitLab pricing](https://about.gitlab.com/pricing/): Free, $0 per user, 10 GiB per project; read 2026-10-04) | Strong. One repo. | Medium. A second account and a 5-user, 10 GiB limit to watch. | Strong. $0 remote. | Medium. Same root as A, with the remote already off GitHub. | Strong. Same as A. |

The backup remote costs $0 in every option. A second copy can also go to a free Codeberg repo ([Codeberg terms](https://codeberg.org/Codeberg/org/src/branch/main/TermsOfUse.md), read 2026-10-04: hosting is free, private repos only for small project needs). That copy is optional and not priced above.

## Pick

**Option A: one git repo at `/srv/mero/`, with a git-ignored `data/` folder, and a private GitHub repo as the remote.**

Git ignores these paths:

- `data/` as a whole.
- `data/ledger.db` (the SQLite event log). It is one of the ignored paths. The ledger code in MERO defaults to this name, and the path is set with `MERO_DB` or `--db`.
- `data/ledger.db-wal`, `data/ledger.db-shm` and `data/ledger.db.writer.lock` (SQLite side files and the writer lock).
- `data/backups/` (SQLite backup copies, made by P36 to P38).
- `.env` and any file with secrets.
- `config/local.*` (VPS-only settings).

Git tracks `specs/`, `blueprints/`, `results/` (bench and run results as text), `assets/` and `config/` (shared settings, such as the model tier list).

How each reader reaches each file kind:

| File kind | API on the VPS | Laptop worker |
|---|---|---|
| Specs, blueprints, config | Reads the working tree on disk. | Pulls from the git remote, or asks the API. It never mounts the VPS disk. |
| SQLite event log in `data/` | Opens it on the VPS. It is the one writer, and takes the writer lock. | Never opens it. It sends proposed events to the API over HTTPS. The API writes. |
| Results | The API reads and writes the files in `results/`. | Sends results to the API. The API writes the file. A timer job on the VPS commits and pushes `results/` with a deploy key scoped to that one repo. |
| Assets | The API serves them from `assets/`. | Pulls from git when it needs one. |

## Rejected

**Option B: plain parent with a content repo inside.** It has the cleanest split. The database can never be committed by mistake, because it is not inside any repo. It loses on the solo-maintainer and low-ops criteria. The owner has to remember two levels, and the parent folder is not under git, so its layout is not versioned. A single ignore rule in Option A gives almost the same safety with one repo. `git status` checks that rule on every change. If the ignore rule ever fails, B is the layout to move to.

**Option C: one repo on GitLab.** The layout is nearly the same as A. The only real difference is the remote. GitLab's free tier is $0 and has a 10 GiB limit per project, but it adds a second account and a user cap to track. GitHub is where the owner's other repos already live. The change brings no gain on the five criteria. It also ignores `runs/` as a whole, which hides result files that are useful to keep in history. A can move to GitLab later with one remote change, so C is not needed to keep that door open.

## Why

- Solo maintainer: one repo and one folder, with no sync between levels.
- Low ops: one `.gitignore` is the only rule that separates tracked files from the database. The VPS needs git and SQLite, and nothing else.
- Cheap to run: the remote costs $0, so the folder adds nothing to the VPS bill.
- Swappable parts: the remote is one URL in git config. SQLite is one ignored file. Either can change without touching the other.
- Fits Python and JS: both read plain files and a plain SQLite path. No special store.
- The laptop worker needs no shared disk. This is the reason the API is the only writer of the SQLite file.
- It matches today's shape: MERO already keeps blueprints and bench results in git. The only parts that move are the event log and its data, which go from the PC to `data/`.

Risk: the git remote backs up tracked files only, so the SQLite log's safety rests entirely on P18's backup. Plain-text results must hold no secrets, because the repo keeps them in history.

## Swap-out path

To move to Option B: from `/srv/mero/`, run `mkdir content && mv specs blueprints results assets config .gitignore content/ && mv .git content/`, so `git status` stays clean. Leave `data/` where it is. Change the API's base paths with one setting. The remote stays as it is.

To move to another remote (GitLab, Codeberg or a bare repo on a second machine): run `git remote set-url origin <new-url>` and push all branches and tags. Check that the new remote has the same commits (`git log -1` on both). Then delete the old remote. No file in the folder changes.

To move the event log: stop the API, then copy `data/ledger.db` with its `-wal` and `-shm` files (or use the SQLite backup command), and start the API on the new path. Stopping first keeps the single-writer rule simple. The tracked files are not touched. The backup method is P18.

To move the whole folder to a new VPS: clone the repo there, copy `data/` from the latest backup, and point the laptop worker at the new API address.

## Sources

All read 2026-10-04.

- GitHub pricing, Free plan at $0 with private repositories: https://github.com/pricing
- GitLab pricing, Free tier at $0, 10 GiB per project, 5 users per group: https://about.gitlab.com/pricing/
- Codeberg terms of use, free hosting and private repo limits: https://codeberg.org/Codeberg/org/src/branch/main/TermsOfUse.md
- P14 inventory, storage rows (starting layout), in this repo's `docs/architecture/inventory.md` on branch p14-inventory.
- Today's layout: the MERO repo at commit 20b1ab3 (`blueprints/*.toml`, `models.toml`, `bench/results/`) and `vite.config.ts` at 76b0d7d, which reads `events.jsonl` from a path on the PC.
